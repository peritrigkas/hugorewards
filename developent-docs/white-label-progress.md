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
| Mascot/logo artwork swap-per-client — `logoUrl` (public `tenant-assets` bucket) + `loyalty.stampIcon` stamp-card icons; Hugo keeps the cow | ✅ Done | [#10](https://github.com/peritrigkas/hugorewards/pull/10) |
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
| Staff-logged-in devices can sign customers up (`Staff insert own tenant` policy) | ✅ Applied live 2026-10-29 | [#9](https://github.com/peritrigkas/hugorewards/pull/9) |
| Database security tests (`npm run test:db`, Vitest against the scratch project as anon / Hugo staff / Daisy staff) | ✅ Done — 26 tests; 9 were `knownHole`s for the anon `customers` policies, all closed by anonymous sign-in (now 40 tests, none known holes) | [#12](https://github.com/peritrigkas/hugorewards/pull/12) |
| **Anonymous customer sign-in** (`developent-docs/anon-customers-design.md`, `supabase-anon-customers.sql`): each install gets an anonymous account, cards belong to it (`user_id`), customers see/change only their own card (name + contact), staff "Move card" for new phones, "already have a card?" banner | ✅ Live 2026-10-30: migration applied to live, Android 1.0.3 published | [#18](https://github.com/peritrigkas/hugorewards/pull/18) |

## Epic 3: Distribution — per-client packaging (C2)

One branded Android + iOS build per client, sharing the multi-tenant backend.
Single shared app (Option C3) was ruled out — each client wants their own
home-screen icon/name.

| Feature | Status | PR |
|---|---|---|
| `clients/<slug>/` manifest convention (appId, appName, tenantSlug, icon/splash colors) — validated on every load | ✅ Done | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| "New client" scaffold script (`npm run new-client`) | ✅ Done | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| Android `appId`/`appName`/Java-package substitution script (`scripts/apply-client-identity.mjs`) | ✅ Done — verified on this machine: app-name escaping, whole-package move (incl. nested packages), `npm run reset-client` restore | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| Icon/splash generation tooling (`@capacitor/assets` Easy Mode, `scripts/generate-client-assets.mjs`) | 🚧 Wired up, but **untested end-to-end** — `@capacitor/assets@3.0.5` (run on demand via `npx`, not a devDependency) pulls in `sharp@0.32.6`, which has no prebuilt binary for Node 24 on Windows x64. Needs a first run on Node 22 LTS, WSL/Linux or a Mac (see `clients/README.md`) — a Mac is not required for Android | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| `npm run build-client` orchestrator (identity + assets + web build + `cap sync`) | ✅ Done — Hugo builds end-to-end on this machine; other clients hit the sharp caveat above, and the automatic rollback was verified on exactly that failure | [#7](https://github.com/peritrigkas/hugorewards/pull/7) |
| iOS bundle-id + signing/provisioning setup (`@capacitor/ios` not yet installed) | ⏳ Not started | — |
| iOS CI (GitHub Actions/Codemagic) | ⏸️ Deferred until 2nd client confirms it's worth automating | — |

---

## Before onboarding a 2nd client

Things that are fine while Hugo is the only tenant but break tenant isolation
(or the new client's app) once there are two. Tick off before the 2nd
client's app ships.

- [x] ~~**Ship a Hugo Android build that sends `tenant_id`** and wait for
  installs to update~~ — superseded: 1.0.2 (versionCode 3, [#11](https://github.com/peritrigkas/hugorewards/pull/11),
  sent for Play review 2026-10-29) stops working once anonymous sign-in goes
  live, so the release that matters is **1.0.3** (versionCode 4) below.
- [x] **Go live with anonymous customer sign-in** (done 2026-10-30) — replaces the old
  "drop the `customers_default_tenant` trigger" and "scope the anon
  `customers` policies" items; `supabase-anon-customers.sql` does both.
  Applied and tested on scratch (40 DB + 8 smoke tests, no known holes).
  Live steps, together: (1) Dashboard → Authentication → enable "Allow
  anonymous sign-ins" on the live project; (2) delete the test customers;
  (3) apply `supabase-anon-customers.sql`; (4) release Android 1.0.3. All
  older app versions stop working at step 3 (agreed: only test data).
  Done 2026-10-30, with step 2 left to the dashboard SQL editor (the
  old cards aren't linked to any phone, so no app can reach them).
- [x] **CAPTCHA (Cloudflare Turnstile) on customer and staff sign-in** (live 2026-10-30: 1.0.4 published, CAPTCHA on in live Supabase, verified on a phone)
  before real customers — built in [#19](https://github.com/peritrigkas/hugorewards/pull/19), ships as Android
  **1.0.4** (versionCode 5) after 1.0.3 is live; until then the per-IP
  anonymous rate limit is the only protection against scripted account
  creation. Live steps, in order: (1) create a Turnstile widget in Cloudflare
  (hostname `localhost`, which is where the Android app runs; mode Managed)
  and put its site key in `.env` as `VITE_TURNSTILE_SITE_KEY`; (2) build
  and publish 1.0.4; (3) then Supabase → Authentication → Attack Protection →
  enable CAPTCHA with the widget's secret key. Step 3 stops 1.0.3 and older
  from creating cards or signing staff in (agreed: test data only).
- [x] **Apply `supabase-move-card-merge.sql` to live** — "Move card" adds the
  old card's stamps to the card on the customer's phone instead of deleting
  it. Same function name and arguments, so 1.0.3 gets it without an update.
  Tested on scratch and applied to live 2026-10-30 ([#21](https://github.com/peritrigkas/hugorewards/pull/21)).
- [x] **Promo cards and past cards** (`developent-docs/promo-cards-design.md`) (live 2026-11-01: Android 1.0.5 published)
  - [x] Database: `supabase-promo-cards.sql`, tested on scratch 2026-10-30
    (`tests/db/promos.test.js`)
  - [x] App: customer promo card and Past cards tab; staff customer view,
    "Scans add to" switch and Promo page; stamping and redeeming through
    `add_stamp` / `redeem` (2026-10-31). Needs the SQL on live first: staff
    stamping uses `add_stamp`
  - [x] SQL applied to live 2026-10-31 (migration `promo_cards`)
  - [x] Release the app as 1.0.5 (versionCode 6) — published 2026-11-01 ([#27](https://github.com/peritrigkas/hugorewards/pull/27))
- [ ] **Set the new client's artwork in their `tenants` row** — upload their
  logo to the `tenant-assets` bucket and set `config.logoUrl`, pick a
  `config.loyalty.stampIcon`, and override the cow-themed copy
  (`joinTagline`, `greetingSubtitle`, `loadingMessage`, `howToEarn`,
  `loyalty.earnCardBody`, `loyalty.cardsPromoBody`, ...),
  which they otherwise inherit from Hugo's bundled config.
- [ ] **First non-Hugo Android build** (Node 22 LTS on Windows, WSL/Linux or a Mac) — icon/splash generation is
  still untested end-to-end (checklist in `clients/README.md`).

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
| 2026-10-29 | Kept the `Staff insert own tenant` policy permanently rather than removing it after testing; added a "Before onboarding a 2nd client" checklist | Staff inserts are scoped to their own tenant, which is narrower than what `anon` can already do on `customers`, so the policy adds no real exposure — removing it would just re-break signups on staff devices. The actual cross-tenant exposure is the existing anon read/update/delete policies, now tracked on the checklist | §3 Option B |
| 2026-10-29 | Client logos come from `tenants.config.logoUrl` (public `tenant-assets` Storage bucket, PNG/JPEG/WebP ≤1 MB, uploads via Studio only), preloaded before first render with a fallback to the brand's initial; stamp cards use a per-tenant `loyalty.stampIcon` (bean, leaf, scissors, … from the app's existing lucide icon set) on a grid of `stampsForReward` stamps plus a gold "free" reward slot; the home-screen stats use the stamp icon and logo instead of Hugo's ☕/🐮 | Logo changes shouldn't need an app release; the existing `logo.png` stays build-time-only for icon/splash. A per-industry stamp icon is more distinctive than a plain grid and less busy than the client's logo repeated. Hugo keeps the cow card, re-laid out with 9 spots + a 10th "free" spot (it previously had only 9 spots and no reward spot, and the head was clipped) — falls back to the grid if Hugo's stamp count ever changes, and non-Hugo tenants are reset to neutral defaults so the cow never leaks into their app | §2 Brand identity, Epic 1 |
| 2026-10-29 | Fixed tenant `config` merge: `loyalty`/`colors` overrides now merge key-by-key with the bundled config | PR #6's `Object.assign` replaced those objects wholesale before merging, so a tenant row setting one color or loyalty field would have lost all the others. Latent only — Hugo's row has `config = {}` | §3 Option B |
| 2026-10-29 | Added database security tests (Vitest, `tests/db/`) that run against the scratch project as anon, Hugo staff and Daisy staff; rules the DB does not enforce yet are written as the desired behaviour and marked `knownHole` (`it.fails`) | The project had no automated tests, and signups were silently broken for five weeks (2026-09-23 to 2026-10-29). Writing the holes as expected failures keeps the suite green today and makes it flag each hole as it gets fixed, so they double as the acceptance test for the anon `customers` redesign. Tests self-provision staff accounts (random password per run) via the service-role key in git-ignored `.env.test.local`, and refuse to run against the live project ref | §3 Option B |
| 2026-10-29 | Customers prove card ownership with Supabase **anonymous sign-in** (one invisible account per app install, `customers.user_id`); log out only hides the card on that phone; a new phone gets its old card back via staff **Move card** (`move_card`), prompted by an "already have a card?" banner matched on normalized contact; email-code restore and CAPTCHA are follow-ups | The anon key is in every app, so the old "anyone can read/edit/delete any shop's customers" rules could not be scoped without an identity. A password or per-login email check was rejected as too much friction for a loyalty card; the phone is the proof. Rejoin-by-contact was itself a hole (anyone could type someone else's number), so it became a hint for staff instead of a key. Breaking app versions before 1.0.3 is acceptable because every current customer is test data. Full design and decisions: `anon-customers-design.md` | §3 Option B |
| 2026-10-30 | Bot check is Cloudflare **Turnstile** on anonymous sign-in and staff password sign-in, shipped in its own release (1.0.4) after the 1.0.3 go-live; the widget allows hostname `localhost` instead of giving the Android app its own hostname | Turnstile is free and mostly invisible (a checkbox only for suspicious traffic), and Supabase supports it natively. Supabase's CAPTCHA setting covers every sign-in, so staff sign-in sends a token too. Allowing `localhost` keeps the Android WebView origin (`https://localhost`) unchanged; a new origin would wipe every phone's saved login, and with it the card. The trade-off is a weaker hostname restriction; the challenge itself is the protection. A separate release keeps 1.0.3 in review instead of resubmitting | §3 Option B |
| 2026-10-30 | "Move card" adds the old card's stamps to the card on the customer's current phone and deletes the old card, instead of moving the old card (code and all) onto the phone and deleting the new one | First live test: staff typed the two codes the wrong way round, which moved an empty card onto a phone and deleted a 4-stamp card; a second tap on a stale "possible earlier card" hint took a card off the phone that had just received it. Adding stamps can never lose any, whichever way round the cards are picked, and the phone always keeps the code it shows. The hint now shows only on the newest card with a matching contact | §3 Option B |
| 2026-10-30 | Staff sign-in on a customer's phone keeps that phone's anonymous refresh token and restores it on staff sign-out; reopening while signed in as staff opens the dashboard; staff sign-out is local to the device | A phone holds one login at a time, so staff sign-in replaced the customer account and, after signing out, joining again made a new card. Owners test (and small shops work) on their own phone, so the card has to survive. Signing staff out only on this device stops one phone's sign-out from logging out every other staff device | §3 Option B |

## Deviations from the original strategy doc

Anything that turned out differently once implementation started. Keep this
short — link to the decisions log entry for the reasoning.

*(none yet — implementation has followed the strategy doc as written so far)*
