-- Anonymous customer sign-in (design: developent-docs/anon-customers-design.md).
--
-- Each app install signs in with supabase.auth.signInAnonymously(); a customer
-- row belongs to that account via user_id, and customers can only see and
-- change their own card. Replaces the four "own trust model" policies that let
-- any anonymous visitor read/edit/move/delete every shop's customers.
--
-- Requires "Allow anonymous sign-ins" (Authentication → Sign In / Providers).
-- App builds before 1.0.3 talk to the table without signing in and stop
-- working once this is applied.
--
-- Applied to the scratch project 2026-10-29 as migration `anon_customers`.
-- Expected security-advisor warnings afterwards, all intentional:
--  * "Signed-in users can execute SECURITY DEFINER function" for
--    contact_has_other_card and move_card: the app must call them, and each
--    checks the caller itself (move_card: staff of both cards' shop only;
--    contact_has_other_card: answers true/false only).
--  * "Anonymous access policies" on customers / staff_tenant / tenants: the
--    customer policies are meant for anonymous accounts; staff policies only
--    grant access via a staff_tenant mapping, which anonymous accounts never have.

-- 1. Link cards to the phone's account -----------------------------------
alter table public.customers
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- One card per account per shop.
create unique index if not exists customers_tenant_user_key
  on public.customers (tenant_id, user_id);

-- 2. The temporary "missing tenant → hugo" stopgap goes ----------------------
-- (supabase-customers-default-tenant.sql). Inserts must now name their shop.
drop trigger if exists customers_default_tenant on public.customers;
drop function if exists private.default_customer_tenant();

-- 3. Customer policies --------------------------------------------------------
-- Anonymous accounts use the `authenticated` role, like staff. Staff policies
-- ("Staff read/insert/update own tenant") are unchanged; a staff login has no
-- card of its own, and a customer account has no staff_tenant mapping.
drop policy if exists "Public read (anon, own trust model)" on public.customers;
drop policy if exists "Public insert (anon, own trust model)" on public.customers;
drop policy if exists "Public delete (anon, own trust model)" on public.customers;
drop policy if exists "Allow public update" on public.customers;

create policy "Customer reads own card" on public.customers
  for select to authenticated
  using (user_id = auth.uid());

create policy "Customer joins" on public.customers
  for insert to authenticated
  with check (user_id = auth.uid() and stamps = 0);

create policy "Customer edits own card" on public.customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Customer deletes own card" on public.customers
  for delete to authenticated
  using (user_id = auth.uid());

-- 4. Column guard ---------------------------------------------------------------
-- RLS is row-level, so it can't stop a customer editing their own stamps. This
-- trigger lets non-staff change only name and contact, and stops anyone
-- attaching a new card to someone else's account. Staff of the card's shop,
-- the service role and direct SQL (no request JWT) are not restricted here.
create or replace function private.guard_customer_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', '');
  staff_tenant uuid := private.current_staff_tenant_id();
begin
  if caller_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id is not null and new.user_id is distinct from auth.uid() then
      raise exception 'A new card can only be linked to your own account' using errcode = '42501';
    end if;
    return new;
  end if;

  if staff_tenant is not null and staff_tenant = old.tenant_id then
    return new;
  end if;
  if new.stamps is distinct from old.stamps
     or new.tenant_id is distinct from old.tenant_id
     or new.code is distinct from old.code
     or new.user_id is distinct from old.user_id then
    raise exception 'Customers can only change their name and contact' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_customer_write() from public, anon, authenticated;

drop trigger if exists customers_guard_write on public.customers;
create trigger customers_guard_write
  before insert or update on public.customers
  for each row execute function private.guard_customer_write();

-- 5. "Already have a card?" ---------------------------------------------------
-- Contact matching ignores case, spaces, dashes, dots and brackets.
-- Mirrored by normalizeContact() in src/lib/loyalty.js — keep them in step.
create or replace function private.normalize_contact(contact text)
returns text
language sql
immutable
set search_path = ''
as $$
  select lower(regexp_replace(coalesce(contact, ''), '[[:space:].()-]', '', 'g'));
$$;

-- True if another card in the shop has this contact. Reveals nothing else
-- about that card; used to tell a customer on a new phone to ask staff.
create or replace function public.contact_has_other_card(shop_id uuid, contact text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.normalize_contact(contact) <> '' and exists (
    select 1 from public.customers c
    where c.tenant_id = shop_id
      and c.user_id is distinct from auth.uid()
      and private.normalize_contact(c.contact) = private.normalize_contact(contact_has_other_card.contact)
  );
$$;

revoke all on function public.contact_has_other_card(uuid, text) from public, anon;
grant execute on function public.contact_has_other_card(uuid, text) to authenticated;

-- 6. Staff "Move card" ---------------------------------------------------------
-- Moves an existing card (stamps, code, name) onto the account behind a newly
-- joined card — the customer's new phone — and deletes that new empty card.
-- Both cards must belong to the calling staff member's shop.
create or replace function public.move_card(old_code text, new_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := private.current_staff_tenant_id();
  old_card public.customers;
  new_card public.customers;
begin
  if shop is null then
    raise exception 'Only staff can move cards' using errcode = '42501';
  end if;
  select * into old_card from public.customers c where c.code = old_code and c.tenant_id = shop for update;
  select * into new_card from public.customers c where c.code = new_code and c.tenant_id = shop for update;
  if old_card.id is null or new_card.id is null then
    raise exception 'Card not found in this shop' using errcode = 'P0002';
  end if;
  if old_card.id = new_card.id then
    raise exception 'Choose two different cards' using errcode = '22023';
  end if;
  if new_card.user_id is null then
    raise exception 'The new card is not linked to a phone' using errcode = '22023';
  end if;
  delete from public.customers where id = new_card.id;
  update public.customers set user_id = new_card.user_id where id = old_card.id;
end;
$$;

revoke all on function public.move_card(text, text) from public, anon;
grant execute on function public.move_card(text, text) to authenticated;
