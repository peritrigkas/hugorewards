// Who can read and change what in the shared multi-tenant database.
// Runs against the scratch Supabase project as: a visitor with no session,
// customers (anonymous accounts, as the app creates on joining), Hugo staff
// and Daisy staff. Rules the database doesn't enforce yet are marked knownHole.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  admin,
  anonClient,
  cleanup,
  ensureStaffAccount,
  getTenantIds,
  readCustomer,
  readCustomerByCode,
  seedCustomer,
  signInCustomer,
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
    // "Staff update own tenant" checks the updated row's tenant too.
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

describe("customers — not signed in", () => {
  // The app signs in (anonymously) before touching customers, so a visitor
  // with no session at all gets nothing.
  it("cannot see any customers", async () => {
    await seedCustomer(tenants.hugo);
    const { data } = await anon.from("customers").select("id");
    expect(data ?? []).toEqual([]);
  });

  it("cannot sign up", async () => {
    const code = testCode();
    await anon.from("customers").insert({ name: "No Session", code, stamps: 0, tenant_id: tenants.hugo });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("cannot change or delete a card", async () => {
    const victim = await seedCustomer(tenants.hugo, { stamps: 2 });
    await anon.from("customers").update({ stamps: 9 }).eq("id", victim.id);
    await anon.from("customers").delete().eq("id", victim.id);
    expect((await readCustomer(victim.id))?.stamps).toBe(2);
  });

  it("cannot use the contact check or move cards", async () => {
    const check = await anon.rpc("contact_has_other_card", { shop_id: tenants.hugo, contact: "x" });
    const move = await anon.rpc("move_card", { old_code: "A", new_code: "B" });
    expect(check.error).not.toBeNull();
    expect(move.error).not.toBeNull();
  });
});

describe("bot check (CAPTCHA)", () => {
  // Needs CAPTCHA switched on in the scratch project (see tests/README.md).
  it("a phone account can't be created without passing the bot check", async () => {
    const { data, error } = await anonClient().auth.signInAnonymously();
    if (data.user) await admin.auth.admin.deleteUser(data.user.id); // don't leak it if the check is off
    expect(error?.message).toMatch(/captcha/i);
    expect(data.user).toBeNull();
  });

  it("staff can't sign in without passing the bot check, even with the right password", async () => {
    const { email, password } = await ensureStaffAccount("rls-test-captcha", "hugo", tenants.hugo);
    const { data, error } = await anonClient().auth.signInWithPassword({ email, password });
    expect(error?.message).toMatch(/captcha/i);
    expect(data.session).toBeNull();
  });
});

describe("customers — customer accounts (anonymous sign-in)", () => {
  let alice;
  let bob;

  beforeAll(async () => {
    alice = await signInCustomer();
    bob = await signInCustomer();
  });

  // A fresh account with its own card (one card per shop per account).
  const customerWithCard = async (tenantId, fields = {}) => {
    const customer = await signInCustomer();
    const card = await seedCustomer(tenantId, { user_id: customer.userId, ...fields });
    return { ...customer, card };
  };

  it("can join a shop with an empty card linked to their account", async () => {
    const code = testCode();
    const { error } = await alice.client
      .from("customers")
      .insert({ name: "Alice", contact: `${code}@test.local`, code, stamps: 0, tenant_id: tenants.daisy, user_id: alice.userId });
    expect(error).toBeNull();
    const row = await readCustomerByCode(code);
    expect([row.tenant_id, row.user_id]).toEqual([tenants.daisy, alice.userId]);
  });

  it("can have only one card per shop", async () => {
    const { client, userId } = await customerWithCard(tenants.hugo);
    const code = testCode();
    await client.from("customers").insert({ name: "Second", code, stamps: 0, tenant_id: tenants.hugo, user_id: userId });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("see only their own card", async () => {
    const { client, card } = await customerWithCard(tenants.hugo);
    await seedCustomer(tenants.hugo);
    await seedCustomer(tenants.daisy);
    const { data } = await client.from("customers").select("id");
    expect(data.map((r) => r.id)).toEqual([card.id]);
  });

  it("cannot read someone else's card, even knowing its code", async () => {
    const victim = await seedCustomer(tenants.hugo);
    const { data } = await alice.client.from("customers").select("*").eq("code", victim.code);
    expect(data ?? []).toEqual([]);
  });

  it("cannot find someone else's card by their phone number or email", async () => {
    const victim = await seedCustomer(tenants.hugo);
    const { data } = await alice.client.from("customers").select("*").ilike("contact", victim.contact);
    expect(data ?? []).toEqual([]);
  });

  it("cannot sign up with stamps already on the card", async () => {
    const code = testCode();
    await bob.client.from("customers").insert({ name: "Cheater", code, stamps: 9, tenant_id: tenants.hugo, user_id: bob.userId });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("cannot sign up without naming a shop", async () => {
    const code = testCode();
    await bob.client.from("customers").insert({ name: "No Shop", code, stamps: 0, user_id: bob.userId });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("cannot create a card on someone else's account", async () => {
    const code = testCode();
    await alice.client.from("customers").insert({ name: "Planted", code, stamps: 0, tenant_id: tenants.hugo, user_id: bob.userId });
    expect(await readCustomerByCode(code)).toBeNull();
  });

  it("can change their own name and contact", async () => {
    const { client, card } = await customerWithCard(tenants.hugo);
    const { error } = await client.from("customers").update({ name: "Renamed", contact: "new@test.local" }).eq("id", card.id);
    expect(error).toBeNull();
    const after = await readCustomer(card.id);
    expect([after.name, after.contact]).toEqual(["Renamed", "new@test.local"]);
  });

  it("cannot add stamps to their own card", async () => {
    const { client, card } = await customerWithCard(tenants.hugo, { stamps: 2 });
    await client.from("customers").update({ stamps: 9 }).eq("id", card.id);
    expect((await readCustomer(card.id)).stamps).toBe(2);
  });

  it("cannot move their own card to another shop or change its code", async () => {
    const { client, card } = await customerWithCard(tenants.hugo);
    await client.from("customers").update({ tenant_id: tenants.daisy }).eq("id", card.id);
    await client.from("customers").update({ code: testCode() }).eq("id", card.id);
    const after = await readCustomer(card.id);
    expect([after.tenant_id, after.code]).toEqual([tenants.hugo, card.code]);
  });

  it("cannot add stamps to, rename, move or delete someone else's card", async () => {
    const victim = await seedCustomer(tenants.hugo, { stamps: 2 });
    await alice.client.from("customers").update({ stamps: 9 }).eq("id", victim.id);
    await alice.client.from("customers").update({ name: "Hijacked" }).eq("id", victim.id);
    await alice.client.from("customers").update({ tenant_id: tenants.daisy }).eq("id", victim.id);
    await alice.client.from("customers").delete().eq("id", victim.id);
    const after = await readCustomer(victim.id);
    expect([after.stamps, after.name, after.tenant_id]).toEqual([2, victim.name, tenants.hugo]);
  });

  it("can delete their own card", async () => {
    const { client, card } = await customerWithCard(tenants.daisy);
    const { count } = await client.from("customers").delete({ count: "exact" }).eq("id", card.id);
    expect(count).toBe(1);
    expect(await readCustomer(card.id)).toBeNull();
  });

  describe("already-have-a-card check", () => {
    const check = (client, tenantId, contact) => client.rpc("contact_has_other_card", { shop_id: tenantId, contact });

    it("is true when another card in the shop has the same contact, ignoring spaces and case", async () => {
      const contact = `${testCode()} Old@Test.local`;
      await seedCustomer(tenants.hugo, { contact });
      const { data } = await check(alice.client, tenants.hugo, contact.toUpperCase().replace(" ", "   "));
      expect(data).toBe(true);
    });

    it("is false for the customer's own card and for other shops", async () => {
      const contact = `${testCode()}@test.local`;
      const { client } = await customerWithCard(tenants.hugo, { contact });
      await seedCustomer(tenants.daisy, { contact });
      expect((await check(client, tenants.hugo, contact)).data).toBe(false);
    });

    it("answers only true/false, never details of the other card", async () => {
      const contact = `${testCode()}@test.local`;
      await seedCustomer(tenants.hugo, { contact });
      const { data } = await check(alice.client, tenants.hugo, contact);
      expect(data).toBe(true);
    });
  });
});

describe("move card (customer on a new phone)", () => {
  // The card on the customer's current phone keeps its code; the old card's
  // stamps are added to it and the old card is removed.
  it("staff add an old card's stamps to the new phone's card; the old card is removed", async () => {
    const oldCard = await seedCustomer(tenants.hugo, { stamps: 5 });
    const newPhone = await signInCustomer();
    const newCard = await seedCustomer(tenants.hugo, { user_id: newPhone.userId, stamps: 0 });

    const { error } = await hugoStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: newCard.code });
    expect(error).toBeNull();
    expect(await readCustomer(oldCard.id)).toBeNull();

    const { data } = await newPhone.client.from("customers").select("code, stamps").single();
    expect(data).toEqual({ code: newCard.code, stamps: 5 });
  });

  it("never loses stamps: stamps already on the new card are added to, even if the cards are picked the wrong way round", async () => {
    const phoneA = await signInCustomer();
    const cardA = await seedCustomer(tenants.hugo, { user_id: phoneA.userId, stamps: 4 });
    const phoneB = await signInCustomer();
    const cardB = await seedCustomer(tenants.hugo, { user_id: phoneB.userId, stamps: 3 });

    const { error } = await hugoStaff.client.rpc("move_card", { old_code: cardA.code, new_code: cardB.code });
    expect(error).toBeNull();
    expect(await readCustomer(cardA.id)).toBeNull();
    expect((await readCustomer(cardB.id)).stamps).toBe(7);
  });

  it("another shop's staff cannot move the card", async () => {
    const oldCard = await seedCustomer(tenants.hugo, { stamps: 2 });
    const newPhone = await signInCustomer();
    const newCard = await seedCustomer(tenants.hugo, { user_id: newPhone.userId, stamps: 0 });
    const { error } = await daisyStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: newCard.code });
    expect(error).not.toBeNull();
    expect((await readCustomer(oldCard.id)).stamps).toBe(2);
    expect((await readCustomer(newCard.id)).stamps).toBe(0);
  });

  it("customers cannot move cards, not even onto their own phone", async () => {
    const oldCard = await seedCustomer(tenants.hugo, { stamps: 7 });
    const thief = await signInCustomer();
    const thiefCard = await seedCustomer(tenants.hugo, { user_id: thief.userId, stamps: 0 });
    const { error } = await thief.client.rpc("move_card", { old_code: oldCard.code, new_code: thiefCard.code });
    expect(error).not.toBeNull();
    expect((await readCustomer(oldCard.id)).stamps).toBe(7);
    expect((await readCustomer(thiefCard.id)).stamps).toBe(0);
  });

  it("is refused when the new card isn't linked to a phone", async () => {
    const oldCard = await seedCustomer(tenants.hugo);
    const walkIn = await seedCustomer(tenants.hugo);
    const { error } = await hugoStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: walkIn.code });
    expect(error?.message).toMatch(/not linked to a phone/);
    expect(await readCustomer(oldCard.id)).not.toBeNull();
    expect(await readCustomer(walkIn.id)).not.toBeNull();
  });
});
