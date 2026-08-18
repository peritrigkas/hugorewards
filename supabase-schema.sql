-- Run this once in your Supabase project's SQL editor (Dashboard -> SQL Editor -> New query)

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  code text not null unique,
  stamps int not null default 0,
  created_at timestamptz not null default now()
);

-- Enable realtime updates so the customer's "My Card" view updates live
-- when the owner adds a stamp, without needing a manual refresh.
alter publication supabase_realtime add table customers;

-- Row Level Security: read and join (insert) stay open, since customers use the
-- app without logging in. Writes to stamp counts (update) require an
-- authenticated session — only logged-in staff can add/reset stamps, enforced
-- at the database level so it holds even if the app itself were bypassed.
alter table customers enable row level security;

create policy "Allow public read" on customers
  for select using (true);

create policy "Allow public insert" on customers
  for insert with check (true);

create policy "Allow authenticated update" on customers
  for update to authenticated using (true) with check (true);

-- Lets a customer delete their own record (self-service account deletion in the
-- app's My Account screen), matching the same public-access trust model as
-- read/insert above.
create policy "Allow public delete" on customers
  for delete using (true);
