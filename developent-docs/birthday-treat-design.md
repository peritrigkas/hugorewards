# Birthday treat: design

Status: **agreed** (2026-11-02). Database built and tested on scratch
(`supabase-birthday-treats.sql`, `tests/db/birthday.test.js`); not on live yet.
App screens built; not yet released.

Every shop's config has a birthday gift (`gift.title` / `gift.body`, e.g.
Hugo's "Birthday Coffee"), but until now the app never asked for a birthday,
so staff had to take the customer's word for it.

## Rules

- **Where:** customers add their birthday in **My Account** (not on the Join
  screen, so joining stays quick). My Gifts links there when none is saved.
- **What:** day and month only. No year, so no age is stored.
- **Saves:** a customer can save a birthday **twice**. The second save locks
  it. Removing it doesn't count as a save, so save → remove → save also locks
  it. Saving the date that's already there doesn't count either. After the
  lock, only staff can change it.
- **Staff** can always add or correct a birthday from the customer view.
  That doesn't count as one of the customer's saves.
- **Birthday week:** the birthday and the 6 days after it. A week that starts
  in late December runs into January. 29 February is the 28th in other years.
- **Counts straight away:** a birthday saved today can be used today.
- **Once a year:** staff redeem the treat during the birthday week, once per
  birthday year (the year the week starts in).

## Screens

Customer:
- My Account: day and month pickers, "Save birthday", then "Save and lock
  birthday" for the last save, "Remove birthday"; after the lock, "🔒 12
  March" and "ask staff to correct it".
- Home: a "🎂 Happy birthday!" banner during the birthday week until the
  treat is redeemed, and the Gift List count shows 1.
- My Gifts: the treat's status: add your birthday / ready from–to / ready
  until / enjoyed this year.

Staff:
- The list shows a **🎂 Birthday** badge during the birthday week.
- A scan stamps as usual; during the birthday week (treat not redeemed yet)
  it then opens the customer view with "It's their birthday week: give them
  their {gift}!".
- The customer view shows the birthday (Add / Correct, and whether it's
  locked for the customer) and, during the week, the treat with **Redeem**.

## Database

`supabase-birthday-treats.sql`:
- `customers.birthday_month`, `birthday_day` (both or neither, a real date)
  and `birthday_saves` (0–2).
- `private.guard_customer_write()` now lets customers change their birthday,
  counts the saves itself (the app can't set the count) and refuses changes
  once locked. Staff of the shop, the service role and direct SQL are not
  limited.
- `birthday_treats`: one row per treat given, unique per customer per year.
  Read-only from the app: customers read their own, staff their shop's.
- `redeem_birthday_treat(card_code)`: staff of the card's shop, during the
  birthday week in the shop's time zone, once a year. Touches the customer's
  row so both apps update live.
- `move_card` also moves the birthday (the new card keeps its own if it has
  one) and the treats (except for a year the new card already has).

Additive: apps up to 1.0.6 don't send the new columns and keep working; they
just don't show the birthday.

## Privacy

The privacy policy and data-deletion pages (Hugo and Pretty Pretty) list the
optional birthday and birthday treats. In Play's data safety form, add
Personal info → **Other info**: collected, not shared, app functionality,
optional.
