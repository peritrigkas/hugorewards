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
| Privacy policy URL | https://peritrigkas.github.io/hugorewards/legal/prettypretty-privacy-policy.html (live once this PR is merged: GitHub Pages serves master) |

### Full description (4000 max)

```
Pretty Pretty Rewards is the official loyalty app for Pretty Pretty nail salon. Collect a heart every time you visit, watch your card fill up, and enjoy a free treatment on us. No paper cards, no passwords, no fuss.

COLLECT HEARTS, GET PAMPERED
Every visit earns you a heart on your loyalty card. Collect 9 hearts and your 10th treatment is free. Whether you come in for a quick manicure, a fresh set of acrylics or a gel infill, every visit counts.

SEE YOUR HEART APPEAR INSTANTLY
Show your code at the desk and our team scans it. Your new heart appears on your phone straight away, so you always know exactly where you are. Your progress is shown at a glance on the home screen: how many hearts you have, and how many to go until your next treat.

YOUR REWARD WAITS FOR YOU
Card full but not ready to use your free treatment today? No problem. Keep collecting as normal. Your full card moves to Past cards marked READY TO CLAIM, and a fresh card starts with your next visit. Just let us know when you'd like to use it. You have 6 months to claim each reward, and the app shows you the date.

SPECIAL PROMO CARDS
From time to time we run limited-time offers with their own promo cards. They appear in the app automatically, alongside your main card, so you'll never miss one. Each one tells you how many visits it needs and when the offer ends.

ALL YOUR CARDS IN ONE PLACE
Your active cards, your rewards waiting to be claimed and every card you've finished and redeemed are all kept together, so you can look back on every visit.

ONE CODE, NO PAPER
Your personal code and QR code live in the app. No more lost or forgotten stamp cards, and nothing to print or carry.

DISCOVER OUR SERVICES
Browse everything we offer, with photos:
• Manicures: shape, cuticle care and a classic polish finish
• Gel & BIAB: long-lasting colour or strengthening Builder Gel
• Acrylics & extensions: full sets and infills in the length and shape you love
• Nail art: hand-painted designs, chrome, French tips and gems
• Pedicures: soak, scrub and polish

FIND US
Our address, opening hours for every day of the week and our phone number are all in the app, so booking your next appointment is quick and easy.

JOIN IN SECONDS
Sign up with just your name and a phone number or email address. There's no password to remember and we never ask for payment details. You stay signed in on your phone, ready for your next visit.

YOUR DATA, YOUR CHOICE
We only keep what's needed to run your loyalty card: your name, your contact detail and your visits. You can delete your account and all its data at any time, right from the app.

Download Pretty Pretty Rewards, show your code on your next visit and start collecting hearts today. We can't wait to see you.
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
