# Per-client packaging

One folder per white-label client (see `developent-docs/white-label-progress.md`
Epic 3), each holding the build-time identity a client's Android app needs —
separate from `src/client.config.js` / the `tenants` DB table, which cover
runtime branding (colors, copy, menu) instead.

```
clients/<slug>/
├── client.json   # appId, appName, tenantSlug, icon/splash background colors
└── logo.png      # square source logo, 1024x1024px or larger
```

## Onboarding a new client

```bash
npm run new-client -- <slug> <appId> "<App Name>"
# e.g. npm run new-client -- daisy com.daisy.rewards "Daisy Rewards"
```

Then:
1. Add `clients/<slug>/logo.png`.
2. Create the client's row in the `tenants` table (Supabase Studio) with a
   matching `slug` — see `supabase-schema-tenants.sql`.
   Its `config` (jsonb) overrides `src/client.config.js` at runtime. For
   artwork: upload the in-app logo to the `tenant-assets` Storage bucket
   (PNG/JPEG/WebP, ≤1 MB) and set `"logoUrl"` to its public URL, and pick a
   stamp icon, e.g.
   `{"logoUrl": "https://<ref>.supabase.co/storage/v1/object/public/tenant-assets/daisy/logo.png", "loyalty": {"stampIcon": "leaf", "cardsPromoBody": "..."}}`.
   Preview locally with `npm run dev` and
   `?stampIcon=leaf&stampsForReward=8&logoUrl=<url>`.
3. `npm run build-client -- <slug>`

`build-client` rewrites `capacitor.config.json` and the shared `android/`
project's appId/appName/Java package, builds the web app against the client's
tenant row, generates icon/splash assets from `logo.png`, and syncs
`android/`. Builds are done **one client at a time** against that single
`android/` project — the same manual, one-release-at-a-time workflow already
used for Hugo (see the iOS CI deferral decision in the progress doc).

## The Hugo baseline and resetting

The **committed** `android/` and `capacitor.config.json` are Hugo's. So:

- `build-client` refuses to start if either has uncommitted changes.
- If any step fails, it restores both from git automatically.
- After building and releasing another client, run `npm run reset-client` to
  put them back to Hugo. **Never commit a client's changes to `android/`.**
  `reset-client` also deletes untracked files under `android/`.
- `npm run build-client -- hugo` needs no `logo.png`: Hugo's icons/splash are
  the committed ones, so the asset step is skipped. `clients/hugo/client.json`
  documents Hugo's live values.

The tenant slug is passed to the web build as an environment variable, so
`.env.local` is never touched and plain `npm run build` stays Hugo's.

## Icon/splash generation

`@capacitor/assets` runs on demand via `npx` instead of being a
devDependency, because its native `sharp` dependency has no prebuilt binary
for Node 24 on Windows x64, and that would break `npm install`. On that setup
the asset step fails (and `build-client` rolls back). Build non-Hugo clients
on a Mac, or on Linux / an older Node.

**First Mac run checklist** (this step hasn't been tested end-to-end yet):

1. `npm run new-client -- daisy com.daisy.rewards "Daisy Rewards"`, add a test
   `clients/daisy/logo.png`.
2. `npm run build-client -- daisy` — check the icon/splash backgrounds in
   `android/app/src/main/res` use the colors from `client.json`.
3. `npx cap open android`, run on a device/emulator: launcher name, icon and
   splash should be Daisy's.
4. `npm run reset-client`, then `git status` — should be clean.

## iOS

Not covered by this tooling yet — `@capacitor/ios` isn't installed, and
bundle-id/signing/provisioning needs to be worked out per-client on a Mac.
Tracked as a separate, not-yet-started Epic 3 item.
