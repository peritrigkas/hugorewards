import { describe, expect, it } from "vitest";
import {
  activePromoCards, addDays, claimUntil, daysBetween, endNowDates, formatDay, groupPromos, pastCards, promoFormError,
  promoPhase, runningPromo, scanTarget, shopToday,
} from "../../src/lib/promos.js";

// November 2026: runs 1st to 30th, full cards claimable to 14 Dec.
const waffles = { id: "w", name: "Waffle month", icon: "cookie", stamps_for_reward: 4, starts_on: "2026-11-01", ends_on: "2026-11-30", claim_days: 14 };
const bowls = { id: "b", name: "Bowl week", icon: "salad", stamps_for_reward: 3, starts_on: "2026-12-01", ends_on: "2026-12-07", claim_days: 14 };
const shakes = { id: "s", name: "Shakes", icon: "soda", stamps_for_reward: 5, starts_on: "2026-09-01", ends_on: "2026-09-30", claim_days: 14 };

describe("shop days", () => {
  it("today is the date in the shop's time zone, not the phone's", () => {
    const lateEvening = new Date("2026-07-01T23:30:00Z"); // 00:30 on 2 July in London (BST)
    expect(shopToday("Europe/London", lateEvening)).toBe("2026-07-02");
    expect(shopToday("America/New_York", lateEvening)).toBe("2026-07-01");
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("counts whole days, even across the clocks changing", () => {
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2); // UK clocks go back 25 Oct
    expect(daysBetween("2026-11-30", "2026-11-30")).toBe(0);
  });

  it("formats a day like 30 Nov", () => {
    expect(formatDay("2026-11-30")).toBe("30 Nov");
  });
});

describe("promoPhase", () => {
  it.each([
    ["2026-10-31", "scheduled"],
    ["2026-11-01", "running"], // first day
    ["2026-11-30", "running"], // last day
    ["2026-12-01", "claim"],
    ["2026-12-14", "claim"], // last day to claim
    ["2026-12-15", "finished"],
  ])("on %s is %s", (today, phase) => {
    expect(promoPhase(waffles, today)).toBe(phase);
  });

  it("claim window ends claim_days after the end date", () => {
    expect(claimUntil(waffles)).toBe("2026-12-14");
  });

  it("the running promo is the one whose dates include today", () => {
    expect(runningPromo([waffles, bowls], "2026-12-02")).toBe(bowls);
    expect(runningPromo([waffles, bowls], "2026-12-20")).toBeNull();
  });
});

describe("activePromoCards", () => {
  it("shows the running promo even before the first stamp", () => {
    expect(activePromoCards([waffles], {}, "2026-11-05")).toEqual([{ promo: waffles, stamps: 0, phase: "running" }]);
  });

  it("after the end, shows only a full card that can still be claimed", () => {
    expect(activePromoCards([waffles], { w: 4 }, "2026-12-10")).toEqual([{ promo: waffles, stamps: 4, phase: "claim" }]);
    expect(activePromoCards([waffles], { w: 3 }, "2026-12-10")).toEqual([]);
    expect(activePromoCards([waffles], { w: 4 }, "2026-12-15")).toEqual([]);
  });

  it("can show a full card from the last promo alongside the new one, oldest first", () => {
    const cards = activePromoCards([bowls, waffles], { w: 4, b: 1 }, "2026-12-03");
    expect(cards.map((c) => [c.promo.id, c.phase])).toEqual([["w", "claim"], ["b", "running"]]);
  });

  it("hides upcoming promos", () => {
    expect(activePromoCards([bowls], {}, "2026-11-20")).toEqual([]);
  });
});

describe("pastCards", () => {
  const history = [
    { id: 1, promo_id: null, card_name: "Hugo", icon: null, stamps: 9, stamps_for_reward: 9, finished_at: "2026-11-12T10:00:00Z" },
    { id: 2, promo_id: "s", card_name: "Shakes", icon: "soda", stamps: 5, stamps_for_reward: 5, finished_at: "2026-09-20T23:30:00Z" },
  ];
  const past = (stampsByPromo, today) => pastCards({ history, promos: [shakes, waffles], stampsByPromo, today, timeZone: "Europe/London" });

  it("lists redeemed cards, dated in shop time", () => {
    const cards = past({}, "2026-11-20");
    expect(cards.map((c) => [c.outcome, c.name, c.day, c.isMain])).toEqual([
      ["redeemed", "Hugo", "2026-11-12", true],
      ["redeemed", "Shakes", "2026-09-21", false], // 00:30 on the 21st in London
    ]);
  });

  it("an unfinished promo card expires when the promo ends; a full one when the claim window closes", () => {
    expect(past({ w: 2 }, "2026-12-01")[0]).toMatchObject({ outcome: "expired", name: "Waffle month", day: "2026-11-30", stamps: 2, stampsForReward: 4 });
    expect(past({ w: 4 }, "2026-12-01").filter((c) => c.outcome === "expired")).toEqual([]); // still claimable
    expect(past({ w: 4 }, "2026-12-15")[0]).toMatchObject({ outcome: "expired", day: "2026-12-14" });
  });

  it("doesn't list a running promo's card or an empty one", () => {
    expect(past({ w: 2 }, "2026-11-20").filter((c) => c.outcome === "expired")).toEqual([]);
    expect(past({ w: 0 }, "2026-12-20").filter((c) => c.outcome === "expired")).toEqual([]);
  });

  it("lists newest first, redeemed and expired together", () => {
    expect(past({ w: 1 }, "2026-12-20").map((c) => c.name)).toEqual(["Waffle month", "Hugo", "Shakes"]);
  });
});

describe("scanTarget", () => {
  it("goes to the main card when no promo is running, whatever the setting", () => {
    expect(scanTarget("promo", null)).toEqual({ kind: "main" });
    expect(scanTarget("ask", null)).toEqual({ kind: "main" });
  });

  it("follows the setting while a promo runs", () => {
    expect(scanTarget("main", waffles)).toEqual({ kind: "main" });
    expect(scanTarget("promo", waffles)).toEqual({ kind: "promo", promo: waffles });
    expect(scanTarget("ask", waffles)).toEqual({ kind: "ask" });
  });
});

describe("staff promo page", () => {
  it("groups running, upcoming (soonest first) and past (latest first)", () => {
    const later = { ...bowls, id: "later", starts_on: "2027-01-01", ends_on: "2027-01-07" };
    const groups = groupPromos([later, shakes, bowls, waffles], "2026-11-10");
    expect(groups.running.map((p) => p.id)).toEqual(["w"]);
    expect(groups.upcoming.map((p) => p.id)).toEqual(["b", "later"]);
    expect(groups.past.map((p) => p.id)).toEqual(["s"]);
  });

  it("End now makes yesterday the last day", () => {
    expect(endNowDates(waffles, "2026-11-10")).toEqual({ starts_on: "2026-11-01", ends_on: "2026-11-09" });
  });

  it("End now on a promo that started today moves its start back too", () => {
    expect(endNowDates(waffles, "2026-11-01")).toEqual({ starts_on: "2026-10-31", ends_on: "2026-10-31" });
  });

  it.each([
    [{ name: " " }, /name/],
    [{ icon: "" }, /icon/],
    [{ stamps_for_reward: 0 }, /1 to 20/],
    [{ stamps_for_reward: 21 }, /1 to 20/],
    [{ ends_on: "" }, /date/],
    [{ ends_on: "2026-10-31" }, /on or after/],
  ])("refuses a form with %j", (change, message) => {
    expect(promoFormError({ ...waffles, ...change })).toMatch(message);
  });

  it("accepts a complete form", () => {
    expect(promoFormError(waffles)).toBeNull();
  });
});
