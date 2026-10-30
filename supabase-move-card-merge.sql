-- "Move card" keeps the card on the customer's current phone and adds the old
-- card's stamps to it, instead of moving the old card (code and all) onto the
-- phone and deleting the new card. Stamps are never thrown away, even when
-- staff pick the two cards the wrong way round.
--
-- Same name and arguments as before, so app 1.0.3's "Move it here" / "Move
-- card" buttons get the new behaviour without an app update.
-- Replaces public.move_card from supabase-anon-customers.sql.
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
  update public.customers set stamps = new_card.stamps + old_card.stamps where id = new_card.id;
  delete from public.customers where id = old_card.id;
end;
$$;

revoke all on function public.move_card(text, text) from public, anon;
grant execute on function public.move_card(text, text) to authenticated;
