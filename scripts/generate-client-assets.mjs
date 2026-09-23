#!/usr/bin/env node
// Generates Android launcher icon + splash screen assets from a client's
// logo.png via @capacitor/assets "Easy Mode" (see
// developent-docs/white-label-progress.md Epic 3).
import { spawnSync } from "node:child_process";
import { loadClientManifest } from "./lib/clientManifest.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/generate-client-assets.mjs <slug>");
  process.exit(1);
}

const client = loadClientManifest(slug);

const args = [
  "capacitor-assets",
  "generate",
  "--android",
  "--assetPath",
  client.dir,
  "--iconBackgroundColor",
  client.iconBackgroundColor || "#ffffff",
  "--splashBackgroundColor",
  client.splashBackgroundColor || "#ffffff",
];

console.log(`Running: npx ${args.join(" ")}`);
const result = spawnSync("npx", args, { stdio: "inherit", shell: true });
if (result.status !== 0) {
  console.error(
    "\ncapacitor-assets failed. This step needs the native `sharp` image library " +
      "to install correctly for your Node/OS/arch — see https://sharp.pixelplumbing.com/install " +
      "if it fails to load."
  );
  process.exit(result.status || 1);
}
