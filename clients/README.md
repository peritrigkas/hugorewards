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
3. `npm run build-client -- <slug>`

`build-client` rewrites `capacitor.config.json` and the shared `android/`
project's appId/appName/Java package, points the web build at the client's
tenant row, generates icon/splash assets from `logo.png`, and syncs
`android/`. Builds are done **one client at a time** against that single
`android/` project — the same manual, one-release-at-a-time workflow already
used for Hugo (see the iOS CI deferral decision in the progress doc).

`clients/hugo/client.json` documents Hugo's existing live values as a
reference — it has no `logo.png` because Hugo's `android/` assets were
already generated manually before this tooling existed and don't need
regenerating.

## iOS

Not covered by this tooling yet — `@capacitor/ios` isn't installed, and
bundle-id/signing/provisioning needs to be worked out per-client on a Mac.
Tracked as a separate, not-yet-started Epic 3 item.
