-- Applied to the live Hugo project 2026-10-29 as migration
-- `customers_staff_insert_own_tenant`.
--
-- supabase-schema-tenants.sql only gave `anon` an INSERT policy on customers.
-- supabase-js keeps the staff login (owner dashboard) on the device, so every
-- later request from that device -- including a customer signup -- runs as
-- `authenticated`, and was rejected with an RLS violation from 2026-09-23 on.
-- This lets staff create customers, scoped to their own tenant like the
-- existing staff read/update policies. tenant_id is filled in by the client
-- or, while it exists, the customers_default_tenant trigger
-- (supabase-customers-default-tenant.sql) before this check runs.
create policy "Staff insert own tenant" on public.customers
  for insert to authenticated
  with check (tenant_id = private.current_staff_tenant_id());
