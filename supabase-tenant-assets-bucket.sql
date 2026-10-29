-- Applied to the live Hugo project 2026-10-29 as migration
-- `tenant_assets_bucket`.
--
-- Public bucket for per-tenant artwork (logos), referenced from
-- tenants.config.logoUrl (see src/client.config.js). Public = anyone can read
-- by URL; no storage.objects policies are added, so only service-role /
-- Supabase Studio can upload or list. Raster only: SVG can carry script and
-- would be served from this project's domain.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenant-assets', 'tenant-assets', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
