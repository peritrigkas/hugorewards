-- Multi-tenant backend migration (white-label Option B — see
-- developent-docs/white-label-strategy.md §3 and white-label-progress.md
-- Epic 2). Verified against a scratch Supabase project ("Hugo White-Label
-- Scratch") — applies cleanly, tenant-scoped RLS policies confirmed correct
-- (each policy applies to exactly one of anon/authenticated, never both),
-- and `get_advisors` security lints are clean. NOT YET APPLIED to the live
-- Hugo pilot project — run it there only once the frontend's
-- tenant-resolution work lands alongside it; applying it alone doesn't
-- break the running app (every change here is additive/scoped), but
-- there's no point running it before App.jsx knows how to fetch and use a
-- tenant row.
--
-- Run this AFTER supabase-schema.sql in a fresh project, or against the
-- existing Hugo project to upgrade it in place — it's written to be safe
-- either way (`if not exists` / `on conflict do nothing` throughout).

-- 1. Tenants table ----------------------------------------------------------
-- One row per client. `config` mirrors the shape of src/client.config.js
-- (minus the columns broken out below) — the frontend will fetch this row
-- and apply it the same way client.config.js is applied today.
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,          -- e.g. "hugo" — used for tenant resolution
  brand_name text not null,
  full_brand_name text not null,
  code_prefix text not null unique,   -- e.g. "HUGO" — customer code namespace, must stay unique across tenants
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on column tenants.config is
  'Mirrors src/client.config.js: colors, menu, location, copy, loyalty rules, social links.';

-- 2. tenant_id on customers ---------------------------------------------
alter table customers add column if not exists tenant_id uuid references tenants(id);

-- Backfill: create Hugo's tenant row from today's static config, then point
-- every existing customer row at it.
insert into tenants (slug, brand_name, full_brand_name, code_prefix)
values ('hugo', 'Hugo', 'Hugo Rewards', 'HUGO')
on conflict (slug) do nothing;

update customers set tenant_id = (select id from tenants where slug = 'hugo')
where tenant_id is null;

alter table customers alter column tenant_id set not null;

-- 3. Staff -> tenant mapping ----------------------------------------------
-- One row per staff auth user, naming which tenant they manage. The README's
-- shared-staff-login model still holds *within* a tenant (multiple staff can
-- map to the same tenant_id) — this just adds which shop a login belongs to.
create table if not exists staff_tenant (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade
);

-- Lives in a `private` schema (not exposed via the PostgREST API) rather
-- than `public` — a SECURITY DEFINER helper only meant to be called from
-- inside RLS policies shouldn't also be directly callable as an RPC by
-- anon/authenticated clients. `set search_path` pins it against search-path
-- hijacking, per Supabase's function security guidance.
create schema if not exists private;

create or replace function private.current_staff_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from staff_tenant where user_id = auth.uid();
$$;

grant usage on schema private to authenticated;
grant execute on function private.current_staff_tenant_id() to authenticated;

-- 4. RLS ----------------------------------------------------------------
alter table tenants enable row level security;
alter table staff_tenant enable row level security;
alter table customers enable row level security;

-- Tenants: publicly readable (the app needs to fetch brand config before any
-- login happens), never publicly writable — tenant rows are managed directly
-- in Supabase Studio for now (see white-label-strategy.md §6, admin UI
-- deferred).
drop policy if exists "Allow public read" on tenants;
create policy "Allow public read" on tenants for select using (true);

-- staff_tenant: a staff user can see only their own mapping.
drop policy if exists "Staff can read own mapping" on staff_tenant;
create policy "Staff can read own mapping" on staff_tenant
  for select to authenticated using (user_id = auth.uid());

-- customers: replace the old blanket policies. IMPORTANT — Postgres RLS
-- policies for the same command are OR'd together, so a permissive
-- `using (true)` with no role restriction would silently apply to staff too
-- and defeat tenant isolation. Every policy below is scoped `to anon` or
-- `to authenticated` explicitly for that reason — this is the one thing in
-- this migration most worth a second pair of eyes on (see
-- white-label-strategy.md's own warning that tenant-isolation bugs are
-- "dangerous to get subtly wrong").
drop policy if exists "Allow public read" on customers;
drop policy if exists "Allow public insert" on customers;
drop policy if exists "Allow authenticated update" on customers;
drop policy if exists "Allow public delete" on customers;

-- Customers self-serve without logging in (join, fetch their own card by
-- code, delete their own account) — same trust model the single-tenant app
-- already has today (anyone with the anon key can read/insert/delete any
-- row; see README's "worth tightening" note). This migration does not close
-- that gap — it only stops it from ALSO leaking across tenants for staff
-- (below). Fully closing it means moving these three operations behind
-- SECURITY DEFINER RPCs instead of direct table policies; tracked as a
-- follow-up, not attempted here.
create policy "Public read (anon, own trust model)" on customers
  for select to anon using (true);

create policy "Public insert (anon, own trust model)" on customers
  for insert to anon with check (tenant_id is not null);

create policy "Public delete (anon, own trust model)" on customers
  for delete to anon using (true);

-- Staff can only see and update customers in their own tenant — this is the
-- policy that actually enforces isolation between clients.
create policy "Staff read own tenant" on customers
  for select to authenticated using (tenant_id = private.current_staff_tenant_id());

create policy "Staff update own tenant" on customers
  for update to authenticated
  using (tenant_id = private.current_staff_tenant_id())
  with check (tenant_id = private.current_staff_tenant_id());
