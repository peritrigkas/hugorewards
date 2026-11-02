-- Birthday treat (design: developent-docs/birthday-treat-design.md).
--
-- A customer adds their birthday (day and month, no year) in My Account.
-- During their birthday week, the birthday and the 6 days after it, staff
-- can redeem the shop's birthday treat once that year.
--
-- Customers can save a birthday twice: the second save locks it. Removing it
-- doesn't count as a save. Staff can always correct it.
--
-- Builds on supabase-promo-cards.sql. Tests: tests/db/birthday.test.js.
-- Additive: apps up to 1.0.6 never send the new columns and keep working.

-- 1. The birthday --------------------------------------------------------------------
alter table public.customers add column if not exists birthday_month smallint;
alter table public.customers add column if not exists birthday_day smallint;
-- How many times the customer saved a birthday (staff corrections don't count).
alter table public.customers add column if not exists birthday_saves smallint not null default 0;

alter table public.customers drop constraint if exists customers_birthday_check;
alter table public.customers add constraint customers_birthday_check check (
  (birthday_month is null) = (birthday_day is null)
  and (birthday_month is null or (
    birthday_month between 1 and 12
    and birthday_day between 1 and extract(day from make_date(2000, birthday_month, 1) + interval '1 month - 1 day')
  ))
);
alter table public.customers drop constraint if exists customers_birthday_saves_check;
alter table public.customers add constraint customers_birthday_saves_check check (birthday_saves between 0 and 2);

-- 2. Column guard ----------------------------------------------------------------------
-- Replaces private.guard_customer_write from supabase-anon-customers.sql.
-- Customers may also change their birthday: each save of a new date counts,
-- removing it doesn't, and after two saves it's locked. They can't change the
-- count themselves.
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
    if staff_tenant is null then
      new.birthday_saves := case when new.birthday_month is null then 0 else 1 end;
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
    raise exception 'Customers can only change their name, contact and birthday' using errcode = '42501';
  end if;
  new.birthday_saves := old.birthday_saves;
  if (new.birthday_month, new.birthday_day) is distinct from (old.birthday_month, old.birthday_day) then
    if old.birthday_saves >= 2 then
      raise exception 'Your birthday is locked. Ask staff to correct it' using errcode = '42501';
    end if;
    if new.birthday_month is not null then
      new.birthday_saves := old.birthday_saves + 1;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_customer_write() from public, anon, authenticated;

-- 3. Redeemed treats ---------------------------------------------------------------------
-- One row per treat given; at most one per customer per birthday year.
create table if not exists public.birthday_treats (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  birthday_on date not null, -- the birthday the treat was for
  redeemed_at timestamptz not null default now()
);
create unique index if not exists birthday_treats_once_a_year
  on public.birthday_treats (customer_id, (extract(year from birthday_on)));
create index if not exists birthday_treats_tenant_id_idx on public.birthday_treats (tenant_id);

alter table public.birthday_treats enable row level security;

-- Read-only from the app; redeem_birthday_treat and move_card write it.
drop policy if exists "Customer reads own birthday treats" on public.birthday_treats;
create policy "Customer reads own birthday treats" on public.birthday_treats
  for select to authenticated
  using (exists (select 1 from public.customers c where c.id = customer_id and c.user_id = (select auth.uid())));

drop policy if exists "Staff read own shop's birthday treats" on public.birthday_treats;
create policy "Staff read own shop's birthday treats" on public.birthday_treats
  for select to authenticated
  using (tenant_id = private.current_staff_tenant_id());

-- 4. Birthday week --------------------------------------------------------------------------
-- The birthday in a given year; 29 February is the 28th in other years.
-- Mirrored by birthdayIn() in src/lib/birthday.js.
create or replace function private.birthday_in(yr int, mon int, dy int)
returns date
language sql
immutable
set search_path = ''
as $$
  select case
    when mon = 2 and dy = 29 and extract(day from make_date(yr, 3, 1) - 1) <> 29 then make_date(yr, 2, 28)
    else make_date(yr, mon, dy)
  end;
$$;

-- The birthday whose week (the birthday and the 6 days after) includes
-- `today`, or null. Looks at last year too, for a week that runs into January.
create or replace function private.birthday_week_of(mon int, dy int, today date)
returns date
language sql
immutable
set search_path = ''
as $$
  select b from (
    select private.birthday_in(extract(year from today)::int, mon, dy) as b
    union all
    select private.birthday_in(extract(year from today)::int - 1, mon, dy)
  ) x
  where mon is not null and today between b and b + 6
  limit 1;
$$;

revoke all on function private.birthday_in(int, int, int) from public, anon, authenticated;
revoke all on function private.birthday_week_of(int, int, date) from public, anon, authenticated;

-- 5. Redeeming the treat ----------------------------------------------------------------------
-- Staff of the card's shop, during the customer's birthday week, once.
create or replace function public.redeem_birthday_treat(card_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := private.current_staff_tenant_id();
  card public.customers;
  birthday date;
begin
  if shop is null then
    raise exception 'Only staff can redeem' using errcode = '42501';
  end if;
  select * into card from public.customers c where c.code = card_code and c.tenant_id = shop for update;
  if card.id is null then
    raise exception 'Card not found in this shop' using errcode = 'P0002';
  end if;
  if card.birthday_month is null then
    raise exception 'No birthday saved for this customer' using errcode = '22023';
  end if;
  birthday := private.birthday_week_of(card.birthday_month, card.birthday_day, private.shop_today(shop));
  if birthday is null then
    raise exception 'It isn''t their birthday week' using errcode = '22023';
  end if;
  insert into public.birthday_treats (customer_id, tenant_id, birthday_on)
    values (card.id, shop, birthday)
    on conflict do nothing;
  if not found then
    raise exception 'Their birthday treat has already been redeemed this year' using errcode = '22023';
  end if;
  -- Fires the live update on customers that both apps listen to.
  update public.customers c set stamps = c.stamps where c.id = card.id;
end;
$$;

revoke all on function public.redeem_birthday_treat(text) from public, anon;
grant execute on function public.redeem_birthday_treat(text) to authenticated;

-- 6. Move card also carries the birthday and treats -------------------------------------------
-- Replaces public.move_card from supabase-promo-cards.sql. The new card keeps
-- its own birthday if it has one; otherwise it takes the old card's (and its
-- save count). Treats move too, except one for a year the new card already has.
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
  update public.birthday_treats b set customer_id = new_card.id
    where b.customer_id = old_card.id
      and not exists (
        select 1 from public.birthday_treats n
        where n.customer_id = new_card.id and extract(year from n.birthday_on) = extract(year from b.birthday_on)
      );
  update public.customers set
    stamps = new_card.stamps + old_card.stamps,
    birthday_month = coalesce(new_card.birthday_month, old_card.birthday_month),
    birthday_day = coalesce(new_card.birthday_day, old_card.birthday_day),
    birthday_saves = case when new_card.birthday_month is null then old_card.birthday_saves else new_card.birthday_saves end
    where id = new_card.id;
  delete from public.customers where id = old_card.id;
end;
$$;

revoke all on function public.move_card(text, text) from public, anon;
grant execute on function public.move_card(text, text) to authenticated;
