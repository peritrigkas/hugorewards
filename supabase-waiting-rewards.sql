-- Waiting rewards (developent-docs/promo-cards-design.md, "Waiting rewards").
--
-- A stamp on a full card no longer bounces off. The full card moves to the
-- customer's Past cards as READY TO CLAIM, and the stamp starts a new card.
-- Staff redeem a waiting reward later with redeem_reward(). It expires
-- 6 months (main card) or 1 month (promo card) after it was moved.
--
-- Builds on supabase-promo-cards.sql. Tests: tests/db/promos.test.js.
--
-- Additive: apps up to 1.0.5 keep working. Their staff screens show Redeem,
-- not + Stamp, on a full card, so they never move one; only the next app
-- version creates waiting rewards.

-- 1. History rows can be waiting -------------------------------------------------
-- outcome 'ready': moved to Past cards, not redeemed yet. claim_by is set for
-- these only. Expired waiting rewards aren't stored as such: a 'ready' row
-- past its claim_by has expired.
alter table public.card_history add column if not exists claim_by timestamptz;
alter table public.card_history drop constraint if exists card_history_outcome_check;
alter table public.card_history add constraint card_history_outcome_check
  check (outcome in ('redeemed', 'ready'));
alter table public.card_history drop constraint if exists card_history_claim_by_check;
alter table public.card_history add constraint card_history_claim_by_check
  check ((outcome = 'ready') = (claim_by is not null));

-- 2. Stamping a full card ------------------------------------------------------------
-- A full card (or an over-full one, after moving stamps) moves one full card's
-- worth of stamps to history as 'ready'; whatever was left over, plus this
-- stamp, starts the new card.
create or replace function public.add_stamp(card_code text, promo uuid default null)
returns int
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
    needed := private.main_stamps_for_reward(shop);
    if card.stamps < needed then
      update public.customers c set stamps = c.stamps + 1 where c.id = card.id returning c.stamps into new_stamps;
      return new_stamps;
    end if;
    select * into t from public.tenants x where x.id = shop;
    insert into public.card_history (customer_id, tenant_id, card_name, icon, stamps_for_reward, stamps, outcome, claim_by)
      values (card.id, shop, t.brand_name, t.config -> 'loyalty' ->> 'stampIcon', needed, needed, 'ready', now() + interval '6 months');
    update public.customers c set stamps = c.stamps - needed + 1 where c.id = card.id returning c.stamps into new_stamps;
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
  select * into s from public.promo_stamps x where x.customer_id = card.id and x.promo_id = p.id for update;
  if s.customer_id is null then
    insert into public.promo_stamps (customer_id, promo_id, stamps) values (card.id, p.id, 1);
    new_stamps := 1;
  elsif s.stamps < p.stamps_for_reward then
    update public.promo_stamps x set stamps = x.stamps + 1
      where x.customer_id = card.id and x.promo_id = p.id returning x.stamps into new_stamps;
  else
    insert into public.card_history (customer_id, tenant_id, promo_id, card_name, icon, stamps_for_reward, stamps, outcome, claim_by)
      values (card.id, shop, p.id, p.name, p.icon, p.stamps_for_reward, p.stamps_for_reward, 'ready', now() + interval '1 month');
    update public.promo_stamps x set stamps = x.stamps - p.stamps_for_reward + 1
      where x.customer_id = card.id and x.promo_id = p.id returning x.stamps into new_stamps;
  end if;
  update public.customers c set stamps = c.stamps where c.id = card.id;
  return new_stamps;
end;
$$;

-- 3. Redeeming a waiting reward ----------------------------------------------------
-- Staff of the reward's shop, before it expires. The row becomes 'redeemed'
-- and its finished_at the redemption time.
create or replace function public.redeem_reward(reward uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop uuid := private.current_staff_tenant_id();
  h public.card_history;
begin
  if shop is null then
    raise exception 'Only staff can redeem' using errcode = '42501';
  end if;
  select * into h from public.card_history x where x.id = reward and x.tenant_id = shop for update;
  if h.id is null then
    raise exception 'Reward not found in this shop' using errcode = 'P0002';
  end if;
  if h.outcome <> 'ready' then
    raise exception 'This reward has already been redeemed' using errcode = '22023';
  end if;
  if h.claim_by < now() then
    raise exception 'The time to claim this reward has ended' using errcode = '22023';
  end if;
  update public.card_history x set outcome = 'redeemed', claim_by = null, finished_at = now() where x.id = h.id;
  -- Fires the live update on customers that both apps listen to.
  update public.customers c set stamps = c.stamps where c.id = h.customer_id;
end;
$$;

revoke all on function public.add_stamp(text, uuid) from public, anon;
grant execute on function public.add_stamp(text, uuid) to authenticated;
revoke all on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;
