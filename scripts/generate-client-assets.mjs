#!/usr/bin/env node
// Generates Android launcher icon + splash screen assets from a client's
// logo.png via @capacitor/assets "Easy Mode" (see
// developent-docs/white-label-progress.md Epic 3).
//
// @capacitor/assets is fetched on demand through npx rather than installed
// as a devDependency: it pulls in the native `sharp` library, which has no
// prebuilt binary for some Node/OS combinations (e.g. Node 24 on Windows
// x64) and would otherwise break a plain `npm install` of the web app.
import { loadClientManifest, run } from "./lib/clientManifest.mjs";

const CAPACITOR_ASSETS = "@capacitor/assets@3.0.5";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/generate-client-assets.mjs <slug>");
  process.exit(1);
}

const client = loadClientManifest(slug);

const ok = run("npx", [
  "--yes",
  CAPACITOR_ASSETS,
  "generate",
  "--android",
  "--assetPath",
  client.dir,
  "--iconBackgroundColor",
  client.iconBackgroundColor,
  "--splashBackgroundColor",
  client.splashBackgroundColor,
]);
if (!ok) {
  console.error(
    "\ncapacitor-assets failed. This step needs the native `sharp` image library " +
      "to install correctly for your Node/OS/arch — see https://sharp.pixelplumbing.com/install " +
      "if it fails to load."
  );
  process.exit(1);
}
