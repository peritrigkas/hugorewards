# Tests

Automated tests for Hugo Rewards and the multi-tenant (white-label) backend.
All of them run against the **scratch** Supabase project ("Hugo White-Label
Scratch", ref `fjclbclxdecxqiqvbfhj`), never the live Hugo project.

| Layer | What it checks | Tool | Command | Where | Runtime |
|---|---|---|---|---|---|
| **Unit** | Pure logic: customer codes, stamp/reward maths | Vitest | `npm run test:unit` | `tests/unit/` | <1s |
| **Database security** | Who can read and change what in the shared database (row-level security) | Vitest + supabase-js | `npm run test:db` | `tests/db/` | ~8s |
| **Smoke (end-to-end)** | The main customer and staff flows in a real browser, for each shop | Playwright | `npm run test:smoke` | `tests/smoke/` | ~30s |

`npm test` runs unit, then database security, then smoke, stopping at the
first layer that fails. Unit tests need no setup or network; the other two
need the setup below.

## Setup (once per machine)

1. `npm install`
2. `npx playwright install chromium`: downloads the browser the smoke tests use.
3. Copy `.env.test.example` to `.env.test.local` and fill in the scratch
   project's keys from Supabase → Project Settings → API Keys:
   - `SCRATCH_SUPABASE_URL` and `SCRATCH_SUPABASE_ANON_KEY` (public)
   - `SCRATCH_SUPABASE_SERVICE_ROLE_KEY` (**secret**: the `service_role` or
     `sb_secret_…` key). `.env.test.local` is git-ignored; never commit it or
     paste it anywhere.

No staff passwords or test data need setting up; the tests create their own.

## Safety rules (all layers)

- Tests read only `SCRATCH_*` variables, so the live project's `VITE_*` keys
  in `.env` can't leak into a run.
- `tests/support/scratch.js` **refuses to run** if the URL is the live project.
- The service-role key is used only for setup, cleanup and checking results.
  The behaviour under test always runs as an anonymous visitor or a signed-in
  staff member, just like the real app.
- Test staff accounts get a **new random password every run**, so no password
  is stored anywhere. Each layer has its own accounts (`rls-test-staff-…`,
  `smoke-staff-…@test.local`), so running both at once is safe.
- Every row a test creates is tagged and deleted before and after the run:
  customer codes starting `RLSTEST-` (database layer), contacts matching
  `smoke-…@test.local` (smoke layer). A crashed run is cleaned up by the next.

## Unit tests (`tests/unit/`)

Fast tests for pure functions in `src/lib/`. The code under test touches no
database, storage or tenant config: callers pass those values in (e.g. the
code prefix and stamps-for-reward), so tests can cover any shop's settings.

- `loyalty.test.js`: customer code generation and format check, next stamp
  count, reward ready. A known bug (short codes from a "round" random number)
  is written as the desired behaviour and marked `it.fails` with
  `[KNOWN BUG]`, the same pattern as the database layer's known holes below.

The database functions in `src/lib/customers.js` and `src/lib/staffAuth.js`
are covered by the smoke tests, which exercise them against a real database,
rather than by unit tests with a mocked Supabase.

## Database security tests (`tests/db/`)

`security.test.js` signs in as three kinds of user (an **anonymous app
visitor**, **Hugo staff** and **Daisy staff**) and tries reads and writes on
`tenants`, `staff_tenant` and `customers`. After each attempted write it reads
the row back with the service-role client, because Postgres row-level security
often blocks a write *silently* (0 rows changed, no error).

**Known holes.** Some rules the database *should* enforce but doesn't yet (the
anonymous `customers` policies on the "Before onboarding a 2nd client"
checklist in `developent-docs/white-label-progress.md`) are written as the
desired behaviour and marked `knownHole(...)`:

- Today they fail, and Vitest counts an expected failure as a **pass**, so the
  suite stays green.
- When a fix closes a hole, that test starts passing and Vitest **fails the
  run** ("expected test to fail"). Change `knownHole` back to `it` in the same
  PR as the fix.
- The anonymous-sign-in redesign is done when no `knownHole`s are left.

Files:
- `security.test.js`: the tests, grouped by table and by kind of user.
- `helpers.js`: test customers (`seedCustomer`), staff sign-in, cleanup, and
  `knownHole`.

## Smoke tests (`tests/smoke/`)

Playwright starts **two Vite dev servers**, both pointed at the scratch
project: Hugo on port 5181 and Daisy on port 5182 (`VITE_TENANT_SLUG`). It
runs every test once per shop; the Playwright *project* name is the shop slug.
The browser emulates a Pixel 7.

`journey.spec.js`:
- **Customer and staff journey:**
  1. Join.
  2. The QR code shows, and the card is saved under the right shop with 0
     stamps (database check).
  3. Edit the name.
  4. Staff stamp the card by typing its code.
  5. The customer's card updates live.
  6. Staff fill the card and redeem the reward.
  7. Log out, then rejoin with the same contact to get the same card back.
  8. Delete the account (database check that the row is gone).
- **Staff scanner** rejects a code from the other shop.

Staff use a **separate browser context**, like a separate device. In one
context a staff login would replace the customer's session, just as it would
on a real phone.

Files:
- `journey.spec.js`: the tests, as named `test.step`s.
- `support.js`: staff sign-in, locators for the staff customer list, cleanup.
- `global-setup.js` / `global-teardown.js`: clean up leftovers, create the
  staff accounts, and pass their credentials to the tests via env vars.
- `../../playwright.config.js`: the dev servers, shops, device, timeouts.

**Finding elements.** Tests use visible text, placeholders and roles where they
are unique. Where they aren't (the bottom-nav tabs and the account icon are
plain clickable `div`s and icons, and "Scan Code" appears twice), the app has
`data-testid` attributes (`nav-home`, `nav-scan`, …, `open-account`). Keep
those when moving components around.

**Retries and flaky tests.** Smoke tests retry once. A test that fails and then
passes is reported as **flaky**, not passed. Treat that as a signal, not noise.
Known case: the customer card's live update is occasionally missed (see "Bugs
found" in `developent-docs/refactor-plan.md`).

**When a smoke test fails**, Playwright keeps a screenshot and a full trace in
`test-results/` (git-ignored):

```
npx playwright show-report                     # HTML report of the last run
npx playwright show-trace test-results/<test>/trace.zip   # step-by-step replay
```

Re-running overwrites `test-results/`, so open the trace before running again.

Useful variants:

```
npx playwright test --project=daisy            # one shop only
npx playwright test -g "customer joins"        # one test by name
npx playwright test --headed                   # watch the browser
npx playwright test --repeat-each=5            # hunt for flakiness
```

## Shared support (`tests/support/scratch.js`)

Used by both layers: loads `.env.test.local`, applies the live-project guard,
and provides the anonymous and service-role Supabase clients, the
`hugo`/`daisy` tenant ids, and `ensureStaffAccount()`. This file deliberately
doesn't import Vitest or Playwright, so either can use it.

## Adding tests

- **New pure logic:** put it in `src/lib/` as a function that takes its inputs
  as parameters (no direct `clientConfig`/Supabase access), and test it in
  `tests/unit/`.
- **A new database rule:** add it to `tests/db/security.test.js` as the desired
  behaviour. If the database doesn't enforce it yet, use `knownHole` and add it
  to the checklist in `white-label-progress.md`.
- **A new flow or screen:** add a `test.step` to the journey, or a new `test`
  in `tests/smoke/`. Give customers a `smoke-…@test.local` contact so cleanup
  finds them.
- **A database change** (migration, policy): apply it to the scratch project
  first and run `npm test` before it goes anywhere near live.
