// Birthday treat (developent-docs/birthday-treat-design.md): who can save a
// birthday and how often, and who can redeem the treat and when. Runs against
// the scratch Supabase project, like security.test.js.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { must } from "../support/scratch.js";
import { admin, cleanup, getTenantIds, readCustomer, seedCustomer, shopDay, signInCustomer, signInStaff, testCode } from "./helpers.js";

let tenants;
let hugoStaff;
let daisyStaff;

beforeAll(async () => {
  await cleanup();
  tenants = await getTenantIds();
  hugoStaff = await signInStaff("hugo", tenants.hugo);
  daisyStaff = await signInStaff("daisy", tenants.daisy);
});

afterAll(cleanup);

// The month and day of a shop day: monthDay(0) is today's.
const monthDay = (offset) => {
  const [, month, day] = shopDay(offset).split("-").map(Number);
  return { birthday_month: month, birthday_day: day };
};

// A fresh phone account with its own card.
const customerWithCard = async (fields = {}) => {
  const customer = await signInCustomer();
  const card = await seedCustomer(tenants.hugo, { user_id: customer.userId, stamps: 0, ...fields });
  return { ...customer, card };
};

const setBirthday = (who, card, month, day) =>
  who.client.from("customers").update({ birthday_month: month, birthday_day: day }).eq("id", card.id).select().single();
const redeemTreat = (who, card) => who.client.rpc("redeem_birthday_treat", { card_code: card.code });
const readTreats = async (customerId) => must(await admin.from("birthday_treats").select("*").eq("customer_id", customerId));
const birthdayOf = async (card) => {
  const { birthday_month, birthday_day, birthday_saves } = await readCustomer(card.id);
  return { birthday_month, birthday_day, birthday_saves };
};

describe("customers saving their birthday", () => {
  it("can save it, then change it once, and then it's locked", async () => {
    const alice = await customerWithCard();
    expect((await setBirthday(alice, alice.card, 3, 12)).error).toBeNull();
    expect(await birthdayOf(alice.card)).toEqual({ birthday_month: 3, birthday_day: 12, birthday_saves: 1 });

    expect((await setBirthday(alice, alice.card, 4, 2)).error).toBeNull();
    expect(await birthdayOf(alice.card)).toEqual({ birthday_month: 4, birthday_day: 2, birthday_saves: 2 });

    const { error } = await setBirthday(alice, alice.card, 5, 9);
    expect(error.message).toMatch(/locked/);
    const { error: removeError } = await setBirthday(alice, alice.card, null, null);
    expect(removeError.message).toMatch(/locked/);
    expect(await birthdayOf(alice.card)).toEqual({ birthday_month: 4, birthday_day: 2, birthday_saves: 2 });
  });

  it("removing it doesn't count as a save: the next save is the second, and locks it", async () => {
    const bob = await customerWithCard();
    await setBirthday(bob, bob.card, 3, 12);
    expect((await setBirthday(bob, bob.card, null, null)).error).toBeNull();
    expect(await birthdayOf(bob.card)).toEqual({ birthday_month: null, birthday_day: null, birthday_saves: 1 });

    await setBirthday(bob, bob.card, 3, 12);
    expect(await birthdayOf(bob.card)).toEqual({ birthday_month: 3, birthday_day: 12, birthday_saves: 2 });
    expect((await setBirthday(bob, bob.card, 3, 13)).error.message).toMatch(/locked/);
  });

  it("saving the same date again, or changing only their name, doesn't count", async () => {
    const carol = await customerWithCard();
    await setBirthday(carol, carol.card, 3, 12);
    await setBirthday(carol, carol.card, 3, 12);
    await carol.client.from("customers").update({ name: "Carol" }).eq("id", carol.card.id);
    expect((await birthdayOf(carol.card)).birthday_saves).toBe(1);
  });

  it("can't reset their own save count", async () => {
    const dan = await customerWithCard();
    await setBirthday(dan, dan.card, 3, 12);
    await setBirthday(dan, dan.card, 4, 12);
    await dan.client.from("customers").update({ birthday_saves: 0 }).eq("id", dan.card.id);
    expect((await birthdayOf(dan.card)).birthday_saves).toBe(2);
  });

  it("joining with a birthday counts as the first save, whatever the app sends", async () => {
    const erin = await signInCustomer();
    const { data, error } = await erin.client
      .from("customers")
      .insert({ name: "Erin", contact: `${testCode()}@test.local`, code: testCode(), stamps: 0, tenant_id: tenants.hugo, user_id: erin.userId, birthday_month: 3, birthday_day: 12, birthday_saves: 0 })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data.birthday_saves).toBe(1);
  });

  it("only real dates can be saved, with both day and month", async () => {
    const fay = await customerWithCard();
    expect((await setBirthday(fay, fay.card, 2, 30)).error).not.toBeNull();
    expect((await setBirthday(fay, fay.card, 13, 1)).error).not.toBeNull();
    expect((await fay.client.from("customers").update({ birthday_month: 3 }).eq("id", fay.card.id)).error).not.toBeNull();
    expect((await setBirthday(fay, fay.card, 2, 29)).error).toBeNull();
  });

  it("can't change someone else's birthday", async () => {
    const victim = await customerWithCard();
    const mallory = await customerWithCard();
    await setBirthday(mallory, victim.card, 3, 12);
    expect((await birthdayOf(victim.card)).birthday_month).toBeNull();
  });
});

describe("staff correcting a birthday", () => {
  it("can change a locked birthday; the customer stays locked", async () => {
    const gus = await customerWithCard();
    await setBirthday(gus, gus.card, 3, 12);
    await setBirthday(gus, gus.card, 4, 12);
    expect((await setBirthday(hugoStaff, gus.card, 5, 12)).error).toBeNull();
    expect(await birthdayOf(gus.card)).toEqual({ birthday_month: 5, birthday_day: 12, birthday_saves: 2 });
    expect((await setBirthday(gus, gus.card, 6, 12)).error.message).toMatch(/locked/);
  });

  it("another shop's staff can't", async () => {
    const card = await seedCustomer(tenants.hugo);
    await setBirthday(daisyStaff, card, 3, 12);
    expect((await birthdayOf(card)).birthday_month).toBeNull();
  });
});

describe("redeeming the birthday treat", () => {
  it("staff can redeem it on the birthday, once", async () => {
    const card = await seedCustomer(tenants.hugo, monthDay(0));
    expect((await redeemTreat(hugoStaff, card)).error).toBeNull();
    const treats = await readTreats(card.id);
    expect(treats).toHaveLength(1);
    expect(treats[0]).toMatchObject({ tenant_id: tenants.hugo, birthday_on: shopDay(0) });

    const { error } = await redeemTreat(hugoStaff, card);
    expect(error.message).toMatch(/already been redeemed/);
    expect(await readTreats(card.id)).toHaveLength(1);
  });

  it("the week runs from the birthday to 6 days after", async () => {
    const sixDaysAgo = await seedCustomer(tenants.hugo, monthDay(-6));
    expect((await redeemTreat(hugoStaff, sixDaysAgo)).error).toBeNull();
    expect((await readTreats(sixDaysAgo.id))[0].birthday_on).toBe(shopDay(-6));

    const sevenDaysAgo = await seedCustomer(tenants.hugo, monthDay(-7));
    const tomorrow = await seedCustomer(tenants.hugo, monthDay(1));
    expect((await redeemTreat(hugoStaff, sevenDaysAgo)).error.message).toMatch(/isn't their birthday week/);
    expect((await redeemTreat(hugoStaff, tomorrow)).error.message).toMatch(/isn't their birthday week/);
  });

  it("needs a birthday", async () => {
    const card = await seedCustomer(tenants.hugo);
    expect((await redeemTreat(hugoStaff, card)).error.message).toMatch(/No birthday/);
  });

  it("customers and another shop's staff can't redeem it", async () => {
    const helen = await customerWithCard(monthDay(0));
    expect((await redeemTreat(helen, helen.card)).error).not.toBeNull();
    expect((await redeemTreat(daisyStaff, helen.card)).error).not.toBeNull();
    expect(await readTreats(helen.card.id)).toHaveLength(0);
  });

  it("customers see only their own treats; staff only their shop's", async () => {
    const ivy = await customerWithCard(monthDay(0));
    const other = await seedCustomer(tenants.hugo, monthDay(0));
    await redeemTreat(hugoStaff, ivy.card);
    await redeemTreat(hugoStaff, other);

    const { data: own } = await ivy.client.from("birthday_treats").select("customer_id");
    expect(own).toEqual([{ customer_id: ivy.card.id }]);
    const { data: daisySees } = await daisyStaff.client.from("birthday_treats").select("customer_id").in("customer_id", [ivy.card.id, other.id]);
    expect(daisySees).toEqual([]);
    const { data: hugoSees } = await hugoStaff.client.from("birthday_treats").select("customer_id").in("customer_id", [ivy.card.id, other.id]);
    expect(hugoSees).toHaveLength(2);
  });

  it("nobody can write treats directly", async () => {
    const jack = await customerWithCard(monthDay(0));
    const row = { customer_id: jack.card.id, tenant_id: tenants.hugo, birthday_on: shopDay(0) };
    await jack.client.from("birthday_treats").insert(row);
    await hugoStaff.client.from("birthday_treats").insert(row);
    expect(await readTreats(jack.card.id)).toHaveLength(0);
  });

  it("deleting the account deletes its treats", async () => {
    const kim = await customerWithCard(monthDay(0));
    await redeemTreat(hugoStaff, kim.card);
    must(await kim.client.from("customers").delete().eq("id", kim.card.id));
    expect(await readTreats(kim.card.id)).toHaveLength(0);
  });
});

describe("move card carries the birthday and treats", () => {
  it("a new card without a birthday takes the old card's, with its saves and treats", async () => {
    const oldCard = await seedCustomer(tenants.hugo, { ...monthDay(0), birthday_saves: 2 });
    await redeemTreat(hugoStaff, oldCard);
    const newPhone = await customerWithCard();

    expect((await hugoStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: newPhone.card.code })).error).toBeNull();
    expect(await birthdayOf(newPhone.card)).toEqual({ ...monthDay(0), birthday_saves: 2 });
    expect(await readTreats(newPhone.card.id)).toHaveLength(1);
  });

  it("a new card keeps its own birthday; a treat for a year it already has isn't doubled", async () => {
    const oldCard = await seedCustomer(tenants.hugo, monthDay(0));
    await redeemTreat(hugoStaff, oldCard);
    const newPhone = await customerWithCard(monthDay(-1));
    await redeemTreat(hugoStaff, newPhone.card);

    expect((await hugoStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: newPhone.card.code })).error).toBeNull();
    expect(await birthdayOf(newPhone.card)).toMatchObject(monthDay(-1));
    expect(await readTreats(newPhone.card.id)).toHaveLength(1);
  });
});
