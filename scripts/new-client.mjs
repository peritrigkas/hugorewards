#!/usr/bin/env node
// Scaffolds clients/<slug>/ for a new white-label client. See
// developent-docs/white-label-progress.md Epic 3.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { CLIENTS_DIR, assertValidSlug, assertValidAppId } from "./lib/clientManifest.mjs";

const [slug, appId, appName] = process.argv.slice(2);

if (!slug || !appId || !appName) {
  console.error('Usage: npm run new-client -- <slug> <appId> "<App Name>"');
  console.error('Example: npm run new-client -- daisy com.daisy.rewards "Daisy Rewards"');
  process.exit(1);
}

assertValidSlug(slug);
assertValidAppId(appId);

const dir = join(CLIENTS_DIR, slug);
if (existsSync(dir)) {
  console.error(`${dir} already exists.`);
  process.exit(1);
}

mkdirSync(dir, { recursive: true });
writeFileSync(
  join(dir, "client.json"),
  JSON.stringify(
    {
      slug,
      // The tenants.slug row this build should fetch its runtime config from
      // (see src/tenantConfig.js) — usually the same as the package slug.
      tenantSlug: slug,
      appId,
      appName,
      // Hex colors used as the icon/splash background when generating
      // Android assets from logo.png (see scripts/generate-client-assets.mjs).
      iconBackgroundColor: "#ffffff",
      splashBackgroundColor: "#ffffff",
    },
    null,
    2
  ) + "\n"
);

console.log(`Created ${dir}/client.json\n`);
console.log("Next steps:");
console.log(`  1. Add ${dir}/logo.png — a square source logo, 1024x1024px or larger.`);
console.log(`  2. Adjust iconBackgroundColor / splashBackgroundColor in ${dir}/client.json if needed.`);
console.log(`  3. Create the tenant row in Supabase Studio (tenants table) with slug "${slug}".`);
console.log(`  4. Run: npm run build-client -- ${slug}`);
