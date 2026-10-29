import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { it } from "vitest";

const LIVE_PROJECT_REF = "ubniiattgwoouziejubu";

const url = process.env.SCRATCH_SUPABASE_URL;
const anonKey = process.env.SCRATCH_SUPABASE_ANON_KEY;
const serviceKey = process.env.SCRATCH_SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing SCRATCH_SUPABASE_* vars — copy .env.test.example to .env.test.local and fill it in.");
}
if (url.includes(LIVE_PROJECT_REF)) {
  throw new Error("Refusing to run database tests against the live Hugo project.");
}

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

// Bypasses RLS: used only for setup, cleanup, and checking what really
// happened after a blocked write (RLS often filters silently instead of erroring).
export const admin = createClient(url, serviceKey, clientOptions);

export const anonClient = () => createClient(url, anonKey, clientOptions);

// Every customer these tests create gets a code with this prefix, so cleanup
// also removes leftovers from crashed runs.
const CODE_PREFIX = "RLSTEST-";
const RUN = randomBytes(3).toString("hex").toUpperCase();
let codeCounter = 0;
export const testCode = () => `${CODE_PREFIX}${RUN}-${++codeCounter}`;

const must = ({ data, error }) => {
  if (error) throw error;
  return data;
};

export async function getTenantIds() {
  const rows = must(await admin.from("tenants").select("id, slug").in("slug", ["hugo", "daisy"]));
  const ids = Object.fromEntries(rows.map((r) => [r.slug, r.id]));
  if (!ids.hugo || !ids.daisy) throw new Error("Scratch project needs both the hugo and daisy tenants.");
  return ids;
}

// Creates (or reuses) a staff account mapped to the tenant, with a fresh random
// password each run so no staff password is stored anywhere.
export async function signInStaff(slug, tenantId) {
  const email = `rls-test-staff-${slug}@test.local`;
  const password = randomBytes(24).toString("base64url");

  const { users } = must(await admin.auth.admin.listUsers({ perPage: 1000 }));
  let user = users.find((u) => u.email === email);
  if (user) {
    must(await admin.auth.admin.updateUserById(user.id, { password }));
  } else {
    user = must(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
  }
  must(await admin.from("staff_tenant").upsert({ user_id: user.id, tenant_id: tenantId }));

  const client = anonClient();
  must(await client.auth.signInWithPassword({ email, password }));
  return { client, userId: user.id };
}

export async function seedCustomer(tenantId, fields = {}) {
  return must(
    await admin
      .from("customers")
      .insert({ name: "Test Victim", contact: `${testCode()}@test.local`, code: testCode(), stamps: 2, tenant_id: tenantId, ...fields })
      .select()
      .single()
  );
}

export async function readCustomer(id) {
  return must(await admin.from("customers").select("*").eq("id", id).maybeSingle());
}

export async function readCustomerByCode(code) {
  return must(await admin.from("customers").select("*").eq("code", code).maybeSingle());
}

export async function cleanup() {
  must(await admin.from("customers").delete().like("code", `${CODE_PREFIX}%`));
}

// A rule the database should enforce but currently doesn't. The test asserts
// the desired behaviour and is expected to fail; once the hole is fixed Vitest
// reports it as unexpectedly passing — then change knownHole back to it.
export const knownHole = (name, fn) => it.fails(`${name} [KNOWN HOLE]`, fn);
