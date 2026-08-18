# Hugo Rewards

Loyalty scheme web app for Hugo's coffee shop — landing page, customer stamp card with QR code, and an owner dashboard with QR/camera scan-to-stamp. Backed by Supabase, so data persists for real and syncs live between the owner and customer views. Wrapped with **Capacitor** so it also runs as a real native Android app.

## 1. Create a Supabase project

1. Go to https://supabase.com, sign in, and create a new project (free tier is fine).
2. Once it's ready, open **SQL Editor** → **New query**, paste in the contents of `supabase-schema.sql` from this folder, and run it. This creates the `customers` table and turns on realtime sync.
3. Go to **Project Settings → API**. You'll need the **Project URL** and the **anon public** key.

## 2. Configure the app

```bash
cp .env.example .env
```

Open `.env` and paste in your Project URL and anon key from step 1.

## 3. Run it as a website (fastest way to test changes)

```bash
npm install
npm run dev
```

## 4. Run it as a real Android app (the demo to show customers)

Prerequisite: install [Android Studio](https://developer.android.com/studio) (free) — it bundles the Android SDK and an emulator, which aren't things I can install from here.

```bash
npm install
npm run build
npx cap sync android
npx cap open android
```

That last command opens the project in Android Studio. From there:
1. Let Gradle finish syncing (first time takes a few minutes)
2. Plug in an Android phone via USB with developer mode/USB debugging on (or use the built-in emulator)
3. Hit the green **Run ▶** button

The app installs and opens on the device like any other app — icon, full screen, no browser chrome. That's your demo build. Every time you change the code, repeat `npm run build && npx cap sync android` and hit Run again to update it.

## 5. Publishing to Google Play (once you're happy with the demo)

1. Create a Google Play Developer account (one-time $25 fee) at https://play.google.com/console
2. In Android Studio: **Build → Generate Signed Bundle / APK**, choose **Android App Bundle**, create a signing key (keep this file and its password safe — you need the same one for every future update)
3. Upload the resulting `.aab` file to a new app listing in Play Console, fill in store listing details (screenshots, description, privacy policy URL), submit for review
4. Google's review typically takes a few hours to a couple of days for a new app

I'd suggest holding off on this step until you've demoed the app to a few real customers/Hugo staff and made any tweaks — much cheaper to iterate now than after submitting.

## Notes / open items

- **Staff access is now behind a real login.** Tap the "Hugo" wordmark 7 times in the customer app to reach the PIN prompt, then sign in with a staff account. The database itself also enforces this — stamp updates require an authenticated session (see `supabase-schema.sql`), so this holds even if someone bypassed the app entirely.

  **Managing staff accounts:** rather than one account per employee, use a **single shared staff account** — this is deliberate, not a shortcut. A small shop's staff changes over time, and a shared login means turnover costs the owner nothing and needs no developer involvement:
  - **Set it up once**: Supabase dashboard → **Authentication → Users → Add user** — pick any email (doesn't need to be real/reachable, e.g. `staff@hugocoffee.com`) and a password. This becomes "the" staff login.
  - **New hire**: owner tells them the existing password. Nothing to create.
  - **Employee leaves**: owner goes to **Authentication → Users**, resets the password on that same account, and shares the new one with current staff. No account creation/deletion, no code changes, no contacting the developer.
  - **Trade-off worth knowing**: this means the database can't tell *which* staff member added a given stamp — only that "staff" did. Fine for a single small shop; if the owner later wants per-employee accountability (or has multiple locations), that's the point to move to individual accounts instead.
- **Camera QR scanning** currently uses the browser's built-in `BarcodeDetector`. Inside the native Android WebView this generally works on modern Android versions, but for full reliability across all devices, swapping in a proper Capacitor camera/barcode-scanning plugin (e.g. `@capacitor-mlkit/barcode-scanning`) would be worth doing before wide release — it uses the phone's native camera APIs directly instead of the web API.
  - Known quirk: on phones with 3+ rear cameras, the browser sometimes defaults to a macro or depth sensor instead of the main lens, which shows as a black feed even though the camera is genuinely active. The "Switch camera" button on the scan screen cycles through all detected cameras to find the right one — on one test device the correct camera was the 3rd or 4th in the list, not the 1st.
- The current database policies allow anyone with your anon key to read/write the `customers` table — fine for a single pilot shop, but worth tightening before scaling to multiple businesses.
- App icon and splash screen are Capacitor's defaults right now — easy to swap for Hugo's cow branding before the Play Store submission (`npx cap` has an assets-generation tool for this once you have a logo file).

