import { randomBytes } from "node:crypto";
import { it } from "vitest";
import { admin, anonClient, ensureStaffAccount, must } from "../support/scratch.js";

export { admin, anonClient, getTenantIds } from "../support/scratch.js";

// Every customer these tests create gets a code with this prefix, so cleanup
// also removes leftovers from crashed runs.
const CODE_PREFIX = "RLSTEST-";
const RUN = randomBytes(3).toString("hex").toUpperCase();
let codeCounter = 0;
export const testCode = () => `${CODE_PREFIX}${RUN}-${++codeCounter}`;

// Anonymous accounts created by this run, deleted in cleanup().
const customerUserIds = [];

// A customer's phone: a fresh anonymous account, as the app creates on joining.
export async function signInCustomer() {
  const client = anonClient();
  const { user } = must(await client.auth.signInAnonymously());
  customerUserIds.push(user.id);
  return { client, userId: user.id };
}

export async function signInStaff(slug, tenantId) {
  const { email, password, userId } = await ensureStaffAccount("rls-test", slug, tenantId);
  const client = anonClient();
  must(await client.auth.signInWithPassword({ email, password }));
  return { client, userId };
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
  for (const id of customerUserIds.splice(0)) {
    must(await admin.auth.admin.deleteUser(id));
  }
}

// A rule the database should enforce but currently doesn't. The test asserts
// the desired behaviour and is expected to fail; once the hole is fixed Vitest
// reports it as unexpectedly passing — then change knownHole back to it.
export const knownHole = (name, fn) => it.fails(`${name} [KNOWN HOLE]`, fn);
