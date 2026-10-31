// Shared by the database tests (Vitest) and the smoke tests (Playwright):
// the scratch project's keys, Supabase clients, and test staff accounts.
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { loadEnv } from "vite";

const LIVE_PROJECT_REF = "ubniiattgwoouziejubu";

// Only SCRATCH_* vars, so the live project's VITE_* keys in .env can never
// leak into a test run.
export const scratchEnv = loadEnv("test", process.cwd(), "SCRATCH_");
const {
  SCRATCH_SUPABASE_URL: url,
  SCRATCH_SUPABASE_ANON_KEY: anonKey,
  SCRATCH_SUPABASE_SERVICE_ROLE_KEY: serviceKey,
} = scratchEnv;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing SCRATCH_SUPABASE_* vars — copy .env.test.example to .env.test.local and fill it in.");
}
if (url.includes(LIVE_PROJECT_REF)) {
  throw new Error("Refusing to run tests against the live Hugo project.");
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

// Bypasses RLS: used only for setup, cleanup, and checking what really
// happened after a blocked write (RLS often filters silently instead of erroring).
export const admin = createClient(url, serviceKey, clientOptions);

export const anonClient = () => createClient(url, anonKey, clientOptions);

// Scratch uses Cloudflare's always-pass Turnstile test keys, so this dummy
// token passes the CAPTCHA check (see tests/README.md).
export const CAPTCHA_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";
export const CAPTCHA_TEST_SITE_KEY = "1x00000000000000000000AA";

export const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// Days in the shop's time zone (the scratch shops use the default,
// Europe/London), as YYYY-MM-DD: shopDay(0) is today, shopDay(-1) yesterday.
export function shopDay(offset = 0) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
  const day = new Date(`${today}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + offset);
  return day.toISOString().slice(0, 10);
}

export async function getTenantIds() {
  const rows = must(await admin.from("tenants").select("id, slug").in("slug", ["hugo", "daisy"]));
  const ids = Object.fromEntries(rows.map((r) => [r.slug, r.id]));
  if (!ids.hugo || !ids.daisy) throw new Error("Scratch project needs both the hugo and daisy tenants.");
  return ids;
}

// Creates (or reuses) a staff account mapped to the tenant, with a fresh random
// password each run so no staff password is stored anywhere. Each suite uses
// its own label so running them side by side can't reset each other's password.
export async function ensureStaffAccount(label, slug, tenantId) {
  const email = `${label}-staff-${slug}@test.local`;
  const password = randomBytes(24).toString("base64url");

  const { users } = must(await admin.auth.admin.listUsers({ perPage: 1000 }));
  let user = users.find((u) => u.email === email);
  if (user) {
    must(await admin.auth.admin.updateUserById(user.id, { password }));
  } else {
    user = must(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
  }
  must(await admin.from("staff_tenant").upsert({ user_id: user.id, tenant_id: tenantId }));
  return { email, password, userId: user.id };
}
