-- TEMPORARY stopgap (applied to the live Hugo project 2026-10-29 as migration
-- `customers_default_hugo_tenant`).
--
-- supabase-schema-tenants.sql made customers.tenant_id NOT NULL with no
-- default, but builds shipped with PR #6 never send tenant_id on insert, so
-- every new signup was rejected from 2026-09-23 onward. This trigger fills in
-- the hugo tenant when the client omits it, fixing already-installed builds.
--
-- Remove before onboarding a second tenant — otherwise any of their rows that
-- omit tenant_id would silently land under hugo instead of failing:
--   drop trigger customers_default_tenant on public.customers;
--   drop function private.default_customer_tenant();

create or replace function private.default_customer_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tenant_id is null then
    select id into new.tenant_id from public.tenants where slug = 'hugo';
  end if;
  return new;
end;
$$;

revoke all on function private.default_customer_tenant() from public, anon, authenticated;

drop trigger if exists customers_default_tenant on public.customers;
create trigger customers_default_tenant
  before insert on public.customers
  for each row execute function private.default_customer_tenant();
