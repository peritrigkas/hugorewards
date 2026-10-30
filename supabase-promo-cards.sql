-- Promo cards and past cards (design: developent-docs/promo-cards-design.md).
--
-- Applied to the scratch project 2026-10-30 as migrations `promo_cards` and
-- `promo_cards_policy_initplan`. Tests: tests/db/promos.test.js.
--
-- Additive: apps 1.0.3 and 1.0.4 keep working. They don't know about promos,
-- and their Redeem still resets customers.stamps directly, without a history
-- record.
--
-- Expected security-advisor warnings afterwards, all intentional:
--  * "Signed-in users can execute SECURITY DEFINER function" for add_stamp
--    and redeem: staff call them from the app, and each checks the caller is
--    staff of the card's shop.
--  * "Anonymous access policies" on promos / promo_stamps / card_history:
--    customer accounts are anonymous sign-ins and read their own rows.
--  * "Multiple permissive policies": customers and staff each have their own
--    read policy, as on customers.

create extension if not exists btree_gist with schema extensions;

-- 1. Shop time ---------------------------------------------------------------
-- Promo dates are days in the shop's own time zone (tenants.config.timezone,
-- default Europe/London). The database decides what "today" is, so a phone
-- with the wrong clock can't stamp an ended promo.
create or replace function private.shop_today(shop uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(t.config ->> 'timezone', 'Europe/London'))::date
  from public.tenants t where t.id = shop;
$$;

-- Stamps needed for the main card's reward. Mirrors the app's default of 9
-- (src/client.config.js) when the shop's config doesn't set it.
create or replace function private.main_stamps_for_reward(shop uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((t.config -> 'loyalty' ->> 'stampsForReward')::int, 9)
  from public.tenants t where t.id = shop;
$$;

revoke all on function private.shop_today(uuid) from public, anon, authenticated;
revoke all on function private.main_stamps_for_reward(uuid) from public, anon, authenticated;

-- 2. Tables -------------------------------------------------------------------
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  icon text not null,
  stamps_for_reward int not null check (stamps_for_reward between 1 and 20),
  starts_on date not null,
  ends_on date not null,
  claim_days int not null default 14 check (claim_days >= 0),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  -- One promo at a time per shop.
  constraint promos_no_overlap exclude using gist (
    tenant_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
);

-- One row per customer per promo, created on the first stamp. Redeeming
-- deletes it, so a row left after the promo (or its claim window) has ended
-- is an expired card.
create table if not exists public.promo_stamps (
  customer_id uuid not null references public.customers (id) on delete cascade,
  promo_id uuid not null references public.promos (id) on delete restrict,
  stamps int not null check (stamps >= 0),
  primary key (customer_id, promo_id)
);
create index if not exists promo_stamps_promo_id_idx on public.promo_stamps (promo_id);

-- One row per redeemed card, main or promo, with a snapshot of the card.
create table if not exists public.card_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  promo_id uuid references public.promos (id) on delete restrict, -- null: main card
  card_name text not null,
  icon text,
  stamps_for_reward int not null,
  stamps int not null,
  outcome text not null default 'redeemed' check (outcome in ('redeemed')),
  finished_at timestamptz not null default now()
);
create index if not exists card_history_customer_id_idx on public.card_history (customer_id);
create index if not exists card_history_tenant_id_idx on public.card_history (tenant_id);
create index if not exists card_history_promo_id_idx on public.card_history (promo_id);

-- 3. Access rules ---------------------------------------------------------------
alter table public.promos enable row level security;
alter table public.promo_stamps enable row level security;
alter table public.card_history enable row level security;

-- Promos are public shop info, like branding.
drop policy if exists "Anyone reads promos" on public.promos;
create policy "Anyone reads promos" on public.promos
  for select using (true);

drop policy if exists "Staff add promos" on public.promos;
create policy "Staff add promos" on public.promos
  for insert to authenticated
  with check (tenant_id = private.current_staff_tenant_id());

drop policy if exists "Staff edit promos" on public.promos;
create policy "Staff edit promos" on public.promos
  for update to authenticated
  using (tenant_id = private.current_staff_tenant_id())
  with check (tenant_id = private.current_staff_tenant_id());

drop policy if exists "Staff delete promos" on public.promos;
create policy "Staff delete promos" on public.promos
  for delete to authenticated
  using (tenant_id = private.current_staff_tenant_id());

-- Stamps and history are read-only from the app; add_stamp, redeem and
-- move_card write them.
drop policy if exists "Customer reads own promo stamps" on public.promo_stamps;
create policy "Customer reads own promo stamps" on public.promo_stamps
  for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));

drop policy if exists "Staff read own shop's promo stamps" on public.promo_stamps;
create policy "Staff read own shop's promo stamps" on public.promo_stamps
  for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.tenant_id = private.current_staff_tenant_id()));

drop policy if exists "Customer reads own history" on public.card_history;
create policy "Customer reads own history" on public.card_history
  for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));

drop policy if exists "Staff read own shop's history" on public.card_history;
create policy "Staff read own shop's history" on public.card_history
  for select to authenticated
  using (tenant_id = private.current_staff_tenant_id());

-- 4. Promo rules -------------------------------------------------------------------
-- Once anyone has a stamp on a promo (or has redeemed one), its stamps needed
-- can't change, so nobody's progress changes under them, and it can't be
-- deleted.
create or replace function private.guard_promo_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  in_use boolean := exists (select 1 from public.promo_stamps s where s.promo_id = old.id)
                 or exists (select 1 from public.card_history h where h.promo_id = old.id);
begin
  if tg_op = 'DELETE' then
    if in_use then
      raise exception 'Customers already have stamps on this promo, so it can''t be deleted' using errcode = '23503';
    end if;
    return old;
  end if;
  if in_use and new.stamps_for_reward is distinct from old.stamps_for_reward then
    raise exception 'Customers already have stamps on this promo, so stamps needed can''t change' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_promo_write() from public, anon, authenticated;

drop trigger if exists promos_guard_write on public.promos;
create trigger promos_guard_write
  before update or delete on public.promos
  for each row execute function private.guard_promo_write();

-- 5. Stamping and redeeming ---------------------------------------------------------
-- Staff of the card's shop only. `promo` null means the main card.
-- Promo changes also touch the customer's row, so the live updates the app
-- already listens to (customers table) fire for promo cards too.
create or replace function public.add_stamp(card_code text, promo uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := private.current_staff_tenant_id();
  card public.customers;
  p public.promos;
  today date;
  new_stamps int;
begin
  if shop is null then
    raise exception 'Only staff can add stamps' using errcode = '42501';
  end if;
  select * into card from public.customers c where c.code = card_code and c.tenant_id = shop for update;
  if card.id is null then
    raise exception 'Card not found in this shop' using errcode = 'P0002';
  end if;

  if promo is null then
    update public.customers c
      set stamps = case when c.stamps < private.main_stamps_for_reward(shop) then c.stamps + 1 else c.stamps end
      where c.id = card.id
      returning c.stamps into new_stamps;
    return new_stamps;
  end if;

  select * into p from public.promos x where x.id = promo and x.tenant_id = shop;
  if p.id is null then
    raise exception 'Promo not found in this shop' using errcode = 'P0002';
  end if;
  today := private.shop_today(shop);
  if today < p.starts_on or today > p.ends_on then
    raise exception 'This promo isn''t running' using errcode = '22023';
  end if;
  insert into public.promo_stamps as s (customer_id, promo_id, stamps)
    values (card.id, p.id, 1)
    on conflict (customer_id, promo_id) do update
      set stamps = case when s.stamps < p.stamps_for_reward then s.stamps + 1 else s.stamps end
    returning s.stamps into new_stamps;
  update public.customers c set stamps = c.stamps where c.id = card.id;
  return new_stamps;
end;
$$;

-- Gives the reward for a full card: records it in card_history and empties
-- the card, in one step. Promo cards can be redeemed while the promo runs and
-- during its claim window.
create or replace function public.redeem(card_code text, promo uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := private.current_staff_tenant_id();
  card public.customers;
  t public.tenants;
  p public.promos;
  s public.promo_stamps;
  needed int;
  today date;
begin
  if shop is null then
    raise exception 'Only staff can redeem' using errcode = '42501';
  end if;
  select * into card from public.customers c where c.code = card_code and c.tenant_id = shop for update;
  if card.id is null then
    raise exception 'Card not found in this shop' using errcode = 'P0002';
  end if;

  if promo is null then
    select * into t from public.tenants x where x.id = shop;
    needed := private.main_stamps_for_reward(shop);
    if card.stamps < needed then
      raise exception 'The card isn''t full yet' using errcode = '22023';
    end if;
    insert into public.card_history (customer_id, tenant_id, card_name, icon, stamps_for_reward, stamps)
      values (card.id, shop, t.brand_name, t.config -> 'loyalty' ->> 'stampIcon', needed, card.stamps);
    update public.customers c set stamps = 0 where c.id = card.id;
    return;
  end if;

  select * into p from public.promos x where x.id = promo and x.tenant_id = shop;
  if p.id is null then
    raise exception 'Promo not found in this shop' using errcode = 'P0002';
  end if;
  select * into s from public.promo_stamps x where x.customer_id = card.id and x.promo_id = p.id for update;
  if s.customer_id is null or s.stamps < p.stamps_for_reward then
    raise exception 'The card isn''t full yet' using errcode = '22023';
  end if;
  today := private.shop_today(shop);
  if today < p.starts_on or today > p.ends_on + p.claim_days then
    raise exception 'The time to claim this reward has ended' using errcode = '22023';
  end if;
  insert into public.card_history (customer_id, tenant_id, promo_id, card_name, icon, stamps_for_reward, stamps)
    values (card.id, shop, p.id, p.name, p.icon, p.stamps_for_reward, s.stamps);
  delete from public.promo_stamps x where x.customer_id = card.id and x.promo_id = p.id;
  update public.customers c set stamps = c.stamps where c.id = card.id;
end;
$$;

revoke all on function public.add_stamp(text, uuid) from public, anon;
grant execute on function public.add_stamp(text, uuid) to authenticated;
revoke all on function public.redeem(text, uuid) from public, anon;
grant execute on function public.redeem(text, uuid) to authenticated;

-- 6. Move card also carries promo stamps and history --------------------------------
-- Replaces public.move_card from supabase-move-card-merge.sql. Stamps are
-- added, never capped, so none are lost.
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
  insert into public.promo_stamps as s (customer_id, promo_id, stamps)
    select new_card.id, o.promo_id, o.stamps from public.promo_stamps o where o.customer_id = old_card.id
    on conflict (customer_id, promo_id) do update set stamps = s.stamps + excluded.stamps;
  update public.card_history h set customer_id = new_card.id where h.customer_id = old_card.id;
  update public.customers set stamps = new_card.stamps + old_card.stamps where id = new_card.id;
  delete from public.customers where id = old_card.id;
end;
$$;

revoke all on function public.move_card(text, text) from public, anon;
grant execute on function public.move_card(text, text) to authenticated;
