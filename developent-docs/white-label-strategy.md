# Hugo Rewards → White-Label Platform: Strategy & Options

**Date:** 2026-09-04
**Status:** Draft for discussion
**Author:** Claude Code, with ptrigkas@gmail.com

## 1. Where the project stands today

- Single React SPA (`src/App.jsx`, ~1,240 lines) with **all** branding (name, copy, colors,
  images, menu items, contact details) hardcoded inline as JSX/strings.
- One Supabase project/database, one `customers` table, RLS policies scoped to a single
  shared staff login (see `README.md`).
- One Capacitor/Android shell with a fixed `appId: com.hugo.rewards`, `appName: Hugo Rewards`,
  and one set of icon/splash assets in `/assets`.
- No concept of "tenant" anywhere in the schema, the app, or the build — the entire codebase
  currently *is* Hugo's instance.

Turning this into a white-label product means introducing a **tenant/client concept** at three
layers that are currently fused together: the **content/config** (brand, copy, menu), the
**data** (Supabase project/table/RLS), and the **distribution** (the Android app you hand to
each client). The solutions below are different ways of splitting those three layers apart.

## 2. What "customisable" should probably include

Grouped so it's easier to scope a v1 vs. later phases.

**Brand identity**
- Brand name / display name, tagline / motto phrases (rotating or fixed)
- Logo (header), app icon, splash screen image
- Primary/secondary/accent colors, light/dark variants
- Font choice (optional — most white-label products skip this at first)

**Content**
- Business description / "About" text
- Contact details: phone, email, address, opening hours, social links
- Food & drinks menu (items, prices, categories, images, availability toggle)
- Terms/legal text, privacy policy link

**Loyalty programme mechanics** (not explicitly asked for, but usually the next request)
- Stamps required for a reward (currently presumably fixed)
- Reward description ("free coffee" vs. something else)
- Points-based vs. stamp-based scheme toggle
- Multiple reward tiers

**Operational**
- Staff login credentials (already per-shop via Supabase Auth — needs to become per-tenant)
- Multiple locations per client (optional, later phase)
- Currency / locale / date format

**Distribution**
- Android `appId`, app display name, icon/splash — needed only if each client gets their **own**
  installable app rather than sharing one multi-tenant app
- Custom domain per client (if web is also offered standalone)

**Nice-to-have / later**
- Notifications (push) per tenant
- Analytics dashboard per tenant
- Self-serve "theme editor" UI for the client to tweak their own branding without a developer

## 3. Solution options

The three options below are not mutually exclusive — B is really "A done properly," and C is a
distribution-layer decision that sits on top of either A or B. Read it as: **pick a data/config
architecture (A or B)**, then **separately decide a distribution model (C-lite or C-full)**.

---

### Option A — Config-driven single codebase, one deploy per client

Each client gets their own build, produced from the same source, driven entirely by a config
file/theme object. No new tenant concept in the database — you still spin up **one Supabase
project per client**, exactly as today, just repeatably.

**Steps**
- Extract every hardcoded string/color/menu item out of `App.jsx` into a single `client.config.js`
  (or `.json`) module: brand name, tagline, colors → CSS variables, logo/icon paths, contact
  info, menu array, stamps-required, etc.
- Refactor `App.jsx` to read from that config object instead of literals (mechanical but
  touches most of the file, given how spread out the strings are).
- Move colors to CSS custom properties (`--brand-primary` etc.) set from config at app root, so
  Tailwind/inline styles reference variables, not literals.
- Define a config schema (TypeScript type or JSON schema) so a new client's config is
  quick to validate.
- Build a small "new client" checklist/script: copy `client.config.template.js` → fill in →
  create Supabase project → run `supabase-schema.sql` → set `.env` → `npm run build` →
  `npx cap sync android` → generate icon/splash via `@capacitor/assets` → set Android `appId`
  and `appName` per client → build/sign APK.
- Optional: a tiny Node/CLI script (`scripts/new-client.js`) that scaffolds steps 5's config
  and env files from prompts, to reduce manual error.

**Effort estimate:** ~1.5–3 weeks for one developer.
- Extracting/refactoring the config: 3–5 days (this is the bulk — 213 brand-related references
  found in `App.jsx` alone).
- CSS variable theming pass: 1–2 days.
- Menu data model + simple render: 1–2 days.
- Tooling/checklist/scripts + docs: 1–2 days.
- Per-new-client turnaround after this exists: **a few hours** (mostly Supabase setup + asset
  generation + signing), not developer-days.

**Pros**
- Smallest architectural change — keeps today's "one Supabase project per shop" model, which
  is simple to reason about and already proven in the README.
- Each client's data is fully isolated at the infrastructure level (separate DB) — strong
  privacy/security story, easy to point at for a nervous client ("your data lives in its own
  database").
- No auth/tenancy bugs possible — there is no shared backend to leak across.
- Cheapest to start, easiest to explain to a non-technical client.

**Cons**
- Every client is a **separate deployment** — updating a feature means rebuilding and
  re-releasing N apps/sites, not one. This scales poorly past a handful of clients.
- No central admin view across all clients (e.g., you can't see "how many clients are active"
  without opening each Supabase project).
- Config changes still require a developer to edit a file and redeploy — not self-serve for the
  client unless you also build a config UI later.

**3rd-party cost**
- Supabase: free tier covers a single small shop (500MB DB, 50k monthly active users) — likely
  fine for several clients individually, but **cost is N × (Supabase project)**. Once a client
  needs the Pro tier (bigger DB, backups, no project pausing after inactivity) it's **$25/mo per
  project**. With, say, 10 clients all on Pro: ~$250/mo total, billed to whoever owns the
  Supabase org (you, or pass through to each client).
- Google Play: one $25 one-time developer account can publish multiple app listings, but if
  each client wants a fully separate branded app (own name/icon in the Play Store), that's a
  separate app listing per client — no extra Google fee for listings, but more submission/review
  overhead per client, and Apple App Store (if ever needed) charges **$99/year per developer
  account** if clients want their own listing.
- Hosting (web build): negligible — static hosting (Vercel/Netlify/Cloudflare Pages free tiers)
  easily covers this per client.

---

### Option B — Multi-tenant SaaS: one codebase, one deploy, one shared Supabase project

All clients share the same running app and the same Supabase project, distinguished by a
`tenant_id`. A client is a row in a new `tenants` table holding their config (branding, menu,
contact info) instead of a static file; `customers`, and any other table, gain a `tenant_id`
foreign key. Row-Level Security enforces isolation.

**Steps**
- Design `tenants` table: id, slug, brand_name, tagline, colors (jsonb), logo_url, contact info,
  menu (jsonb or a separate `menu_items` table), stamps_required, created_at, etc.
- Add `tenant_id` to `customers` (and every future table); backfill Hugo's existing data with
  its own tenant row.
- Rewrite RLS policies so every read/write is scoped by `tenant_id`, tied to the authenticated
  staff user's tenant (staff accounts need a `tenant_id` claim too — e.g. via Supabase custom
  claims or a `staff_tenant` mapping table).
- Add tenant resolution to the frontend: either a subdomain per client (`hugo.yourapp.com`,
  `otherclient.yourapp.com`) or a path/query param, or — for the Android app case — a tenant
  chosen at first-launch/login and cached locally.
- Fetch tenant config on load, apply as CSS variables + content, same rendering approach as
  Option A but sourced from a DB row instead of a static file.
- Build a minimal internal admin UI (or just direct Supabase Studio access) to create/edit
  tenants — later evolve into a self-serve client-facing settings page.
- Decide the Android story (see Option C) since a single native app can't easily be "one app,
  many brands" on a phone's home screen — most white-label mobile products either go PWA/web,
  or still build one APK per client from this same multi-tenant backend (differs only in the
  `appId` and pointing at their tenant slug).

**Effort estimate:** ~4–7 weeks for one developer.
- Schema/RLS redesign + migration: 4–6 days.
- Tenant resolution + config-driven rendering (builds on Option A's refactor either way): 5–7
  days.
- Staff auth → tenant mapping, and testing isolation is airtight: 3–5 days (this is the part
  most worth paying for a second pair of eyes / security review on).
- Admin UI (basic CRUD for tenants, even unstyled): 4–6 days.
- Hardening, RLS testing, docs: 3–4 days.

**Pros**
- One codebase, one deploy — ship a feature once, every client gets it immediately (huge
  long-term maintenance win vs. Option A once you have more than ~5 clients).
- Central visibility: one Supabase project to monitor, one place to see all tenants/usage.
- Natural path to a self-serve SaaS product (clients sign up, configure their own branding,
  pay a subscription) if that's ever a goal.
- Scales cheaply per additional client — marginal cost of a new tenant is a database row, not
  a new project.

**Cons**
- Meaningfully more engineering, and the RLS/tenant-isolation work is exactly the kind of thing
  that's dangerous to get subtly wrong (one bad policy = client A can see client B's customers).
  Needs real testing, ideally a review pass.
- Native Android distribution is awkward in a shared-app model — see Option C; you likely still
  end up building per-client APKs even here, so the "one deploy" benefit is strongest for the
  web build, less so for the store apps.
- Harder to offer "your data is in its own database" as a selling point to a security-conscious
  client — everyone shares infrastructure (mitigated by RLS, but it's a harder sell/audit than
  physical separation).
- A bug in shared code affects every client at once (blast radius is larger).

**3rd-party cost**
- Supabase: **one project** for all clients instead of N. Free tier likely outgrown quickly
  once several shops' customers share it (500MB DB, bandwidth/API limits) — realistically a
  single **Pro** project at **$25/mo** covers quite a lot of tenants before you'd need add-ons
  (extra DB storage ~$0.125/GB/mo, etc.). This is usually **cheaper in aggregate** than Option A
  once you pass roughly 3–5 clients.
- Hosting: same as Option A, negligible on free tiers until traffic is significant.
- If it grows into a real SaaS, eventually consider: email sending (e.g. Resend/Postmark, free
  tiers ~100–3,000 emails/mo) for client onboarding, and a billing provider (Stripe, ~2.9%+30¢
  per transaction, no fixed fee) if clients pay you directly.

---

### Option C — Distribution layer (applies on top of A or B)

This isn't really an alternative to A/B — it's the decision about **how each client's customers
actually get the app on their phone**, which the current Capacitor/Android setup forces you to
make regardless of which data architecture you choose.

**C1 — Web-first (PWA), no native app per client**
- Steps: make the existing web build installable as a Progressive Web App (manifest.json,
  service worker, "Add to Home Screen" prompt); skip Android Studio/Play Store entirely for new
  clients.
- Effort: 2–4 days on top of Option A or B.
- Pros: zero Play Store review/signing per client, instant updates, near-zero marginal cost per
  new client, works on iOS too (via Safari "Add to Home Screen").
- Cons: feels slightly less "real app"-like to end customers; no push notifications on iOS PWAs
  (as of iOS 16.4+ it's supported but limited); no native camera plugin (`@capacitor-mlkit`)
  benefits — falls back to the browser `BarcodeDetector` the README already flags as less
  reliable.
- 3rd-party cost: none beyond existing hosting.

**C2 — One APK per client, built from shared code (works with either A or B)**
- Steps: per client, set `capacitor.config.json`'s `appId`/`appName`, swap `/assets` icon/splash
  via `@capacitor/assets` generator, `npm run build && npx cap sync android`, sign, submit to
  Play Console as its own listing.
- Effort: once scripted (part of Option A's tooling step), a few hours per new client; ~1 extra
  day to build the icon/splash automation if not already covered.
- Pros: real installable branded app per client, works fully offline-first for the shell, best
  camera/scanner reliability via the native plugin already in `package.json`
  (`@capacitor-mlkit/barcode-scanning`).
- Cons: Play Store review turnaround per client (hours–days per README), you manage N app
  listings and N signing keys (losing a signing key blocks future updates to that client's app —
  needs a real key-management plan), doesn't get feature updates until you rebuild+resubmit that
  client's APK.
- 3rd-party cost: Google Play Developer account is **$25 one-time** (covers unlimited listings
  under that account); if a client ever wants iOS, Apple requires **$99/year per developer
  account** — either your account (with the client's app under it) or the client's own.

**C3 — One shared app, tenant chosen at login (only sensible with Option B)**
- Steps: single Play Store listing, tenant/shop is selected or auto-detected (e.g. via invite
  code or QR at signup) after install, branding switches at runtime from the fetched tenant
  config.
- Effort: minimal extra beyond Option B's tenant resolution — mostly UX design for "how does a
  new customer pick their shop."
- Pros: one app to publish and maintain forever, cheapest to run at scale.
- Cons: no distinct home-screen icon/name per brand (undermines the "this is Hugo's own app"
  feel a small business owner is often paying for); harder to market as "your app."

## 4. Recommendation (for discussion, not decided)

Given the project is currently a single pilot client (Hugo) and the ask is explicitly "keep this
as a template, make it customisable per client":

- **Short/medium term:** Option A (config-driven, one Supabase project + one APK per client) is
  the pragmatic starting point. It's a ~1.5–3 week refactor, keeps the strong per-client data
  isolation the README already leans on, and doesn't require solving multi-tenant RLS correctly
  under time pressure. Pair it with **C2** (branded APK per client) since that matches what a
  small shop owner is likely expecting ("my own app"), with **C1 (PWA)** as a cheap fallback for
  clients who don't need/want a Play Store listing.
- **If/when** the number of clients grows past roughly 5–10 and re-deploying per feature change
  becomes painful, migrate to Option B. Much of Option A's config-extraction work (pulling
  strings out of `App.jsx`, CSS variables, config schema) is directly reusable — it isn't wasted
  effort, it's the first half of Option B anyway.

## 5. Open questions for you — answered

1. **~10 clients, not certain.** 2. **Each client needs their own brand** (own app identity).
3. **You'll edit config yourself**, not self-serve; maintenance sold as an add-on. 4. **One-off
   sale price → lean on free tooling**; a possible future £5–10/mo tier means infra cost per
   client has to stay very low, or the model doesn't work. 5. **Both iOS and Android.**

These answers actually resolve the A-vs-B question and add one new constraint (iOS build
logistics), so here's the revised recommendation.

## 6. Revised recommendation

**Backend: go straight to Option B (shared multi-tenant Supabase project).** The £5–10/mo price
point is the deciding factor. At 10 clients, Option A means **10 separate Supabase projects**:
- Supabase's free tier caps a personal org at a small number of active free projects and
  auto-pauses ones with a week of inactivity (annoying for a demo client), so 10 real clients
  will push you onto **Pro at $25/mo per project** — that's ~$250/mo (~£195/mo) in infra alone,
  against maybe £50–100/mo of total revenue at that tier. It doesn't close.
- One shared project (Option B) serving all 10 tenants very plausibly stays on the **free tier**
  early on, and even at Pro it's **one** $25/mo bill total, not ×10. That's the only version of
  this that's compatible with a low monthly price — or a one-off sale price where you don't want
  ongoing costs biting you at all.
- Since you're comfortable owning config changes yourself (Q3), the "admin UI" step from
  Option B's plan can be skipped for now — manage tenant rows directly in Supabase's Studio
  table editor. Build a real admin screen only once maintenance-as-a-service actually has
  paying clients.

**Distribution: still one branded app per client per platform (C2), on top of the shared backend.**
Q2 rules out a single shared app (Option C3) — each client wants their own icon/name on the
customer's home screen. So the shape is: **one codebase, one shared Supabase project, but a
separate Android + iOS build per client**, each build baked with that client's `tenant_id` (or a
tenant slug resolved at first launch) and its own `appId`/bundle ID, icon, and splash. This is
exactly Option B's backend + Option A/C2's per-client packaging — not a contradiction, it's the
combination the requirements actually point to.

**New cost/logistics item: iOS needs a Mac.** The repo currently only has `@capacitor/android` —
`@capacitor/ios` isn't installed yet, and building/signing an iOS app requires Xcode, which only
runs on macOS. Options, roughly cheapest first:
- Rent CI Mac minutes only when building a release: **GitHub Actions macOS runners** (macOS
  minutes cost ~10× Linux minutes on paid plans, but usage is light — a few builds per client —
  so likely a few £/month even across 10 clients), or a service like **Codemagic** (free tier:
  500 build minutes/month, which comfortably covers occasional per-client iOS builds).
- Buy/borrow a Mac outright if you'll be doing this regularly and want local control — not a
  subscription cost, but a one-off hardware cost outside the "free tools" constraint.
- Either way, budget the **Apple Developer Program: $99/year**, fixed, regardless of build
  method. Good news: Apple allows unlimited app listings under one paid account, so this is
  **one $99/year fee total**, not per client (same as the existing $25-one-time Google Play
  account already covers unlimited Android listings).

**Revised effort estimate for the recommended path:**
- Option B backend work (schema/RLS/tenant resolution), as scoped in section 3: **~4–7 weeks**.
  Drop the "admin UI" line item (4–6 days) per Q3 → net **~3–5.5 weeks**.
- Per-client packaging tooling (icon/splash generation, `appId`/bundle id substitution, build
  script) for **both** Android and iOS: **+3–5 days** on top of what Option A originally scoped
  (iOS adds signing/provisioning profile handling, which is fiddlier than Android's keystore).
- Turnaround per new client once this exists: still a few hours of config + build/sign/submit
  time per platform, not developer-days — the heavier iOS review step (Apple's App Review is
  typically slower and stricter than Google Play's) is the main thing to budget extra calendar
  time for, not extra engineering effort.

**Revised total cost picture at 10 clients, steady state:**
- Supabase: **$0–25/mo total** (free tier until real usage demands Pro; either way it's one bill).
- Google Play: **$25 one-time**, ever.
- Apple Developer Program: **$99/year**, ever — this is the one recurring cost that's yours to
  absorb or fold into the one-off price, since it doesn't scale with client count either.
- Hosting (if also offering a web/PWA version per client): effectively **$0** on Vercel/
  Netlify/Cloudflare Pages free tiers at this scale.
- **So the entire recurring 3rd-party cost floor is ~$99/year (~£78/yr) regardless of whether
  you have 1 or 10 clients**, plus an optional $0–25/mo Supabase bill once usage grows — which
  comfortably supports either a one-off sale price or a small £5–10/mo tier later.

## 7. Remaining open question

- For the iOS build pipeline specifically: do you want to set up CI (GitHub Actions/Codemagic)
  now as part of this phase, or defer it and build the very first iOS release manually (e.g., a
  borrowed Mac or a one-off cloud Mac rental) until there's a second client confirming it's
  worth automating? Either is reasonable — CI upfront costs a few extra days of setup now but
  pays off after the 2nd or 3rd client; doing it manually first is faster to a first iOS release
  but means redoing the packaging work by hand each time until you automate it.
