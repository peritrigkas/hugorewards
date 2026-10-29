#!/usr/bin/env node
// Rewrites the shared android/ project's appId/appName/package to match one
// client (see developent-docs/white-label-progress.md Epic 3). Capacitor
// doesn't do this itself after the initial `cap add android` — appId only
// affects capacitor.config.json, not the already-generated Gradle/Java
// files — so this substitutes them by hand. Builds are done one client at a
// time against the single android/ project, same as Hugo's existing manual
// release workflow. `npm run reset-client` undoes it.
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync, cpSync, mkdtempSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { loadClientManifest } from "./lib/clientManifest.mjs";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/apply-client-identity.mjs <slug>");
  process.exit(1);
}

const client = loadClientManifest(slug, { requireLogo: false });
const { appId, appName } = client;

// Android string resources treat \ ' " specially, and a leading @ or ? as a
// reference; the result then needs XML escaping on top.
function escapeAndroidString(value) {
  return value
    .replace(/[\\'"]/g, "\\$&")
    .replace(/^[@?]/, "\\$&")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Replacement via function so "$" in a client's value is never read as a
// String.replace pattern ($&, $1, ...). Throws if the pattern isn't found,
// rather than silently leaving Hugo's value in place.
function replaceRequired(text, pattern, replacement, what) {
  if (!pattern.test(text)) throw new Error(`Couldn't find ${what}`);
  return text.replace(pattern, (...match) => replacement(...match));
}

// 1. capacitor.config.json ---------------------------------------------
const capConfigPath = "capacitor.config.json";
const capConfigText = readFileSync(capConfigPath, "utf8");
const capConfig = JSON.parse(capConfigText);
capConfig.appId = appId;
capConfig.appName = appName;
// Keep the checkout's line endings (CRLF on Windows with autocrlf), so an
// unchanged identity doesn't show up as a modified file.
const eol = capConfigText.includes("\r\n") ? "\r\n" : "\n";
writeFileSync(capConfigPath, (JSON.stringify(capConfig, null, 2) + "\n").replace(/\n/g, eol));
console.log(`Updated ${capConfigPath} -> ${appId} / "${appName}"`);

// 2. android/app/build.gradle --------------------------------------------
const gradlePath = "android/app/build.gradle";
let gradle = readFileSync(gradlePath, "utf8");
const namespaceMatch = gradle.match(/namespace\s*=\s*"([^"]+)"/);
if (!namespaceMatch) throw new Error(`Couldn't find "namespace" in ${gradlePath}`);
const oldAppId = namespaceMatch[1];
gradle = replaceRequired(gradle, /namespace\s*=\s*"[^"]+"/, () => `namespace = "${appId}"`, `"namespace" in ${gradlePath}`);
// Matches both `applicationId "x"` and `applicationId = "x"`, keeping the
// file's existing style.
gradle = replaceRequired(
  gradle,
  /(applicationId\s*=?\s*)"[^"]+"/,
  (_, prefix) => `${prefix}"${appId}"`,
  `"applicationId" in ${gradlePath}`
);
writeFileSync(gradlePath, gradle);
console.log(`Updated ${gradlePath}: ${oldAppId} -> ${appId}`);

// 3. strings.xml ----------------------------------------------------------
const stringsPath = "android/app/src/main/res/values/strings.xml";
let strings = readFileSync(stringsPath, "utf8");
const escapedName = escapeAndroidString(appName);
for (const [name, value] of [
  ["app_name", escapedName],
  ["title_activity_main", escapedName],
  ["package_name", appId],
  ["custom_url_scheme", appId],
]) {
  strings = replaceRequired(
    strings,
    new RegExp(`(<string name="${name}">)[^<]*(</string>)`),
    (_, open, close) => `${open}${value}${close}`,
    `<string name="${name}"> in ${stringsPath}`
  );
}
writeFileSync(stringsPath, strings);
console.log(`Updated ${stringsPath}`);

// 4. Java package rename ---------------------------------------------------
if (oldAppId !== appId) {
  const javaRoot = resolve("android/app/src/main/java");
  const oldDir = join(javaRoot, ...oldAppId.split("."));
  const newDir = join(javaRoot, ...appId.split("."));
  if (!existsSync(oldDir)) throw new Error(`Expected Java source at ${oldDir}, not found`);

  // Move the whole package tree (not just MainActivity.java) via a temp copy,
  // so it also works when one package is nested inside the other.
  const staging = join(mkdtempSync(join(tmpdir(), "client-identity-")), "pkg");
  cpSync(oldDir, staging, { recursive: true });
  rmSync(oldDir, { recursive: true, force: true });
  // Prune now-empty parent directories back up to (not including) java/,
  // without touching sibling packages that share a top-level segment.
  let dir = dirname(oldDir);
  while (dir !== javaRoot && existsSync(dir) && readdirSync(dir).length === 0) {
    rmSync(dir, { recursive: true, force: true });
    dir = dirname(dir);
  }
  mkdirSync(newDir, { recursive: true });
  cpSync(staging, newDir, { recursive: true });
  rmSync(dirname(staging), { recursive: true, force: true });

  // Rewrite package/import references (including subpackages) in every source file.
  const oldRef = new RegExp(`\\b${oldAppId.replace(/\./g, "\\.")}(?=[.;])`, "g");
  const rewriteSources = (path) => {
    for (const entry of readdirSync(path)) {
      const full = join(path, entry);
      if (statSync(full).isDirectory()) rewriteSources(full);
      else if (/\.(java|kt)$/.test(entry)) writeFileSync(full, readFileSync(full, "utf8").replace(oldRef, () => appId));
    }
  };
  rewriteSources(newDir);
  console.log(`Moved Java package ${oldAppId} -> ${appId}`);
}

console.log(`\nandroid/ is now set up for "${slug}" (${appId}). Run "npx cap sync android" after building.`);
