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
| 0 | Loading screen 5s → 3s | One-line change to `CustomerApp`'s minimum loading delay | — | ✅ Done | — |
| 1 | **Smoke tests** | Playwright against the scratch project, Hugo and Daisy. Customer: sign up → card + QR → edit details → log out / rejoin → delete. Staff: log in → stamp by code → reward → reset. `npm test` runs unit + DB + smoke | Green against today's code | 🚧 In progress | — |
| 2 | **Data layer** | Every Supabase call moves to `src/lib/customers.js` / `src/lib/staffAuth.js`; pure logic (`makeCode`, stamp/reward maths, code regex) to `src/lib/loyalty.js` with unit tests | Tests green; no `supabase.` calls left in components | ⏳ Not started | — |
| 3 | **Split components** | Pure move into `src/components/` (CowMark, BrandMark, stamp cards, QR, TopBar, nav), `src/customer/screens/` (Join, Home, Visit, Account, Menu, …), `src/owner/` (OwnerApp, StaffLogin, PinPrompt, ScanPanel). `App.jsx` becomes a ~15-line customer/owner switch | Tests green; no file over ~250 lines | ⏳ Not started | — |
| 4 | **State hooks** | `useCustomer()` (saved code, load, realtime, join/edit/delete) and `useOwnerCustomers()` (session, list, realtime, stamp/reset); screens become presentational | Tests green | ⏳ Not started | — |
| 5 | **Startup speed** | Cache the tenant row + logo on the device so later launches render immediately and refresh in the background; measure time-to-first-screen before/after | Measurably faster cold start | ⏳ Not started — caching needs a decision (below) | — |
| 6 | **Styles** *(optional)* | Inline styles → CSS using the existing `--c-*` variables | Screenshots match | ⏸️ Deferred | — |

After step 4, the anon-customer redesign should mostly touch
`src/lib/customers.js` and `useCustomer()`, and is done when the 9
`knownHole`s in `tests/db/security.test.js` pass as normal tests.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-10-29 | Refactor before the anon-customer redesign, starting with smoke tests | The redesign rewrites every customer data call; a data layer first shrinks it to one module, and smoke tests are the only guard against a refactor silently breaking a flow (signups were already silently broken once, 2026-09-23 → 2026-10-29) |
| 2026-10-29 | Customer loading screen minimum shortened from 5s to 3s | The fixed 5s wait was the main reason the app felt slow to open; its animations finish within ~1s, so 3s keeps the branded moment without the drag |
| — | **Open:** cache tenant config on the device (step 5)? | Faster launches, but a branding change in Supabase would show on the *second* launch rather than the first |
