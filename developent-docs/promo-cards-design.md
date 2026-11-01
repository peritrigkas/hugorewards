# Promo cards and past cards: design

Status: **agreed** (2026-10-30). Database built and tested on scratch
(`supabase-promo-cards.sql`, `tests/db/promos.test.js`); applied to live
2026-10-31.
App screens built (2026-10-31); not yet released.

Built as designed, plus:
- Scanning a **full** card opens the customer view instead of stamping, so
  staff can redeem it there.
- The staff list marks a card that has a possible earlier card ("Earlier
  card?"); the hint and its button are in the customer view.
- "End now" makes yesterday the promo's last day (and its start, if it
  started today), so no more stamps today; full cards can still be claimed.
- **Waiting rewards** (2026-11-01, `supabase-waiting-rewards.sql`), see below.

## Waiting rewards

Agreed 2026-11-01, after testing Pretty Pretty: a full card used to refuse
more stamps until it was redeemed, so a customer who didn't claim lost
stamps.

- A full card stays as it is until staff either **Redeem** it or tap
  **+ Stamp, keep reward**. The stamp moves the full card to Past cards as
  **READY TO CLAIM · by <date>** and starts a new card with that stamp
  (plus any extra stamps an over-full card had).
- A waiting reward expires **6 months** (main card) or **1 month** (promo
  card) after it moved, then shows **EXPIRED**.
- Staff see "N to claim" in the list. Scanning a customer with a waiting
  reward opens their view (so staff can remind them before they pay), where
  each reward has its own Redeem. Redeeming it marks it **REDEEMED**.
- Customers see a "reward waiting" note above their active cards; waiting
  rewards come first in Past cards.
- Stored as `card_history` rows with `outcome = 'ready'` and `claim_by`;
  `redeem_reward(reward)` turns one into `'redeemed'`. Expired ones aren't
  stored as such, like expired promo cards.
- Full promo cards left at the end of a promo keep their claim window, as
  before.

## Summary

Each shop has two kinds of stamp card:

- **Main card.** Permanent, as today. The shop decides what earns a stamp.
- **Promo card.** Optional, for one product at a time (waffles, milkshakes,
  protein bowls...), with an end date. Staff set it up in the app.

Every finished card is kept in a **Past cards** tab, stamped **REDEEMED** or
**EXPIRED**.

Customers keep **one QR code**. Staff choose which card gets the stamp.

## Decisions so far

| # | Decision | Notes |
|---|---|---|
| 1 | One main card, whose meaning is up to the shop | Shown on the card as a line such as "1 stamp per hot drink" |
| 2 | At most one promo running at a time, with a start and end date | The next promo can be scheduled ahead; promos can't overlap |
| 3 | Any staff login can manage promos | No separate owner role for now |
| 4 | After a promo ends, a **full** card can be claimed for **14 days** | Unfinished stamps expire when the promo ends |
| 5 | Redeemed and expired cards go to **Past cards**, with a REDEEMED / EXPIRED mark | This applies to the main card too |
| 6 | Promo cards with no stamps are not kept as past cards | Avoids clutter |
| 7 | One QR per customer; staff pick the card | Scanning opens the customer view, or uses the "scans add to" switch |
| 8 | "New promo" banner the first time a customer opens the app during a promo | **Default, not yet confirmed**; cheap to drop |

## Promo lifecycle

| Phase | When | Customer sees | Staff can |
|---|---|---|---|
| Scheduled | before start date | nothing | edit everything, delete |
| Running | start date to end date | promo card under the main card | add stamps, redeem full cards, edit name/icon/end date, "End now" |
| Claim window | end date + 14 days | **full** cards only, with "Ended, claim your free X by <date>" | redeem full cards |
| Finished | after that | Past cards: REDEEMED or EXPIRED | view |

Rules:

- **Stamps needed** is locked once any customer has a stamp on the promo,
  so nobody's progress changes under them.
- A promo can be **deleted** only while nobody has stamps on it.
- Each promo keeps its own stamps. Nothing carries over to the next promo.
- Dates are in the shop's local time. Add `config.timezone`, default
  `Europe/London`. The database decides whether a promo is running, so a
  phone with the wrong clock can't change it.

## What the customer sees

**Home:** the main card as today. While a promo is running (or claimable),
the promo card appears underneath it.

**Promo card:** uses the standard circle layout, because the cow card only
fits exactly 9 stamps. It has its own number of circles and its own icon,
with these extras:

- a gold "LIMITED TIME" band
- the product name
- the end date and days left

```
┌─ LIMITED TIME ─────────── ends 30 Nov ┐
│  Waffle month                         │
│   (🧇) (🧇) ( ○ ) ( ○ )   [🎁 free]     │
│   2 of 4 · 5th free · 26 days left    │
└───────────────────────────────────────┘
```

Icons are picked from the existing list (`STAMP_ICONS`). Add a few food icons
from lucide: cake, sandwich, salad, pizza and a soda cup. lucide has no
waffle icon.

**Loyalty card screen tabs:** "Active (n)" and "Past cards". Today the second
tab is a "Non-Active" placeholder.

- **Active:** the main card, plus the promo card if running or claimable.
- **Past cards:** newest first. Each is a frozen, slightly greyed copy of the
  card, with a diagonal mark:
  - **REDEEMED · 12 Nov**, in the shop's colour, for main or promo cards
    staff redeemed.
  - **EXPIRED · 30 Nov**, in grey, for promo cards with at least one stamp
    that weren't redeemed. Unfinished cards expire at the end date; full
    cards expire at the end of the claim window.

**New-promo banner** (decision 8): "New: Waffle month! Every 4 waffles, the
5th is free." It shows once per promo and is dismissed on tap. The dismissal
is remembered on the phone.

## What staff see

**Customer list:** one compact line per customer, for example "Peri ·
HUGO-2XAZK · ☕ 5/9 · 🧇 2/4". Tapping a line opens the customer view. No
action buttons in the list itself.

**Customer view.** Scanning a QR code, typing a code, or tapping a list line
all open this view:

```
← Peri                     HUGO-2XAZK
☕ Main card    ●●●●●○○○○  5/9   [ + Stamp ]
🧇 Waffle month ●●○○       2/4   [ + Stamp ]   ends 30 Nov
Possible earlier card: ...       [ Add its stamps here ]
Move stamps
```

- A full card shows **Redeem** instead of **+ Stamp**.
- The earlier-card hint and **Move stamps** move here from the list.

**"Scans add to" switch.** It appears only while a promo is running:

```
Scans add to:  [ Main card ]  [ Waffle month ]  [ Ask me ]
```

- **Main card** or **promo:** each scan adds a stamp to that card straight
  away and shows a confirmation, as fast as today.
- **Ask me:** each scan opens the customer view.
- The choice is remembered on the device.
- With no promo running there's only one card, so scanning stamps the main
  card straight away, exactly as today.

**Promo page** (staff menu → Promo):

- Lists the current, upcoming and past promos.
- Form fields: product name, icon, stamps needed (1–20), start date, end
  date.
- Buttons: Save, End now, Delete (only when allowed).
- Past promos show how many rewards were redeemed. This comes from the
  history table at no extra cost.

## Data model

New tables, all with RLS:

**`promos`**: one row per promo.

| column | |
|---|---|
| `id` uuid | |
| `tenant_id` uuid | the shop |
| `name` text | "Waffle month" |
| `icon` text | key into `STAMP_ICONS` |
| `stamps_for_reward` int | 1–20 |
| `starts_on`, `ends_on` date | `ends_on >= starts_on` |
| `claim_days` int | default 14 |

- No two promos in the same shop may have overlapping date ranges, enforced
  by an exclusion constraint (`btree_gist`), which is safe even when two
  staff save at the same moment.
- A trigger locks `stamps_for_reward` and blocks deletes once
  `promo_stamps` has rows for the promo.

**`promo_stamps`**: one row per customer per promo, created on the first
stamp.

| column | |
|---|---|
| `customer_id` uuid | FK `customers`, on delete cascade |
| `promo_id` uuid | FK `promos` |
| `stamps` int | |

Primary key: (`customer_id`, `promo_id`).

**`card_history`**: one row per redeemed card.

| column | |
|---|---|
| `id` uuid | |
| `customer_id` uuid | FK, cascade |
| `tenant_id` uuid | |
| `promo_id` uuid | null for the main card |
| `card_name`, `icon` | snapshot taken at redemption |
| `stamps_for_reward`, `stamps` | snapshot taken at redemption |
| `outcome` text | `'redeemed'`, or `'ready'` for a waiting reward |
| `claim_by` timestamptz | waiting rewards only: when it expires |
| `finished_at` timestamptz | |

Expired cards are **not stored**. They are `promo_stamps` rows (with
stamps > 0) whose promo has passed its end date (unfinished) or its claim
window (full). Redeeming a promo card deletes its `promo_stamps` row, so
anything left behind has expired. The Past cards tab merges both lists.

**Main card stamps** stay in `customers.stamps`, which is unchanged.

### Access rules

| Table | Customers (anonymous accounts) | Staff of the shop | Others |
|---|---|---|---|
| `promos` | read | read, create, edit (within the rules above) | read (it's public shop info, like branding) |
| `promo_stamps` | read own | read; write only via the functions below | none |
| `card_history` | read own | read own shop's | none |

### Database functions

Security definer, staff of the card's shop only:

- **`add_stamp(card_code, promo)`**, returning the card's new stamp count
  - `promo` null means the main card. Its stamps needed come from
    `config.loyalty.stampsForReward`, default 9 as in the app.
  - Promo stamps only while the promo is running, in shop time.
  - On a full card (or one over it, possible after moving stamps), moves one
    full card to `card_history` as a waiting reward and starts a new card
    (see Waiting rewards). Before 2026-11-01: never above
    `stamps_for_reward`.
- **`redeem(card_code, promo)`**
  - The card must be full.
  - The main card's history entry is named after the shop (`brand_name`)
    with the shop's stamp icon.
  - In one transaction: write the `card_history` snapshot, then reset the
    main card to 0 or delete the `promo_stamps` row.
  - Promo cards can be redeemed during the run and the claim window.
- **`move_card`** (existing) also:
  - adds promo stamps per promo (not capped, so none are lost)
  - moves `card_history` rows onto the new card

Promo stamps and redemptions also touch the customer's row, so the live
updates the app already listens to (on `customers`) fire for promo cards too.

The main card's "+ Stamp" moves from a direct table update to `add_stamp`,
so both cards follow one path. The column guard on `customers` stays.

## Compatibility and rollout

- The migration is **additive**, so apps 1.0.3 and 1.0.4 keep working.
  They don't know about promos, and their Redeem still resets stamps
  directly, just without a history record. That's acceptable while they're
  being replaced.
- The app changes ship in the next release (1.0.5 or later). Steps:
  1. Apply the migration on scratch and run the tests.
  2. Apply it on live.
  3. Release the app.
- Optional: once everyone is on the new app, stop staff writing
  `customers.stamps` directly, so every redemption is recorded.

## Tests

**Unit**
- Promo phase from dates and shop time zone: scheduled, running, claim
  window, finished, including boundary days.
- Past-cards merge and ordering.

**Database (scratch)**
- Customers:
  - read promos
  - read only their own promo stamps and history
  - can't add stamps, redeem, or write history
- Staff:
  - only their own shop's promos
  - can't stamp a promo that isn't running
  - can't redeem a card that isn't full
  - redeem writes history and resets the card in one step
  - claim window allowed for full cards only
  - stamps-needed locked and delete blocked once stamps exist
  - overlapping promos refused
- `move_card` carries promo stamps and history across.

**Smoke**
1. Staff create a promo.
2. The customer sees the card and the banner.
3. Staff stamp both cards from the customer view, and through the "scans
   add to" switch.
4. Staff redeem.
5. Past cards shows REDEEMED.

Plus: an ended promo shows EXPIRED, and a full card stays claimable during
the claim window.

## Later, not in this design

- A product photo on each promo (needs image upload and storage).
- Push notifications for new promos.
- An owner role that limits promo management.
- Points per £ as an alternative mode.
- Automatic stamps from a till or card reader.
