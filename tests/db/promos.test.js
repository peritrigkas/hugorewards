// Promo cards and past cards (developent-docs/promo-cards-design.md):
// who can manage promos, add stamps and redeem, and what each side can read.
// Runs against the scratch Supabase project, like security.test.js.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { must } from "../support/scratch.js";
import {
  admin,
  anonClient,
  cleanup,
  getTenantIds,
  readCustomer,
  readHistory,
  readPromoStamps,
  seedCustomer,
  seedPromo,
  shopDay,
  signInCustomer,
  signInStaff,
} from "./helpers.js";

let tenants;
let hugoStaff;
let daisyStaff;
let anon;

// One promo per phase in each shop's calendar (one promo at a time, so the
// date ranges never overlap). Tests that change a promo make their own, far
// in the future.
let running; // today to +30
let inClaimWindow; // ended yesterday, 14 days to claim
let finished; // ended 40 days ago, claim window over
let scheduled; // starts in 31 days
let daisyRunning;

let nextFutureDay = 100;
const futurePromo = (tenantId, fields = {}) => {
  const from = (nextFutureDay += 3);
  return seedPromo(tenantId, { from, to: from + 1, ...fields });
};

beforeAll(async () => {
  await cleanup();
  tenants = await getTenantIds();
  hugoStaff = await signInStaff("hugo", tenants.hugo);
  daisyStaff = await signInStaff("daisy", tenants.daisy);
  anon = anonClient();
  running = await seedPromo(tenants.hugo, { from: 0, to: 30 });
  inClaimWindow = await seedPromo(tenants.hugo, { from: -10, to: -1 });
  finished = await seedPromo(tenants.hugo, { from: -60, to: -40 });
  scheduled = await seedPromo(tenants.hugo, { from: 31, to: 40 });
  daisyRunning = await seedPromo(tenants.daisy, { from: 0, to: 30 });
});

afterAll(cleanup);

const stamp = (who, card, promo) => who.client.rpc("add_stamp", { card_code: card.code, promo: promo?.id ?? null });
const redeem = (who, card, promo) => who.client.rpc("redeem", { card_code: card.code, promo: promo?.id ?? null });
const redeemReward = (who, reward) => who.client.rpc("redeem_reward", { reward: reward.id });
const daysFromNow = (iso) => (new Date(iso) - Date.now()) / (24 * 60 * 60 * 1000);
const giveStamps = (card, promo, stamps) => admin.from("promo_stamps").insert({ customer_id: card.id, promo_id: promo.id, stamps });

describe("promos", () => {
  it("anyone can read a shop's promos, even without signing in", async () => {
    const { data } = await anon.from("promos").select("id").eq("id", running.id);
    expect(data).toEqual([{ id: running.id }]);
  });

  it("staff can create, edit and delete promos for their own shop", async () => {
    const from = (nextFutureDay += 3);
    const { data: promo, error } = await hugoStaff.client
      .from("promos")
      .insert({ name: "RLSTEST Bowls", icon: "salad", stamps_for_reward: 5, starts_on: shopDay(from), ends_on: shopDay(from + 1), tenant_id: tenants.hugo })
      .select()
      .single();
    expect(error).toBeNull();

    await hugoStaff.client.from("promos").update({ stamps_for_reward: 6 }).eq("id", promo.id);
    expect((await admin.from("promos").select("stamps_for_reward").eq("id", promo.id).single()).data.stamps_for_reward).toBe(6);

    const { count } = await hugoStaff.client.from("promos").delete({ count: "exact" }).eq("id", promo.id);
    expect(count).toBe(1);
  });

  it("staff cannot create, edit or delete another shop's promos", async () => {
    const from = (nextFutureDay += 3);
    const { error } = await hugoStaff.client
      .from("promos")
      .insert({ name: "RLSTEST Planted", icon: "cookie", stamps_for_reward: 4, starts_on: shopDay(from), ends_on: shopDay(from), tenant_id: tenants.daisy });
    expect(error).not.toBeNull();

    await hugoStaff.client.from("promos").update({ name: "RLSTEST Hijacked" }).eq("id", daisyRunning.id);
    await hugoStaff.client.from("promos").delete().eq("id", daisyRunning.id);
    const { data } = await admin.from("promos").select("name").eq("id", daisyRunning.id).single();
    expect(data.name).toBe(daisyRunning.name);
  });

  it("customers cannot create, edit or delete promos", async () => {
    const customer = await signInCustomer();
    const from = (nextFutureDay += 3);
    const { error } = await customer.client
      .from("promos")
      .insert({ name: "RLSTEST Mine", icon: "cookie", stamps_for_reward: 1, starts_on: shopDay(from), ends_on: shopDay(from), tenant_id: tenants.hugo });
    expect(error).not.toBeNull();

    await customer.client.from("promos").update({ stamps_for_reward: 1 }).eq("id", running.id);
    await customer.client.from("promos").delete().eq("id", scheduled.id);
    const { data } = await admin.from("promos").select("id, stamps_for_reward").in("id", [running.id, scheduled.id]);
    expect(data).toHaveLength(2);
    expect(data.find((p) => p.id === running.id).stamps_for_reward).toBe(running.stamps_for_reward);
  });

  it("only one promo runs at a time in a shop: overlapping dates are refused", async () => {
    const { error } = await hugoStaff.client
      .from("promos")
      .insert({ name: "RLSTEST Overlap", icon: "cookie", stamps_for_reward: 4, starts_on: shopDay(30), ends_on: shopDay(31), tenant_id: tenants.hugo });
    expect(error).not.toBeNull();
  });

  it("another shop can run a promo on the same dates", async () => {
    const promo = await seedPromo(tenants.daisy, { from: 31, to: 40 });
    expect(promo.id).toBeTruthy();
  });

  it("must need 1 to 20 stamps and end on or after its start", async () => {
    const from = (nextFutureDay += 3);
    const base = { name: "RLSTEST Bad", icon: "cookie", tenant_id: tenants.hugo };
    const results = await Promise.all([
      hugoStaff.client.from("promos").insert({ ...base, stamps_for_reward: 0, starts_on: shopDay(from), ends_on: shopDay(from) }),
      hugoStaff.client.from("promos").insert({ ...base, stamps_for_reward: 21, starts_on: shopDay(from), ends_on: shopDay(from) }),
      hugoStaff.client.from("promos").insert({ ...base, stamps_for_reward: 4, starts_on: shopDay(from + 1), ends_on: shopDay(from) }),
    ]);
    expect(results.map((r) => r.error !== null)).toEqual([true, true, true]);
  });

  it("once anyone has a stamp, stamps needed can't change and the promo can't be deleted", async () => {
    const promo = await futurePromo(tenants.hugo);
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    await giveStamps(card, promo, 1);

    const change = await hugoStaff.client.from("promos").update({ stamps_for_reward: 2 }).eq("id", promo.id);
    const remove = await hugoStaff.client.from("promos").delete().eq("id", promo.id);
    expect(change.error?.message).toMatch(/stamps needed can't change/);
    expect(remove.error?.message).toMatch(/can't be deleted/);

    const rename = await hugoStaff.client.from("promos").update({ name: "RLSTEST Renamed" }).eq("id", promo.id);
    expect(rename.error).toBeNull();
  });
});

describe("adding stamps", () => {
  it("staff add promo stamps, starting a promo card on the first one", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    expect((await stamp(hugoStaff, card, running)).data).toBe(1);
    expect((await stamp(hugoStaff, card, running)).data).toBe(2);
    expect(await readPromoStamps(card.id)).toEqual([{ promo_id: running.id, stamps: 2 }]);
    expect((await readCustomer(card.id)).stamps).toBe(0);
  });

  it("a stamp on a full promo card moves it to history as waiting and starts a new card", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    await giveStamps(card, running, running.stamps_for_reward);
    expect((await stamp(hugoStaff, card, running)).data).toBe(1);
    expect(await readPromoStamps(card.id)).toEqual([{ promo_id: running.id, stamps: 1 }]);
    const [entry] = await readHistory(card.id);
    expect(entry).toMatchObject({ promo_id: running.id, card_name: running.name, stamps: 4, stamps_for_reward: 4, outcome: "ready" });
    expect(daysFromNow(entry.claim_by)).toBeGreaterThanOrEqual(28);
    expect(daysFromNow(entry.claim_by)).toBeLessThanOrEqual(31);
  });

  it("staff add main-card stamps; a stamp on a full card moves it to history as waiting", async () => {
    const hugoCard = await seedCustomer(tenants.hugo, { stamps: 7 });
    expect((await stamp(hugoStaff, hugoCard)).data).toBe(8);
    expect((await stamp(hugoStaff, hugoCard)).data).toBe(9); // Hugo: the default, 9
    expect(await readHistory(hugoCard.id)).toEqual([]);
    expect((await stamp(hugoStaff, hugoCard)).data).toBe(1);

    const { brand_name } = (await admin.from("tenants").select("brand_name").eq("id", tenants.hugo).single()).data;
    const [entry] = await readHistory(hugoCard.id);
    expect(entry).toMatchObject({ promo_id: null, card_name: brand_name, stamps: 9, stamps_for_reward: 9, outcome: "ready" });
    expect(daysFromNow(entry.claim_by)).toBeGreaterThanOrEqual(180);
    expect(daysFromNow(entry.claim_by)).toBeLessThanOrEqual(185);

    const daisyCard = await seedCustomer(tenants.daisy, { stamps: 7 });
    expect((await stamp(daisyStaff, daisyCard)).data).toBe(8); // Daisy's config: 8
    expect((await stamp(daisyStaff, daisyCard)).data).toBe(1);
    expect(await readHistory(daisyCard.id)).toMatchObject([{ stamps: 8, outcome: "ready" }]);
  });

  it("keeps the extra stamps of an over-full card on the new card", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 12 }); // e.g. after moving stamps
    expect((await stamp(hugoStaff, card)).data).toBe(4);
    expect(await readHistory(card.id)).toMatchObject([{ stamps: 9, outcome: "ready" }]);
  });

  it.each([
    ["hasn't started", () => scheduled],
    ["has ended", () => inClaimWindow],
  ])("can't stamp a promo that %s", async (_, promo) => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    const { error } = await stamp(hugoStaff, card, promo());
    expect(error?.message).toMatch(/isn't running/);
    expect(await readPromoStamps(card.id)).toEqual([]);
  });

  it("staff can't stamp another shop's card or use another shop's promo", async () => {
    const daisyCard = await seedCustomer(tenants.daisy, { stamps: 0 });
    const hugoCard = await seedCustomer(tenants.hugo, { stamps: 0 });
    const results = await Promise.all([stamp(hugoStaff, daisyCard), stamp(hugoStaff, daisyCard, daisyRunning), stamp(hugoStaff, hugoCard, daisyRunning)]);
    expect(results.map((r) => r.error !== null)).toEqual([true, true, true]);
    expect((await readCustomer(daisyCard.id)).stamps).toBe(0);
    expect(await readPromoStamps(daisyCard.id)).toEqual([]);
    expect(await readPromoStamps(hugoCard.id)).toEqual([]);
  });

  it("customers can't add stamps, by the function or by writing the table", async () => {
    const customer = await signInCustomer();
    const card = await seedCustomer(tenants.hugo, { user_id: customer.userId, stamps: 0 });
    const viaFunction = await stamp(customer, card, running);
    const viaMain = await stamp(customer, card);
    await customer.client.from("promo_stamps").insert({ customer_id: card.id, promo_id: running.id, stamps: 4 });
    expect(viaFunction.error).not.toBeNull();
    expect(viaMain.error).not.toBeNull();
    expect(await readPromoStamps(card.id)).toEqual([]);
    expect((await readCustomer(card.id)).stamps).toBe(0);
  });

  it("visitors without a session can't add stamps", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    const { error } = await anon.rpc("add_stamp", { card_code: card.code, promo: running.id });
    expect(error).not.toBeNull();
    expect(await readPromoStamps(card.id)).toEqual([]);
  });
});

describe("redeeming", () => {
  it("is refused for a card that isn't full", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 8 });
    await giveStamps(card, running, running.stamps_for_reward - 1);
    const main = await redeem(hugoStaff, card);
    const promo = await redeem(hugoStaff, card, running);
    expect(main.error?.message).toMatch(/isn't full/);
    expect(promo.error?.message).toMatch(/isn't full/);
    expect((await readCustomer(card.id)).stamps).toBe(8);
    expect(await readHistory(card.id)).toEqual([]);
  });

  it("a full main card is recorded in history and emptied in one step", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 9 });
    const { error } = await redeem(hugoStaff, card);
    expect(error).toBeNull();
    expect((await readCustomer(card.id)).stamps).toBe(0);

    const { brand_name } = (await admin.from("tenants").select("brand_name").eq("id", tenants.hugo).single()).data;
    const [entry] = await readHistory(card.id);
    expect(entry).toMatchObject({ tenant_id: tenants.hugo, promo_id: null, card_name: brand_name, stamps_for_reward: 9, stamps: 9, outcome: "redeemed" });
  });

  it("a full promo card is recorded in history and removed", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 3 });
    await giveStamps(card, running, running.stamps_for_reward);
    const { error } = await redeem(hugoStaff, card, running);
    expect(error).toBeNull();
    expect(await readPromoStamps(card.id)).toEqual([]);
    expect((await readCustomer(card.id)).stamps).toBe(3);

    const [entry] = await readHistory(card.id);
    expect(entry).toMatchObject({ promo_id: running.id, card_name: running.name, icon: running.icon, stamps_for_reward: 4, stamps: 4 });
  });

  it("a full promo card can still be claimed after the promo ends, during the claim window", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    await giveStamps(card, inClaimWindow, inClaimWindow.stamps_for_reward);
    const { error } = await redeem(hugoStaff, card, inClaimWindow);
    expect(error).toBeNull();
    expect(await readHistory(card.id)).toHaveLength(1);
  });

  it("can't be claimed once the claim window is over", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    await giveStamps(card, finished, finished.stamps_for_reward);
    const { error } = await redeem(hugoStaff, card, finished);
    expect(error?.message).toMatch(/time to claim/);
    expect(await readPromoStamps(card.id)).toEqual([{ promo_id: finished.id, stamps: finished.stamps_for_reward }]);
  });

  it("another shop's staff and customers can't redeem", async () => {
    const customer = await signInCustomer();
    const card = await seedCustomer(tenants.hugo, { user_id: customer.userId, stamps: 9 });
    await giveStamps(card, running, running.stamps_for_reward);
    const results = await Promise.all([redeem(daisyStaff, card), redeem(daisyStaff, card, running), redeem(customer, card), redeem(customer, card, running)]);
    expect(results.map((r) => r.error !== null)).toEqual([true, true, true, true]);
    expect((await readCustomer(card.id)).stamps).toBe(9);
    expect(await readPromoStamps(card.id)).toHaveLength(1);
    expect(await readHistory(card.id)).toEqual([]);
  });

  it("customers can't write their own history", async () => {
    const customer = await signInCustomer();
    const card = await seedCustomer(tenants.hugo, { user_id: customer.userId, stamps: 0 });
    await customer.client
      .from("card_history")
      .insert({ customer_id: card.id, tenant_id: tenants.hugo, card_name: "Fake", stamps_for_reward: 9, stamps: 9 });
    expect(await readHistory(card.id)).toEqual([]);
  });
});

describe("waiting rewards", () => {
  const waitingReward = async (card, fields = {}) => {
    await stamp(hugoStaff, card);
    const [entry] = await readHistory(card.id);
    if (Object.keys(fields).length) must(await admin.from("card_history").update(fields).eq("id", entry.id));
    return entry;
  };

  it("staff redeem a waiting reward: it becomes redeemed and the new card is untouched", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 9 });
    const reward = await waitingReward(card);
    const { error } = await redeemReward(hugoStaff, reward);
    expect(error).toBeNull();
    expect(await readHistory(card.id)).toMatchObject([{ id: reward.id, outcome: "redeemed", claim_by: null }]);
    expect((await readCustomer(card.id)).stamps).toBe(1);
  });

  it("can't be redeemed twice", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 9 });
    const reward = await waitingReward(card);
    await redeemReward(hugoStaff, reward);
    const { error } = await redeemReward(hugoStaff, reward);
    expect(error?.message).toMatch(/already been redeemed/);
  });

  it("can't be redeemed once expired", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 9 });
    const reward = await waitingReward(card, { claim_by: new Date(Date.now() - 60_000).toISOString() });
    const { error } = await redeemReward(hugoStaff, reward);
    expect(error?.message).toMatch(/time to claim/);
    expect(await readHistory(card.id)).toMatchObject([{ outcome: "ready" }]);
  });

  it("another shop's staff and customers can't redeem it", async () => {
    const customer = await signInCustomer();
    const card = await seedCustomer(tenants.hugo, { user_id: customer.userId, stamps: 9 });
    const reward = await waitingReward(card);
    const results = await Promise.all([redeemReward(daisyStaff, reward), redeemReward(customer, reward), anon.rpc("redeem_reward", { reward: reward.id })]);
    expect(results.map((r) => r.error !== null)).toEqual([true, true, true]);
    expect(await readHistory(card.id)).toMatchObject([{ outcome: "ready" }]);
  });

  it("a history row is waiting exactly when it has a claim-by time", async () => {
    const card = await seedCustomer(tenants.hugo, { stamps: 0 });
    const base = { customer_id: card.id, tenant_id: tenants.hugo, card_name: "X", stamps_for_reward: 9, stamps: 9 };
    const bad = await Promise.all([
      admin.from("card_history").insert({ ...base, outcome: "ready" }),
      admin.from("card_history").insert({ ...base, outcome: "redeemed", claim_by: new Date().toISOString() }),
    ]);
    expect(bad.map((r) => r.error !== null)).toEqual([true, true]);
  });
});

describe("reading promo stamps and history", () => {
  let mine;
  let someoneElse;
  let daisyCard;

  beforeAll(async () => {
    const phone = await signInCustomer();
    mine = { ...phone, card: await seedCustomer(tenants.hugo, { user_id: phone.userId, stamps: 9 }) };
    someoneElse = await seedCustomer(tenants.hugo, { stamps: 9 });
    daisyCard = await seedCustomer(tenants.daisy, { stamps: 8 });
    for (const [card, who] of [[mine.card, hugoStaff], [someoneElse, hugoStaff], [daisyCard, daisyStaff]]) {
      await redeem(who, card);
    }
    await stamp(hugoStaff, mine.card, running);
    await stamp(hugoStaff, someoneElse, running);
    await stamp(daisyStaff, daisyCard, daisyRunning);
  });

  it("customers see only their own promo stamps and history", async () => {
    const stamps = await mine.client.from("promo_stamps").select("customer_id");
    const history = await mine.client.from("card_history").select("customer_id");
    expect(stamps.data).toEqual([{ customer_id: mine.card.id }]);
    expect(history.data).toEqual([{ customer_id: mine.card.id }]);
  });

  it("staff see their own shop's promo stamps and history, and none of another shop's", async () => {
    const stamps = (await hugoStaff.client.from("promo_stamps").select("customer_id")).data.map((r) => r.customer_id);
    const history = (await hugoStaff.client.from("card_history").select("customer_id")).data.map((r) => r.customer_id);
    expect(stamps).toEqual(expect.arrayContaining([mine.card.id, someoneElse.id]));
    expect(history).toEqual(expect.arrayContaining([mine.card.id, someoneElse.id]));
    expect(stamps).not.toContain(daisyCard.id);
    expect(history).not.toContain(daisyCard.id);
  });

  it("visitors without a session see none", async () => {
    const stamps = await anon.from("promo_stamps").select("customer_id");
    const history = await anon.from("card_history").select("customer_id");
    expect(stamps.data ?? []).toEqual([]);
    expect(history.data ?? []).toEqual([]);
  });
});

describe("move card carries promo cards and history", () => {
  it("adds the old card's promo stamps per promo and moves its history to the new card", async () => {
    const oldCard = await seedCustomer(tenants.hugo, { stamps: 9 });
    await redeem(hugoStaff, oldCard);
    await giveStamps(oldCard, running, 3);
    await giveStamps(oldCard, inClaimWindow, 2);

    const newPhone = await signInCustomer();
    const newCard = await seedCustomer(tenants.hugo, { user_id: newPhone.userId, stamps: 0 });
    await giveStamps(newCard, running, 2);

    const { error } = await hugoStaff.client.rpc("move_card", { old_code: oldCard.code, new_code: newCard.code });
    expect(error).toBeNull();

    const stamps = await readPromoStamps(newCard.id);
    expect(stamps).toHaveLength(2);
    expect(stamps).toEqual(expect.arrayContaining([
      { promo_id: running.id, stamps: 5 }, // added, not capped, so no stamps are lost
      { promo_id: inClaimWindow.id, stamps: 2 },
    ]));
    expect(await readHistory(newCard.id)).toHaveLength(1);

    const { data } = await newPhone.client.from("card_history").select("customer_id");
    expect(data).toEqual([{ customer_id: newCard.id }]);
  });
});
