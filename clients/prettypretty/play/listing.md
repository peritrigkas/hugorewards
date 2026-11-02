# Pretty Pretty: Play Console listing

Everything to paste into Play Console for `com.prettypretty.rewards`.
Graphics are in this folder. Prepared 2026-11-01.

**Before production:** the phone number (020 7946 0123) and the postcode
("London AB1 2CD") are still placeholders, and `6-find-us.png` shows them.
Use internal testing until they're real, then retake that screenshot.

## Main store listing

| Field | Value |
|---|---|
| App name (30 max) | Pretty Pretty Rewards |
| Short description (80 max) | Your Pretty Pretty loyalty card: a heart every visit, and your 10th is on us. |
| App icon (512×512) | `icon-512.png` |
| Feature graphic (1024×500) | `feature-graphic.png` |
| Phone screenshots (2–8, 1080×2160) | `screenshots/1-home.png` … `6-find-us.png`, in that order |
| Category | Beauty |
| Contact email | *your choice: the salon's, or yours as with Hugo* |
| Privacy policy URL | where `legal/prettypretty-privacy-policy.html` is hosted (replace `[CONTACT EMAIL]` in both legal pages first) |

### Full description (4000 max)

```
Pretty Pretty Rewards is the loyalty card for Pretty Pretty nail salon, right on your phone.

COLLECT HEARTS
Get a heart on your card every time you visit. After 9 visits, your 10th treatment is on us.

NEVER LOSE A REWARD
Not ready to use your free treatment yet? Keep collecting. Your reward waits for you in Past cards until you claim it.

ONE CODE, NO PAPER
Just show your code at the desk. Staff scan it and your heart appears straight away. No paper card to lose, no app login to remember.

EVERYTHING IN ONE PLACE
• Your loyalty card and progress at a glance
• Our services: manicures, Gel & BIAB, acrylics and extensions, nail art and pedicures
• Opening hours, address and contact details
• Special promo cards when we run limited-time offers

Join in seconds with just your name and a phone number or email. No payment details, ever.
```

## App content (Policy → App content)

- **Privacy policy:** URL above.
- **Ads:** No, the app doesn't contain ads.
- **App access:** "All or some functionality is restricted." Customer
  features need no login. Staff features (adding stamps, redeeming) are
  hidden: tap the shop name 7 times on the home screen, enter PIN 7316, then
  sign in. Give reviewers a staff login you're happy for Google to use: the
  existing `staff@prettypretty.com`, or a separate review account (ask
  Claude to link it).
- **Content rating:** questionnaire category "All other app types". Answer
  No to violence, sexual content, language, controlled substances and
  gambling. Users don't interact with each other or share content, and the
  app doesn't share location. Expected result: Everyone / PEGI 3.
- **Target audience:** 18 and over is the simplest choice (13+ is also fine;
  the policy says the app isn't for under-13s). Not designed for children.
- **News app / Government app / Financial features / Health:** No.

### Data safety

Use the same answers as Hugo (same app, same backend):

- Collects or shares user data: **Yes**. Encrypted in transit: **Yes**.
- Account creation: users can create an account. Deletion: in the app
  (Account → "Delete my account and data"), plus the web page
  `legal/prettypretty-data-deletion.html`.
- Data types, all **collected, not shared**, processed for **app
  functionality** and **account management**, and **required**:
  - Personal info → **Name**
  - Personal info → **Email address** and **Phone number** (the customer
    enters one or the other)
  - App activity → **App interactions** (stamps, redeemed and waiting
    rewards)
- Fraud prevention: the sign-up bot check (Cloudflare Turnstile) checks the
  device/browser. Cloudflare and Supabase act as service providers, which
  Play doesn't count as "sharing".
- Not collected: location, photos, contacts, files, payment info. The camera
  is used only by staff to scan QR codes; nothing is stored.

## Release

- Track: **Internal testing** first (add testers' emails). No review wait.
- App signing: let Google manage the app signing key (Play App Signing);
  upload with a **new upload key for Pretty Pretty**, not Hugo's.
- Version: the bundle uses the shared `android/` version (1.0.6, code 7
  today). Fine for a first upload; each later Pretty Pretty upload needs a
  higher versionCode.
- Release notes: "First release of Pretty Pretty Rewards."
