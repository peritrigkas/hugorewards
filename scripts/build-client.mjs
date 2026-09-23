#!/usr/bin/env node
// End-to-end per-client Android packaging: applies the client's app
// identity, generates icon/splash assets, builds the web app against the
// client's tenant, and syncs the Android project. See
// developent-docs/white-label-progress.md Epic 3.
//
// Builds one client at a time against the single shared android/ project —
// same one-at-a-time manual release model as Hugo's existing workflow (see
// white-label-strategy.md's iOS CI deferral decision).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadClientManifest } from "./lib/clientManifest.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: npm run build-client -- <slug>");
  process.exit(1);
}

const client = loadClientManifest(slug);

function run(command, args) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) process.exit(result.status || 1);
}

// 1. Point .env.local at this client's tenant row, preserving any existing
// VITE_SUPABASE_* lines.
const envPath = ".env.local";
const lines = existsSync(envPath)
  ? readFileSync(envPath, "utf8").split("\n").filter((l) => l && !l.startsWith("VITE_TENANT_SLUG="))
  : [];
lines.push(`VITE_TENANT_SLUG=${client.tenantSlug}`);
writeFileSync(envPath, lines.join("\n") + "\n");
console.log(`Set VITE_TENANT_SLUG=${client.tenantSlug} in ${envPath}`);

// 2. Rewrite appId/appName/package across capacitor.config.json + android/.
run("node", ["scripts/apply-client-identity.mjs", slug]);

// 3. Build the web app for this tenant.
run("npm", ["run", "build"]);

// 4. Generate Android icon/splash from the client's logo.
run("node", ["scripts/generate-client-assets.mjs", slug]);

// 5. Sync the built web app + native config into the Android project.
run("npx", ["cap", "sync", "android"]);

console.log(`\n${slug} is ready in android/. Remaining manual steps:`);
console.log("  1. Bump versionCode/versionName in android/app/build.gradle.");
console.log("  2. npx cap open android — build a signed AAB from Android Studio.");
console.log("  3. Upload to the Play Console under this client's own listing.");
