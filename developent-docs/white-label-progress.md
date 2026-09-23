# White-Label Platform: Progress Tracker

Companion to `white-label-strategy.md` (the original plan). That doc stays as the
record of *why* decisions were made; this doc tracks *what's actually landed*,
organized by epic, with a PR number per feature. Update it whenever a
white-label feature ships or a decision changes from the original strategy.

**Status legend:** ✅ Done · 🚧 In progress · ⏳ Not started · ⏸️ Deferred

**Test environment:** a scratch Supabase project, "Hugo White-Label Scratch" (project ref `fjclbclxdecxqiqvbfhj`, same `Hugo` org as the live pilot project, free tier), exists for testing schema/RLS changes before they ever touch the live Hugo project. Reuse it for further Epic 2 work rather than creating another.

---

## Epic 1: Config-driven codebase (Option A groundwork)

Extract everything that varies per client out of `App.jsx` into a config
module, so a new client is a config change, not a rewrite. Required
regardless of which backend architecture (A or B) is chosen.

| Feature | Status | PR |
|---|---|---|
| Content/copy extraction (brand name, taglines, menu, location, loyalty rules) into `src/client.config.js` | ✅ Done | [#1](https://github.com/peritrigkas/hugorewards/pull/1) |
| CSS-variable color theming (`--c-*` custom properties sourced from `client.config.js`) | ✅ Done | [#2](https://github.com/peritrigkas/hugorewards/pull/2) |
| Mascot/logo artwork swap-per-client | ⏳ Not started | — |
| Config schema/validation (TS type or JSON schema) | ⏳ Not started | — |

## Epic 2: Multi-tenant backend (Option B)

Shared Supabase project, `tenants` table, `tenant_id`-scoped RLS. Decided
over per-client Supabase projects (Option A) for cost reasons at ~10 clients
— see strategy doc §6.

| Feature | Status | PR |
|---|---|---|
| `tenants` table schema design | ✅ Verified against scratch Supabase project ("Hugo White-Label Scratch"), not yet applied to the live project | [#4](https://github.com/peritrigkas/hugorewards/pull/4), [#5](https://github.com/peritrigkas/hugorewards/pull/5) |
| `tenant_id` added to `customers` + backfill Hugo's row | ✅ Verified, same migration | [#4](https://github.com/peritrigkas/hugorewards/pull/4) |
| RLS policies scoped by `tenant_id` | ✅ Verified — confirmed each policy applies to exactly one of anon/authenticated, security advisories clean | [#4](https://github.com/peritrigkas/hugorewards/pull/4), [#5](https://github.com/peritrigkas/hugorewards/pull/5) |
| Staff auth → tenant mapping (`staff_tenant` table) | ✅ Verified, same migration | [#4](https://github.com/peritrigkas/hugorewards/pull/4) |
| Tenant resolution in frontend (fetch config from DB row instead of static file) | ✅ Done | [#6](https://github.com/peritrigkas/hugorewards/pull/6) |

## Epic 3: Distribution — per-client packaging (C2)

One branded Android + iOS build per client, sharing the multi-tenant backend.
Single shared app (Option C3) was ruled out — each client wants their own
home-screen icon/name.

| Feature | Status | PR |
|---|---|---|
| Icon/splash generation tooling (`@capacitor/assets`) | ⏳ Not started | — |
| Android `appId`/`appName` substitution script | ⏳ Not started | — |
| iOS bundle-id + signing/provisioning setup (`@capacitor/ios` not yet installed) | ⏳ Not started | — |
| "New client" checklist/scaffold script | ⏳ Not started | — |
| iOS CI (GitHub Actions/Codemagic) | ⏸️ Deferred until 2nd client confirms it's worth automating | — |

---

## Decisions log

Chronological. Each entry: date, decision, why, and which strategy-doc
section it updates or overrides.

| Date | Decision | Why | Strategy doc ref |
|---|---|---|---|
| 2026-09-04 | Backend: Option B (shared multi-tenant Supabase) over Option A (one project per client) | £5-10/mo price point can't absorb N × $25/mo Supabase Pro projects | §6 |
| 2026-09-04 | Distribution: C2 (one branded app per client per platform) | Each client wants their own app identity (Q2); rules out single shared app (C3) | §6 |
| 2026-09-04 | Admin UI deferred, manage tenants via Supabase Studio directly | User owns config changes themselves, not selling self-serve (Q3) | §6 |
| 2026-09-14 | iOS CI setup deferred until a 2nd client | First release built manually; CI only pays off once there's a build to repeat. No rework needed to add CI later — it wraps the same manual steps | §7 |
| 2026-09-14 | Config extraction scoped to content/copy only for the first pass; colors and mascot artwork explicitly excluded | Keeps the refactor reviewable in one PR; strategy doc itself lists these as separate line items (content extraction vs. CSS variable pass) | §3, Option A steps |
| 2026-09-17 | CSS-variable pass covers UI chrome only, not the cow mascot SVG or QR canvas | Those are illustration assets tied to Hugo's specific artwork — swapping them per client is a distinct asset-swap phase, not a palette change | §2 (Brand identity: Logo/icon) |
| 2026-09-17 | `tenants`/`customers`/`staff_tenant` RLS policies scoped explicitly `to anon` / `to authenticated` rather than left role-unscoped | Postgres OR's permissive policies for the same command together — a role-unscoped `using (true)` public-read policy would silently also apply to authenticated staff and defeat tenant isolation. Explicit role scoping is what actually enforces "staff only see their own tenant's customers" | §3 Option B (RLS/tenant isolation is "dangerous to get subtly wrong") |
| 2026-09-17 | `supabase-schema-tenants.sql` migration written but deliberately NOT applied to the live Hugo project yet | No point running it before `App.jsx` has tenant-resolution logic to use it; drafted first for review since this is the highest-risk piece of the whole plan | §3 Option B |
| 2026-09-17 | Created a new scratch Supabase project ("Hugo White-Label Scratch", same `Hugo` org) and applied the tenants migration there for real testing | Needed a real database to verify RLS behavior against, without any risk to Hugo's live pilot data | §3 Option B |
| 2026-09-17 | Moved the `current_staff_tenant_id` helper into a `private` (non-API-exposed) schema, pinned its `search_path`, and restricted `EXECUTE` to `authenticated` only | Supabase's security advisor flagged the function as callable directly via `/rest/v1/rpc/` by anon and authenticated clients, and with a mutable search_path — both are real hardening issues for a `SECURITY DEFINER` function, even though this particular function only ever returns the caller's own tenant mapping | §3 Option B |
| 2026-09-23 | Frontend tenant resolution fetches the `tenants` row and mutates the shared `clientConfig` object in place (via `src/tenantConfig.js`), rather than threading config through React context/props | `App.jsx`'s many module-level consts (`STAMPS_FOR_REWARD`, `CUSTOMER_CODE_RE`, `STORAGE_KEY`, `STAFF_PIN`) are derived from `clientConfig` at import time; `main.jsx` now awaits `applyTenantConfig()` and only then dynamically imports `App.jsx`, so those consts compute from the resolved tenant. Avoids a large refactor of App.jsx while still landing before the `tenants` migration is applied live | §3 Option B |
| 2026-09-23 | Falls back silently to the bundled Hugo `client.config.js` if the `tenants` table doesn't exist yet, the slug isn't found, or the fetch fails/errors | Live Hugo project hasn't had `supabase-schema-tenants.sql` applied yet — this keeps the current single-tenant deployment working unchanged until that migration ships | §3 Option B |

## Deviations from the original strategy doc

Anything that turned out differently once implementation started. Keep this
short — link to the decisions log entry for the reasoning.

*(none yet — implementation has followed the strategy doc as written so far)*
