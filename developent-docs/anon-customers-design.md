# Design: Anonymous Customer Sign-In

**Status:** Agreed 2026-10-29 (decisions at the end). Built and tested on the scratch project; live rollout pending (see Rollout). Closes the "Scope the anon
`customers` policies by tenant" item on the "Before onboarding a 2nd client"
checklist in `white-label-progress.md`.

**Done when:** the 9 `knownHole`s in `tests/db/security.test.js` pass as
normal tests, the smoke tests pass with the new flows, and it's applied to the
live project together with a new app release.

## Problem

Customers never log in, so the database sees every customer as the same
anonymous visitor holding the app's public key. The current rules let that
visitor read, edit, move between shops and delete **any** customer in **any**
shop, sign up with stamps already on the card, and find anyone's card by their
phone number or email. A saved customer code on the phone is the only proof of
"this card is mine", and it's enforced by the app, not the database.

## Approach: Supabase anonymous sign-in

On first launch the app calls `supabase.auth.signInAnonymously()`. That gives
the phone an invisible account (a user id, no email or password) that Supabase
keeps signed in, like the staff login. The customer row records that id, and
the database rules only let a user touch the row with their own id.

- No change for customers: no password, no email, same join screen.
- Each app install (or browser profile) is its own account. Two shops' apps on
  one phone are separate installs, so they are separate accounts.
- Anonymous users have the `authenticated` role (like staff) with
  `is_anonymous = true` in their token. Staff are told apart by their
  `staff_tenant` mapping, as today.

### Database changes

**`customers` table**
- New column `user_id uuid references auth.users on delete set null`.
- Unique `(tenant_id, user_id)`: one card per account per shop.

**Rules (RLS), replacing all four current anonymous-visitor policies**

| Who | Read | Join (insert) | Edit | Delete |
|---|---|---|---|---|
| Not signed in | nothing | nothing | nothing | nothing |
| Customer (anonymous account) | own card only | own card only (`user_id = auth.uid()`), **0 stamps**, must name a shop | own card, **name and contact only** | own card |
| Staff | own shop's customers (unchanged) | own shop (unchanged) | own shop (unchanged) | none (unchanged) |

Postgres rules work on rows, not columns. So a small **guard trigger** blocks
changes to `stamps`, `tenant_id`, `code` and `user_id` unless the caller is
staff of that shop. That's what stops a customer from editing their own stamps.

**The temporary `customers_default_tenant` trigger is dropped** in the same
migration. Signups without a shop are then rejected (known hole 9).

### What the customer types: unchanged

The join screen stays **name + phone or email**, typed once. No username, no
password, no email verification.

- **Name:** only for display (greeting, staff list). Never checked;
  editable in My Account.
- **Phone or email:** no longer a key to the card. It is only used to spot a
  likely returning customer on a new phone (below), and later for email
  restore.
- **Today**, typing *any* name with an existing number hands over that
  number's card. That is known hole 4, and it goes away.

### Log out and log back in, same phone: same card

**Log out** only hides the card on this phone. It does **not** sign the
phone's anonymous account out. The logged-out screen offers **Log back in**,
which opens the same card with the same stamps, with nothing to type.

- One phone = one account = one card per shop. Joining a second card on the
  same phone isn't possible.
- **Delete my account and data** deletes the card. The phone can then join
  again with a fresh card.

### New phone / reinstall: staff "move card"

A customer who reinstalls, clears the app's data or gets a new phone starts
with a fresh, empty card. (Android's backup restore *may* bring the sign-in
back, but that can't be relied on.)

- **Join screen note, always shown:** "Had a card on another phone? Staff can
  move it to this one." This replaces "Already joined? Enter the same phone or
  email to get your card back." Later it gains "…or restore it by email".
- **After joining, if the contact matches another card in this shop:** a
  banner on the new card says "Looks like you already have a card with us.
  Show this screen to staff to move your stamps to this phone." It reveals
  nothing about the old card. The check is a security-definer function
  `contact_has_other_card(tenant_id, contact)` that returns only true/false.
  - Accepted trade-off: someone could learn whether a number belongs to a
    customer of the shop.
- **Matching** ignores case, spaces, dashes, dots and brackets, so
  "07827 421616" matches "07827421616". The rule is defined once in SQL
  (`private.normalize_contact`) and mirrored in `src/lib/loyalty.js`, where it
  is unit-tested.
- **Staff dashboard:** a card whose contact matches an older card in the shop
  shows "Possible earlier card: <name> · <n> stamps" with **Move card**.

**Moving a card:**

1. Customer joins on the new phone, getting a new empty card.
2. Staff tap **Move card** on the flagged row, or on any old card and scan or
   type the new card's code.
3. The database function `move_card(old_code, new_code)` (security definer,
   only for staff of the shop both cards belong to) moves the old card to the
   new phone's account and deletes the new empty card. The customer keeps the
   old card's code, stamps and name.

The new phone sees its card change live and shows the old card.

Email-code restore, for a new phone without visiting the shop, is a planned
follow-up. Even then it would be used only when changing phones, never on
normal launch.

### App changes

- `src/lib/customerAuth.js` (new): `ensureCustomerSession()` signs in
  anonymously if there's no session.
- `src/lib/customers.js`:
  - `getMyCustomer()` replaces lookup-by-saved-code.
  - `createCustomer` sets `user_id`.
  - `findCustomerByContact` is removed.
  - The live subscription follows the user's own row instead of a code.
  - Adds `moveCard(oldCode, newCode)` for staff.
- `src/lib/savedCode.js` is removed: the session is the "saved card" now.
- `useCustomer`:
  - Starts the anonymous session.
  - Log out / log back in hide and show the card without signing out.
  - Exposes the "already have a card" flag.
- `OwnerApp`: the possible-earlier-card flag and a **Move card** action on
  each customer row.
- **One login per device.**
  - If staff are signed in on the device, the customer screens show "Signed
    in as staff on this device" with a sign-out button, instead of quietly
    acting as staff, which is what happens today.
  - The staff sign-in screen warns when the device holds a customer card,
    since signing in as staff ends that phone's customer account. The card
    stays recoverable by Move card.
  - Shop devices and customer phones stay separate.

### Abuse protection

Anyone can create anonymous accounts, so:

- Supabase's per-IP rate limit for anonymous sign-ins stays on (default 30 per
  hour). The scratch project needs it raised, or the test suite will hit it.
- **CAPTCHA (Turnstile/hCaptcha) on first launch: recommended before real
  customers, but not in this change.** It needs a provider account and keys
  per app, so it's a separate small PR.
- Anonymous accounts with no card pile up in `auth.users`; a periodic cleanup
  can come later.

### Tests

- **Database:** a not-signed-in visitor, customer A, customer B (both
  anonymous), Hugo staff and Daisy staff. All 9 `knownHole`s become normal
  tests. New tests cover: customer can read, edit and delete only their own
  card; can't edit their own stamps; `move_card` works for staff of the shop
  and is refused for other shops and for customers. Test anonymous accounts
  are deleted after each run.
- **Smoke:** the rejoin step becomes the move-card flow (customer on a "new
  phone" joins, staff move the old card, the new phone shows the old stamps).
  A new step covers the staff-signed-in-on-this-device notice.

## Rollout

1. Build and test on the **scratch** project. Turn on anonymous sign-ins
   there first: Dashboard → Authentication → Sign In / Providers → "Allow
   anonymous sign-ins", and raise the anonymous rate limit.
2. Ship as one PR: migration SQL file + app + tests.
3. Go live together:
   1. Turn on anonymous sign-ins on the live project.
   2. Delete the test customers.
   3. Apply the migration.
   4. Release Android **1.0.3**.

   **Every older app version stops working at step 3**, including 1.0.2
   (now in Play review), because those versions talk to the table as the
   not-signed-in visitor. That's acceptable only because all current
   customers are test data.

## Decisions (2026-10-29)

| # | Decision | Why |
|---|---|---|
| 1 | **New phone:** staff "move card" now; **email-code restore later** | Free and secure, and fits a shop where the customer is at the counter. Rejoin-by-contact was an open hole |
| 2 | **CAPTCHA:** separate follow-up PR before real customers | Needs a provider account and keys; the per-IP anonymous rate limit stays on meanwhile |
| 3 | **Log out keeps the phone's account:** log back in on the same phone gives the same card and stamps, with nothing to type | "It's just a card, not real money"; verifying an email on every login would be annoying. The phone is the proof |
| 4 | **"Already have a card" banner after joining**, plus the staff-side flag | Tells a returning customer on a new phone what to do. Reveals only that a matching card exists, never its contents |
| 5 | **Live rollout may break 1.0.2 and older** | All current customers are test data |
