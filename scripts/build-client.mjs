#!/usr/bin/env node
// End-to-end per-client Android packaging: applies the client's app
// identity, generates icon/splash assets, builds the web app against the
// client's tenant, and syncs the Android project. See
// developent-docs/white-label-progress.md Epic 3.
//
// Builds one client at a time against the single shared android/ project —
// same one-at-a-time manual release model as Hugo's existing workflow (see
// white-label-strategy.md's iOS CI deferral decision). The committed state of
// android/ is the baseline (Hugo) identity: this refuses to start unless it's
// clean, restores it if any step fails, and `npm run reset-client` restores
// it after a successful build.
import {
  loadClientManifest,
  baselineAppId,
  identityPathsAreClean,
  restoreBaseline,
  run,
  IDENTITY_PATHS,
} from "./lib/clientManifest.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run build-client -- <slug>");
  process.exit(1);
}

// The baseline client's icons/splash are already committed in android/, so
// it doesn't need a logo.png; every other client does.
const isBaseline = loadClientManifest(slug, { requireLogo: false }).appId === baselineAppId();
const client = loadClientManifest(slug, { requireLogo: !isBaseline });

if (!identityPathsAreClean()) {
  console.error(
    `${IDENTITY_PATHS.join(" / ")} have uncommitted changes — probably left over from a previous ` +
      'client build. Run "npm run reset-client" (discards them) or commit them first.'
  );
  process.exit(1);
}

const steps = [
  // 1. Rewrite appId/appName/package across capacitor.config.json + android/.
  () => run("node", ["scripts/apply-client-identity.mjs", slug]),
  // 2. Build the web app for this tenant. Passed as a process env var rather
  // than written to .env.local, so it only affects this build — Vite gives
  // existing env vars priority over .env files.
  () => run("npm", ["run", "build"], { env: { VITE_TENANT_SLUG: client.tenantSlug } }),
  // 3. Generate Android icon/splash from the client's logo.
  () => isBaseline || run("node", ["scripts/generate-client-assets.mjs", slug]),
  // 4. Sync the built web app + native config into the Android project.
  () => run("npx", ["cap", "sync", "android"]),
];

for (const step of steps) {
  if (!step()) {
    console.error(`\nBuild failed — restoring ${IDENTITY_PATHS.join(" and ")} to their committed state.`);
    restoreBaseline();
    process.exit(1);
  }
}

console.log(`\n${slug} is ready in android/. Remaining manual steps:`);
console.log("  1. Bump versionCode/versionName in android/app/build.gradle.");
console.log("  2. npx cap open android — build a signed AAB from Android Studio.");
console.log("  3. Upload to the Play Console under this client's own listing.");
if (!isBaseline) {
  console.log('  4. npm run reset-client — puts android/ back to Hugo. Don\'t commit the client\'s changes.');
}
