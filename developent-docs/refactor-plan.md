# Refactor Plan: Splitting up `App.jsx`

Companion to `white-label-progress.md`. Agreed 2026-10-29, before the
anonymous-customer (anon `customers` policies) work, so that work lands in a
small data layer instead of a 1,355-line component file. Update the status
column as each step's PR merges.

**Status legend:** ✅ Done · 🚧 In progress · ⏳ Not started · ⏸️ Deferred

## Findings (2026-10-29)

- **`src/App.jsx` is 1,355 lines with ~38 components.** Largest: `ScanPanel`
  (213 lines), `CustomerApp` (133), `AccountScreen` (118), `OwnerApp` (89).
  238 inline `style={{…}}` blocks.
- **15 Supabase calls are spread through components** (`OwnerApp`,
  `CustomerApp`, `StaffLogin`): customer reads/inserts/updates/deletes, staff
  auth, and two realtime channels. These are exactly what the anon-customer
  redesign has to rewrite.
- **Module-level constants are derived from `clientConfig` at import time**
  (`STAMPS_FOR_REWARD`, `STORAGE_KEY`, `CUSTOMER_CODE_RE`, `STAFF_PIN`), which
  is why `main.jsx` resolves the tenant before importing `App.jsx`. Any module
  that moves out of `App.jsx` must keep reading `clientConfig` only after that
  point (i.e. stay behind the dynamic import).
- **Startup speed is dominated by waits, not bundle size.** The customer app
  enforced a fixed 5-second minimum loading screen (`CustomerApp`), on top of a
  sequential tenant-row fetch → logo preload → `App.jsx` import. The JS is
  ~105 kB gzip (React + supabase-js) + ~26 kB gzip (app), loaded locally from
  the APK, so code-splitting alone won't make the app noticeably faster.
- **No UI tests.** The 26 database security tests (`npm run test:db`) cover RLS
  rules, not screens, so nothing would catch a refactor that breaks a flow.

## Ground rules

- Steps 2–4 are **behaviour-preserving**: no features, fixes or visual changes
  mixed in. Bugs spotted along the way get noted and fixed in their own PR.
- One small PR per step. Each must keep the smoke tests (step 1) and
  `npm run test:db` green.

## Steps

| # | Step | Scope | Done when | Status | PR |
|---|---|---|---|---|---|
| 0 | Loading screen 5s → 3s | One-line change to `CustomerApp`'s minimum loading delay | — | ✅ Done | [#13](https://github.com/peritrigkas/hugorewards/pull/13) |
| 1 | **Smoke tests** | Playwright (`npm run test:smoke`, `tests/smoke/`) against the scratch project, Hugo and Daisy. Customer: sign up → QR + card saved under the right shop → edit name → live stamp update → log out / rejoin → delete. Staff (separate browser context): log in → stamp by code → fill card → redeem; scanner rejects another shop's code. `npm test` runs DB + smoke (unit tests join in step 2) | Green against today's code | ✅ Done — 4 tests, ~30s | [#14](https://github.com/peritrigkas/hugorewards/pull/14) |
| 2 | **Data layer** | Every Supabase call moves to `src/lib/customers.js` (customers table + realtime) / `src/lib/staffAuth.js` (staff session); the device-saved code to `src/lib/savedCode.js`; pure logic (`makeCustomerCode`, `customerCodePattern`, `nextStampCount`, `isRewardReady`) to `src/lib/loyalty.js` with unit tests (`npm run test:unit`) | Tests green; no `supabase.` calls left in components | ✅ Done — no `supabase`/`localStorage` left in `App.jsx`; 13 unit + 26 DB + 4 smoke green | [#15](https://github.com/peritrigkas/hugorewards/pull/15) |
| 3 | **Split components** | Pure move into `src/components/` (CowMark, BrandMark, stamp cards, QR, TopBar, nav), `src/customer/screens/` (Join, Home, Visit, Account, Menu, …), `src/owner/` (OwnerApp, StaffLogin, PinPrompt, ScanPanel). `App.jsx` becomes a ~15-line customer/owner switch | Tests green; no file over ~250 lines | ✅ Done — `App.jsx` 1,339 → 32 lines (incl. a 6-line header comment) across 19 files (largest `owner/ScanPanel.jsx`, 217); scripted move verified line-for-line (all 1,231 code lines moved exactly once); shared `STAMPS_FOR_REWARD` in `src/loyaltySettings.js`; 13 unit + 26 DB + 4 smoke green | [#16](https://github.com/peritrigkas/hugorewards/pull/16) |
| 4 | **State hooks** | `useCustomer()` (saved code, load, realtime, join/edit/delete) and `useOwnerCustomers()` (session, list, realtime, stamp/reset); screens become presentational | Tests green | ✅ Done — `src/customer/useCustomer.js`, `src/owner/useOwnerCustomers.js`, plus `src/customer/useSecretTap.js` (the 7-tap staff entrance); `CustomerApp` 128 → 68 lines, `OwnerApp` 85 → 59; new smoke test for the secret tap → PIN → staff sign-in; 13 unit + 26 DB + 6 smoke green | [#17](https://github.com/peritrigkas/hugorewards/pull/17) |
| 5 | **Startup speed** | Cache the tenant row + logo on the device so later launches render immediately and refresh in the background; measure time-to-first-screen before/after | Measurably faster cold start | ⏳ Not started — caching needs a decision (below) | — |
| 6 | **Styles** *(optional)* | Inline styles → CSS using the existing `--c-*` variables | Screenshots match | ⏸️ Deferred | — |

After step 4, the anon-customer redesign should mostly touch
`src/lib/customers.js` and `useCustomer()`, and is done when the 9
`knownHole`s in `tests/db/security.test.js` pass as normal tests.

## Bugs found along the way

Not fixed inside the refactor steps (ground rules) — each gets its own PR.

| Found | Bug | Evidence | Status |
|---|---|---|---|
| 2026-10-29, step 1 | **Customer card occasionally misses a live stamp update.** The customer's realtime channel (`subscribeToMyCustomer` in `src/lib/customers.js`, used by `useCustomer`) calls `.subscribe()` with no status callback, so a failed or dropped subscription is never noticed or retried; the card only catches up when reopened | Smoke test "customer's card updates live" failed once in 8 runs (Hugo, first run with both dev servers cold): the page still showed `0/9` 15s after staff added a stamp. Root cause unconfirmed — the trace was overwritten by the next run. Smoke tests use `retries: 1` so a recurrence shows up as **flaky** rather than failing at random | ✅ Fixed 2026-10-30 (PR below): live subscriptions now catch up once connected and when the app returns to the foreground, and replace a channel that fails, times out or closes (unit-tested in `tests/unit/liveChanges.test.js`). Root cause still unconfirmed: a channel-name reuse race was ruled out with the real client, and 36 smoke runs without retries passed. `retries: 1` stays so a recurrence shows as flaky |
| 2026-10-29, step 2 | **Customer code can come out shorter than 5 characters.** `makeCustomerCode` takes `Math.random().toString(36).slice(2, 7)`; a "round" random value (e.g. 0.5 → `"0.i"`) has fewer digits, giving `HUGO-I`, which the staff scanner's code check rejects | Unit test with a fixed random value of 0.5, marked `it.fails` (`tests/unit/loyalty.test.js`). Never seen in 2 million real `Math.random()` draws, so very low impact | ✅ Fixed 2026-10-30: each of the 5 characters is drawn separately, so codes are always 5 long; the `it.fails` test is now a normal test |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-29 | Refactor before the anon-customer redesign, starting with smoke tests | The redesign rewrites every customer data call; a data layer first shrinks it to one module, and smoke tests are the only guard against a refactor silently breaking a flow (signups were already silently broken once, 2026-09-23 → 2026-10-29) |
| 2026-10-29 | Customer loading screen minimum shortened from 5s to 3s | The fixed 5s wait was the main reason the app felt slow to open; its animations finish within ~1s, so 3s keeps the branded moment without the drag |
| — | **Open:** cache tenant config on the device (step 5)? | Faster launches, but a branding change in Supabase would show on the *second* launch rather than the first |
