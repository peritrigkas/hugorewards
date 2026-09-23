import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export const CLIENTS_DIR = "clients";

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const APP_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;

export function clientDir(slug) {
  return join(CLIENTS_DIR, slug);
}

export function loadClientManifest(slug, { requireLogo = true } = {}) {
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
  const logoPath = join(dir, "logo.png");
  if (requireLogo && !existsSync(logoPath)) {
    throw new Error(`Missing ${logoPath} — add a square (1024x1024 recommended) source logo for this client.`);
  }
  return { ...manifest, dir, logoPath };
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
}
