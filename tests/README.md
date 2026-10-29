# Tests

Automated tests for Hugo Rewards and the multi-tenant (white-label) backend.
All of them run against the **scratch** Supabase project ("Hugo White-Label
Scratch", ref `fjclbclxdecxqiqvbfhj`), never the live Hugo project.

| Layer | What it checks | Tool | Command | Where | Runtime |
|---|---|---|---|---|---|
| **Unit** | Pure logic: customer codes, stamp/reward maths | Vitest | `npm run test:unit` | `tests/unit/` | <1s |
| **Database security** | Who can read and change what in the shared database (row-level security) | Vitest + supabase-js | `npm run test:db` | `tests/db/` | ~12s |
| **Smoke (end-to-end)** | The main customer and staff flows in a real browser, for each shop | Playwright | `npm run test:smoke` | `tests/smoke/` | ~70s |

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

4. In the scratch project's dashboard: **Authentication → Sign In /
   Providers → "Allow anonymous sign-ins"** on (customers sign in
   anonymously), and **Authentication → Rate Limits → anonymous sign-ins**
   raised to about 300/hour. Each full run creates a few dozen anonymous
   accounts, and the default 30/hour would block repeated runs.

No staff passwords or test data need setting up; the tests create their own.

## Safety rules (all layers)

- Tests read only `SCRATCH_*` variables, so the live project's `VITE_*` keys
  in `.env` can't leak into a run.
- `tests/support/scratch.js` **refuses to run** if the URL is the live project.
- The service-role key is used only for setup, cleanup and checking results.
  The behaviour under test always runs as a visitor, a customer's anonymous
  account or a signed-in staff member, just like the real app.
- Test staff accounts get a **new random password every run**, so no password
  is stored anywhere. Each layer has its own accounts (`rls-test-staff-…`,
  `smoke-staff-…@test.local`), so running both at once is safe.
- Every row a test creates is tagged and deleted before and after the run:
  customer codes starting `RLSTEST-` (database layer), contacts matching
  `smoke-…@test.local` (smoke layer). A crashed run is cleaned up by the next.
- Anonymous customer accounts are deleted after each run: the database layer
  deletes the ones it created; the smoke layer deletes every anonymous account
  created since its run started. So run the two layers **one after the other**
  (as `npm test` does), not at the same time.

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

`security.test.js` acts as every kind of user and tries reads and writes on
`tenants`, `staff_tenant` and `customers`, plus the `contact_has_other_card`
and `move_card` database functions:

- a **visitor with no session**: gets nothing from `customers`;
- **customers**: anonymous accounts, as the app creates on joining
  (`signInCustomer()`), each with their own card or none;
- **Hugo staff** and **Daisy staff**.

After each attempted write it reads the row back with the service-role client,
because Postgres row-level security often blocks a write *silently* (0 rows
changed, no error).

**Known holes.** A rule the database *should* enforce but doesn't yet is
written as the desired behaviour and marked `knownHole(...)`:

- While the hole is open, the test fails, and Vitest counts an expected failure
  as a **pass**, so the suite stays green.
- When a fix closes the hole, the test starts passing and Vitest **fails the
  run** ("expected test to fail"). Change `knownHole` back to `it` in the same
  PR as the fix.

There are **none right now**: anonymous sign-in closed the original nine.

Files:
- `security.test.js`: the tests, grouped by table and by kind of user.
- `helpers.js`: test customers (`seedCustomer`), customer and staff sign-in,
  cleanup, and `knownHole`.

## Smoke tests (`tests/smoke/`)

Playwright starts **two Vite dev servers**, both pointed at the scratch
project: Hugo on port 5181 and Daisy on port 5182 (`VITE_TENANT_SLUG`). It
runs every test once per shop; the Playwright *project* name is the shop slug.
The browser emulates a Pixel 7.

`journey.spec.js`:
- **Customer and staff journey:**
  1. Join.
  2. The QR code shows, and the card is saved under the right shop with 0
     stamps and linked to the phone's account (database check).
  3. Edit the name.
  4. Staff stamp the card by typing its code.
  5. The customer's card updates live.
  6. Log out (still logged out after reopening the app), then log back in:
     same card, same stamps.
  7. **New phone:** joining with the same contact (different capitalisation)
     shows the "already have a card" banner.
  8. Staff see "Possible earlier card" on the new card and tap **Move it
     here**. The new phone switches live to the old card and stamps; the old
     phone no longer has a card.
  9. Staff fill the card and redeem the reward.
  10. Delete the account (database check that the row is gone).
- **Secret staff entrance:** 7 taps on the shop name open the PIN prompt; a
  wrong PIN keeps it open, the right one (bundled `staffPin`) leads to staff
  sign-in, which warns that this device holds a customer card.
- **Staff on a customer device:** after signing in as staff and leaving staff
  mode, the customer screens show "Signed in as staff" until staff sign out.
- **Staff scanner** rejects a code from the other shop.

Each "phone" (customer, new phone, staff device) is a **separate browser
context** with its own anonymous account or staff login. A device holds one
login at a time, just like a real phone.

Files:
- `journey.spec.js`: the tests, as named `test.step`s.
- `support.js`: joining as a customer, staff sign-in, locators for the staff
  customer list, cleanup.
- `global-setup.js` / `global-teardown.js`: clean up leftovers, create the
  staff accounts, pass their credentials to the tests via env vars, and delete
  the run's anonymous accounts afterwards.
- `../../playwright.config.js`: the dev servers, shops, device, timeouts.

**Finding elements.** Tests use visible text, placeholders and roles where they
are unique. Where they aren't (the bottom-nav tabs and the account icon are
plain clickable `div`s and icons, and "Scan Code" appears twice), the app has
`data-testid` attributes (`nav-home`, `nav-scan`, …, `open-account`,
`brand-title`, and `customer-row-<code>` on each staff list row).
Keep those when moving components around.

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
