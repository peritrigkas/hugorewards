import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

export const CLIENTS_DIR = "clients";
export const DEFAULT_BG_COLOR = "#ffffff";

// Files the per-client scripts rewrite. Their committed state is the
// baseline (Hugo) identity; reset-client / a failed build restore it from git.
export const IDENTITY_PATHS = ["capacitor.config.json", "android"];

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const APP_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
const COLOR_RE = /^#[0-9a-f]{6}$/i;
// An appId becomes a Java package name, so no segment can be a Java keyword.
const JAVA_KEYWORDS = new Set(
  ("abstract assert boolean break byte case catch char class const continue default do double else enum " +
    "extends false final finally float for goto if implements import instanceof int interface long native " +
    "new null package private protected public return short static strictfp super switch synchronized " +
    "this throw throws transient true try void volatile while").split(" ")
);

export function clientDir(slug) {
  return join(CLIENTS_DIR, slug);
}

export function loadClientManifest(slug, { requireLogo = true } = {}) {
  assertValidSlug(slug);
  const dir = clientDir(slug);
  const manifestPath = join(dir, "client.json");
  if (!existsSync(manifestPath)) {
    throw new Error(
      `No ${manifestPath} found. Run "npm run new-client -- ${slug} <appId> \\"<App Name>\\"" first.`
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const field of ["slug", "tenantSlug", "appId", "appName"]) {
    if (!manifest[field]) throw new Error(`${manifestPath} is missing "${field}"`);
  }
  // Re-validated on every load, not just in new-client, since client.json is
  // hand-edited and these values end up in Gradle, Java and command lines.
  assertValidSlug(manifest.tenantSlug);
  assertValidAppId(manifest.appId);
  const iconBackgroundColor = manifest.iconBackgroundColor || DEFAULT_BG_COLOR;
  const splashBackgroundColor = manifest.splashBackgroundColor || DEFAULT_BG_COLOR;
  assertValidColor(iconBackgroundColor);
  assertValidColor(splashBackgroundColor);
  const logoPath = join(dir, "logo.png");
  if (requireLogo && !existsSync(logoPath)) {
    throw new Error(`Missing ${logoPath} — add a square (1024x1024 recommended) source logo for this client.`);
  }
  return { ...manifest, iconBackgroundColor, splashBackgroundColor, dir, logoPath };
}

export function assertValidSlug(slug) {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug "${slug}" — use lowercase letters, digits, and hyphens, starting with a letter.`);
  }
}

export function assertValidAppId(appId) {
  if (!APP_ID_RE.test(appId)) {
    throw new Error(`Invalid appId "${appId}" — expected reverse-DNS style, e.g. "com.example.appname".`);
  }
  const keyword = appId.split(".").find((segment) => JAVA_KEYWORDS.has(segment.toLowerCase()));
  if (keyword) {
    throw new Error(`Invalid appId "${appId}" — "${keyword}" is a Java keyword and can't be a package segment.`);
  }
}

export function assertValidColor(color) {
  if (!COLOR_RE.test(color)) {
    throw new Error(`Invalid color "${color}" — expected a 6-digit hex color, e.g. "#ffffff".`);
  }
}

// The appId committed to git, i.e. the identity android/ is restored to.
export function baselineAppId() {
  return JSON.parse(execFileSync("git", ["show", "HEAD:capacitor.config.json"], { encoding: "utf8" })).appId;
}

export function identityPathsAreClean() {
  return execFileSync("git", ["status", "--porcelain", "--", ...IDENTITY_PATHS], { encoding: "utf8" }).trim() === "";
}

// Puts capacitor.config.json and android/ back to their committed state,
// including deleting anything the scripts created (renamed Java packages,
// generated icon/splash files). Only call when they were clean beforehand.
export function restoreBaseline() {
  execFileSync("git", ["checkout", "HEAD", "--", ...IDENTITY_PATHS], { stdio: "inherit" });
  execFileSync("git", ["clean", "-fdq", "--", ...IDENTITY_PATHS], { stdio: "inherit" });
}

// Runs a command without a shell on Mac/Linux, so arguments like "#ffffff"
// reach it verbatim instead of being read as a shell comment. Windows needs a
// shell to launch npm/npx (.cmd files); cmd.exe doesn't treat "#" specially,
// and every argument passed here is a validated slug, appId, color or path.
// The command itself stays unquoted: a quoted "npm" makes npm.cmd resolve its
// own install directory relative to the cwd.
export function run(command, args, { env } = {}) {
  console.log(`\n> ${command} ${args.join(" ")}`);
  const options = { stdio: "inherit", env: { ...process.env, ...env } };
  const result =
    process.platform === "win32"
      ? spawnSync([command, ...args.map((a) => `"${a}"`)].join(" "), { ...options, shell: true })
      : spawnSync(command, args, options);
  return result.status === 0;
}
