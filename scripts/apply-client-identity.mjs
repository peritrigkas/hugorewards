#!/usr/bin/env node
// Rewrites the shared android/ project's appId/appName/package to match one
// client (see developent-docs/white-label-progress.md Epic 3). Capacitor
// doesn't do this itself after the initial `cap add android` — appId only
// affects capacitor.config.json, not the already-generated Gradle/Java
// files — so this substitutes them by hand. Builds are done one client at a
// time against the single android/ project, same as Hugo's existing manual
// release workflow.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { loadClientManifest } from "./lib/clientManifest.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/apply-client-identity.mjs <slug>");
  process.exit(1);
}

const client = loadClientManifest(slug, { requireLogo: false });
const { appId, appName } = client;

// 1. capacitor.config.json ---------------------------------------------
const capConfigPath = "capacitor.config.json";
const capConfig = JSON.parse(readFileSync(capConfigPath, "utf8"));
capConfig.appId = appId;
capConfig.appName = appName;
writeFileSync(capConfigPath, JSON.stringify(capConfig, null, 2) + "\n");
console.log(`Updated ${capConfigPath} -> ${appId} / "${appName}"`);

// 2. android/app/build.gradle --------------------------------------------
const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");
const namespaceMatch = gradle.match(/namespace\s*=\s*"([^"]+)"/);
if (!namespaceMatch) throw new Error(`Couldn't find "namespace" in ${gradlePath}`);
const oldAppId = namespaceMatch[1];
gradle = gradle
  .replace(/namespace\s*=\s*"[^"]+"/, `namespace = "${appId}"`)
  .replace(/applicationId\s+"[^"]+"/, `applicationId "${appId}"`);
writeFileSync(gradlePath, gradle);
console.log(`Updated ${gradlePath}: ${oldAppId} -> ${appId}`);

// 3. strings.xml ----------------------------------------------------------
const stringsPath = "android/app/src/main/res/values/strings.xml";
let strings = readFileSync(stringsPath, "utf8");
strings = strings
  .replace(/(<string name="app_name">)[^<]*(<\/string>)/, `$1${appName}$2`)
  .replace(/(<string name="title_activity_main">)[^<]*(<\/string>)/, `$1${appName}$2`)
  .replace(/(<string name="package_name">)[^<]*(<\/string>)/, `$1${appId}$2`)
  .replace(/(<string name="custom_url_scheme">)[^<]*(<\/string>)/, `$1${appId}$2`);
writeFileSync(stringsPath, strings);
console.log(`Updated ${stringsPath}`);

// 4. Java package rename ---------------------------------------------------
if (oldAppId !== appId) {
  const javaRoot = "android/app/src/main/java";
  const oldDir = join(javaRoot, ...oldAppId.split("."));
  const newDir = join(javaRoot, ...appId.split("."));
  if (!existsSync(oldDir)) throw new Error(`Expected Java source at ${oldDir}, not found`);

  mkdirSync(newDir, { recursive: true });
  for (const file of ["MainActivity.java"]) {
    const src = join(oldDir, file);
    if (!existsSync(src)) continue;
    let contents = readFileSync(src, "utf8");
    contents = contents.replace(/^package\s+[\w.]+;/m, `package ${appId};`);
    writeFileSync(join(newDir, file), contents);
  }
  // Remove the old package's leaf directory, then prune any now-empty
  // parent directories back up to (not including) java/ — without touching
  // sibling packages that might share a top-level segment.
  rmSync(oldDir, { recursive: true, force: true });
  let dir = dirname(oldDir);
  while (dir !== javaRoot && existsSync(dir) && readdirSync(dir).length === 0) {
    rmSync(dir, { recursive: true, force: true });
    dir = dirname(dir);
  }
  console.log(`Moved Java package ${oldAppId} -> ${appId}`);
}

console.log(`\nandroid/ is now set up for "${slug}" (${appId}). Run "npx cap sync android" after building.`);
