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
| `tenants` table schema design | ✅ Applied to the live Hugo project (2026-09-23) | [#4](https://github.com/peritrigkas/hugorewards/pull/4), [#5](https://github.com/peritrigkas/hugorewards/pull/5) |
| `tenant_id` added to `customers` + backfill Hugo's row | ✅ Applied live — all 32 existing customer rows backfilled to the `hugo` tenant | [#4](https://github.com/peritrigkas/hugorewards/pull/4) |
| RLS policies scoped by `tenant_id` | ✅ Applied live — security advisor clean (no new findings) | [#4](https://github.com/peritrigkas/hugorewards/pull/4), [#5](https://github.com/peritrigkas/hugorewards/pull/5) |
| Staff auth → tenant mapping (`staff_tenant` table) | ✅ Applied live — `staff@hugocoffee.com` mapped to the `hugo` tenant | [#4](https://github.com/peritrigkas/hugorewards/pull/4) |
| Tenant resolution in frontend (fetch config from DB row instead of static file) | ✅ Done | [#6](https://github.com/peritrigkas/hugorewards/pull/6) |
| Customer signups send `tenant_id` (fix for signups broken since 2026-09-23) | ✅ Done — plus temporary DB trigger defaulting to `hugo`, to be removed before a 2nd tenant | [#8](https://github.com/peritrigkas/hugorewards/pull/8) |
| Staff-logged-in devices can sign customers up (`Staff insert own tenant` policy) | ✅ Applied live 2026-10-29 | PR pending |

## Epic 3: Distribution — per-client packaging (C2)

One branded Android + iOS build per client, sharing the multi-tenant backend.
Single shared app (Option C3) was ruled out — each client wants their own
home-screen icon/name.

| Feature | Status | PR |
|---|---|---|
| `clients/<slug>/` manifest convention (appId, appName, tenantSlug, icon/splash colors) — validated on every load | ✅ Done | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| "New client" scaffold script (`npm run new-client`) | ✅ Done | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| Android `appId`/`appName`/Java-package substitution script (`scripts/apply-client-identity.mjs`) | ✅ Done — verified on this machine: app-name escaping, whole-package move (incl. nested packages), `npm run reset-client` restore | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| Icon/splash generation tooling (`@capacitor/assets` Easy Mode, `scripts/generate-client-assets.mjs`) | 🚧 Wired up, but **untested end-to-end** — `@capacitor/assets@3.0.5` (run on demand via `npx`, not a devDependency) pulls in `sharp@0.32.6`, which has no prebuilt binary for Node 24 on Windows x64. Needs a first run on a Mac (see `clients/README.md`) | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| `npm run build-client` orchestrator (identity + assets + web build + `cap sync`) | ✅ Done — Hugo builds end-to-end on this machine; other clients hit the sharp caveat above, and the automatic rollback was verified on exactly that failure | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| iOS bundle-id + signing/provisioning setup (`@capacitor/ios` not yet installed) | ⏳ Not started | — |
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
| 2026-09-23 | Falls back silently to the bundled Hugo `client.config.js` if the `tenants` table doesn't exist yet, the slug isn't found, or the fetch fails/errors | Kept as a safety net for future per-client builds / local dev without Supabase, even though the live Hugo project now has the migration applied | §3 Option B |
| 2026-09-23 | Applied `supabase-schema-tenants.sql` to the live Hugo Supabase project (ref `ubniiattgwoouziejubu`) | Epic 2 groundwork (schema + RLS) was already verified against the scratch project; frontend tenant-resolution (PR #6) landed first so the app has something to use the new schema for | §3 Option B |
| 2026-09-23 | Mapped `staff@hugocoffee.com` to the `hugo` tenant in `staff_tenant` immediately after applying the migration | The new tenant-scoped RLS policies ("Staff read/update own tenant") match on `staff_tenant.tenant_id`; with 0 rows in that table right after migration, the existing staff login would have lost visibility into all customers in the owner dashboard until mapped | §3 Option B |
| 2026-09-23 | Per-client packaging builds one client at a time against the single shared `android/` project (`clients/<slug>/client.json` + `scripts/apply-client-identity.mjs` rewrite its appId/appName/Java package in place), rather than keeping N separate checked-in Android platform folders | Matches the existing low-volume, one-release-at-a-time manual workflow (same spirit as the iOS CI deferral) instead of adding the ongoing overhead of N parallel native projects for ~10 prospective clients | §6, Epic 3 |
| 2026-09-23 | Client logo intake uses `@capacitor/assets` "Easy Mode" (single `logo.png` + a background color) instead of Custom Mode (5 separately-sized layer images) | Clients are non-technical business owners — asking for one square logo file is realistic, asking for pre-cut icon-foreground/background/splash layers is not | §2 Brand identity, Epic 3 |
| 2026-10-29 | Added a temporary `customers_default_tenant` trigger on the live Hugo project (`supabase-customers-default-tenant.sql`) that fills `tenant_id` with the `hugo` tenant when omitted, and made the signup insert send `clientConfig.tenantId` | The tenants migration made `customers.tenant_id` NOT NULL with no default, but PR #6's signup insert never sent it — zero signups landed between 2026-09-23 and 2026-10-29. The trigger fixes already-installed Android builds immediately; the code fix is the real fix. **Must drop the trigger before onboarding a 2nd tenant**, or their rows missing `tenant_id` would silently land under hugo | §3 Option B |
| 2026-10-29 | The committed `android/` + `capacitor.config.json` are the baseline (Hugo) identity: `build-client` refuses to start unless they're clean, restores them from git if any step fails, and `npm run reset-client` restores them after a client build. The tenant slug goes to the web build as a process env var, not into `.env.local` | Review of #7 found switching back to Hugo was impossible (no Hugo `logo.png`), `.env.local` silently kept the last client's tenant for later Hugo builds, and a failed build left `android/` half-switched and easy to commit. Git already holds the baseline, so restoring from it is simpler than snapshotting | Epic 3 |
| 2026-10-29 | Added a `Staff insert own tenant` INSERT policy on `customers` for `authenticated`, scoped by `private.current_staff_tenant_id()` (`supabase-customers-staff-insert.sql`) | A phone signup test failed with an RLS violation: supabase-js keeps the staff login on any device used for the owner dashboard, so customer signups there run as `authenticated`, which had no INSERT policy after the tenants migration (only `anon` did). Scoping by staff tenant matches the existing staff read/update policies, so it's a permanent policy, not a stopgap | §3 Option B |

## Deviations from the original strategy doc

Anything that turned out differently once implementation started. Keep this
short — link to the decisions log entry for the reasoning.

*(none yet — implementation has followed the strategy doc as written so far)*
