import { defineConfig, devices } from "@playwright/test";
import { CAPTCHA_TEST_SITE_KEY, scratchEnv } from "./tests/support/scratch.js";

// One dev server per shop, both pointed at the scratch project. Vite gives
// these process env vars priority over the live keys in .env.
const shops = [
  { slug: "hugo", port: 5181 },
  { slug: "daisy", port: 5182 },
];

export default defineConfig({
  testDir: "tests/smoke",
  globalSetup: "./tests/smoke/global-setup.js",
  globalTeardown: "./tests/smoke/global-teardown.js",
  timeout: 120_000,
  // The customer card's realtime update is occasionally missed (see "Bugs
  // found" in refactor-plan.md); a pass on retry is reported as flaky, not hidden.
  retries: 1,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: shops.map(({ slug, port }) => ({
    name: slug,
    use: { ...devices["Pixel 7"], baseURL: `http://localhost:${port}` },
  })),
  webServer: shops.map(({ slug, port }) => ({
    command: `npx vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_SUPABASE_URL: scratchEnv.SCRATCH_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: scratchEnv.SCRATCH_SUPABASE_ANON_KEY,
      VITE_TENANT_SLUG: slug,
      VITE_TURNSTILE_SITE_KEY: CAPTCHA_TEST_SITE_KEY,
    },
  })),
});
