// Who can read and change what in the shared multi-tenant database.
// Runs against the scratch Supabase project as three kinds of user: an
// anonymous app visitor, Hugo's staff, and Daisy's staff. Tests describe the
// rules we want; ones the database doesn't enforce yet are marked knownHole.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonClient,
  cleanup,
  getTenantIds,
  knownHole,
  readCustomer,
  readCustomerByCode,
  seedCustomer,
  signInStaff,
  testCode,
} from "./helpers.js";

let tenants;
let hugoStaff;
let daisyStaff;
let anon;

beforeAll(async () => {
  await cleanup();
  tenants = await getTenantIds();
  hugoStaff = await signInStaff("hugo", tenants.hugo);
  daisyStaff = await signInStaff("daisy", tenants.daisy);
  anon = anonClient();
});

afterAll(cleanup);

describe("tenants (shop branding)", () => {
  it("anyone can read a shop's branding", async () => {
    const { data } = await anon.from("tenants").select("slug, brand_name").eq("slug", "hugo").single();
    expect(data.brand_name).toBeTruthy();
  });

  it("anonymous visitors cannot rename a shop", async () => {
    const before = (await admin.from("tenants").select("brand_name").eq("id", tenants.hugo).single()).data;
    await anon.from("tenants").update({ brand_name: "Hacked" }).eq("id", tenants.hugo);
    const after = (await admin.from("tenants").select("brand_name").eq("id", tenants.hugo).single()).data;
    expect(after.brand_name).toBe(before.brand_name);
  });

  it("anonymous visitors cannot create or delete shops", async () => {
    await anon.from("tenants").insert({ slug: "rlstest-shop", brand_name: "X", full_brand_name: "X", code_prefix: "RLSX" });
    await anon.from("tenants").delete().eq("id", tenants.daisy);
    const { data } = await admin.from("tenants").select("slug").in("slug", ["rlstest-shop", "daisy"]);
    expect(data.map((r) => r.slug)).toEqual(["daisy"]);
  });

  it("staff cannot change any shop's branding, even their own", async () => {
    const before = (await admin.from("tenants").select("config").eq("id", tenants.hugo).single()).data;
    await hugoStaff.client.from("tenants").update({ config: { hacked: true } }).eq("id", tenants.hugo);
    const after = (await admin.from("tenants").select("config").eq("id", tenants.hugo).single()).data;
    expect(after.config).toEqual(before.config);
  });
});

describe("staff_tenant (which shop a staff login belongs to)", () => {
  it("anonymous visitors cannot see staff mappings", async () => {
    const { data } = await anon.from("staff_tenant").select("*");
    expect(data ?? []).toEqual([]);
  });

  it("staff see only their own mapping", async () => {
    const { data } = await hugoStaff.client.from("staff_tenant").select("*");
    expect(data).toEqual([{ user_id: hugoStaff.userId, tenant_id: tenants.hugo }]);
  });

  it("staff cannot move themselves to another shop", async () => {
    await hugoStaff.client.from("staff_tenant").update({ tenant_id: tenants.daisy }).eq("user_id", hugoStaff.userId);
    const { data } = await admin.from("staff_tenant").select("tenant_id").eq("user_id", hugoStaff.userId).single();
    expect(data.tenant_id).toBe(tenants.hugo);
  });
});

describe("customers — staff", () => {
  it("see their own shop's customers and none of another shop's", async () => {
    const mine = await seedCustomer(tenants.hugo);
    const theirs = await seedCustomer(tenants.daisy);
    const { data } = await hugoStaff.client.from("customers").select("id");
    const ids = data.map((r) => r.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);
  });

  it("can add a stamp for their own shop's customer", async () => {
    const customer = await seedCustomer(tenants.hugo, { stamps: 2 });
    await hugoStaff.client.from("customers").update({ stamps: 3 }).eq("code", customer.code);
    expect((await readCustomer(customer.id)).stamps).toBe(3);
  });

  it("cannot look up another shop's customer by code", async () => {
    const theirs = await seedCustomer(tenants.daisy);
    const { data } = await hugoStaff.client.from("customers").select("*").eq("code", theirs.code);
    expect(data ?? []).toEqual([]);
  });

  it("cannot change another shop's customer's stamps", async () => {
    const theirs = await seedCustomer(tenants.daisy, { stamps: 2 });
    await hugoStaff.client.from("customers").update({ stamps: 8 }).eq("code", theirs.code);
    expect((await readCustomer(theirs.id)).stamps).toBe(2);
  });

  it("cannot move their own customer to another shop", async () => {
    // "Allow public update" has no WITH CHECK, but Postgres also checks the
    // updated row against SELECT policies, and staff can't see other shops'
    // rows — so this fails with 42501. Anonymous visitors *can* see every row,
    // which is why the same move is a known hole for them below.
    const mine = await seedCustomer(tenants.hugo);
    await hugoStaff.client.from("customers").update({ tenant_id: tenants.daisy }).eq("id", mine.id);
    expect((await readCustomer(mine.id)).tenant_id).toBe(tenants.hugo);
  });

  it("can sign a customer up to their own shop", async () => {
    const code = testCode();
    const { error } = await hugoStaff.client.from("customers").insert({ name: "Walk-in", code, tenant_id: tenants.hugo });
    expect(error).toBeNull();
    expect((await readCustomerByCode(code)).tenant_id).toBe(tenants.hugo);
  });

  it("cannot sign a customer up to another shop", async () => {
    const code = testCode();
    await hugoStaff.client.from("customers").insert({ name: "Walk-in", code, tenant_id: tenants.daisy });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("cannot delete another shop's customer", async () => {
    const theirs = await seedCustomer(tenants.daisy);
    await hugoStaff.client.from("customers").delete().eq("id", theirs.id);
    expect(await readCustomer(theirs.id)).not.toBeNull();
  });

  it("Daisy staff are scoped the same way (no Hugo customers)", async () => {
    const hugoCustomer = await seedCustomer(tenants.hugo);
    const { data } = await daisyStaff.client.from("customers").select("id");
    expect(data.map((r) => r.id)).not.toContain(hugoCustomer.id);
  });
});

describe("customers — anonymous app visitors", () => {
  it("can sign up to a shop with an empty card", async () => {
    const code = testCode();
    const { error } = await anon.from("customers").insert({ name: "New Customer", code, stamps: 0, tenant_id: tenants.daisy });
    expect(error).toBeNull();
    expect((await readCustomerByCode(code)).tenant_id).toBe(tenants.daisy);
  });

  // Today the saved code *is* the customer's proof of identity. Once anonymous
  // sign-in lands, this becomes "can read the card linked to their own login".
  it("can look up their own card by its code", async () => {
    const own = await seedCustomer(tenants.hugo);
    const { data } = await anon.from("customers").select("*").eq("code", own.code).single();
    expect(data.id).toBe(own.id);
  });

  knownHole("cannot sign up with stamps already on the card", async () => {
    const code = testCode();
    await anon.from("customers").insert({ name: "Cheater", code, stamps: 9, tenant_id: tenants.hugo });
    const row = await readCustomerByCode(code);
    expect(row?.stamps ?? 0).toBe(0);
  });

  knownHole("cannot sign up without naming a shop", async () => {
    // The temporary customers_default_tenant trigger files these under hugo.
    const code = testCode();
    await anon.from("customers").insert({ name: "No Shop", code });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  knownHole("cannot list every customer", async () => {
    const victim = await seedCustomer(tenants.daisy);
    const { data } = await anon.from("customers").select("id");
    expect((data ?? []).map((r) => r.id)).not.toContain(victim.id);
  });

  knownHole("cannot find someone else's card by their phone number or email", async () => {
    // The app's "rejoin" flow does exactly this lookup (App.jsx handleJoin).
    const victim = await seedCustomer(tenants.hugo);
    const { data } = await anon.from("customers").select("*").ilike("contact", victim.contact);
    expect(data ?? []).toEqual([]);
  });

  knownHole("cannot add stamps to a card", async () => {
    const victim = await seedCustomer(tenants.hugo, { stamps: 2 });
    await anon.from("customers").update({ stamps: 9 }).eq("code", victim.code);
    expect((await readCustomer(victim.id)).stamps).toBe(2);
  });

  knownHole("cannot change someone else's name or contact", async () => {
    const victim = await seedCustomer(tenants.hugo);
    await anon.from("customers").update({ name: "Hijacked", contact: "attacker@test.local" }).eq("id", victim.id);
    const after = await readCustomer(victim.id);
    expect([after.name, after.contact]).toEqual([victim.name, victim.contact]);
  });

  knownHole("cannot move a card to another shop", async () => {
    const victim = await seedCustomer(tenants.hugo);
    await anon.from("customers").update({ tenant_id: tenants.daisy }).eq("id", victim.id);
    expect((await readCustomer(victim.id)).tenant_id).toBe(tenants.hugo);
  });

  knownHole("cannot delete someone else's card", async () => {
    const victim = await seedCustomer(tenants.daisy);
    await anon.from("customers").delete().eq("id", victim.id);
    expect(await readCustomer(victim.id)).not.toBeNull();
  });
});
