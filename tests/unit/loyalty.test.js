import { describe, expect, it } from "vitest";
import { customerCodePattern, isRewardReady, makeCustomerCode, nextStampCount } from "../../src/lib/loyalty.js";

describe("makeCustomerCode", () => {
  it("is the prefix, a dash and 5 uppercase base-36 characters", () => {
    expect(makeCustomerCode("HUGO", () => 0.123456789)).toBe("HUGO-4FZZZ");
    expect(makeCustomerCode("DAISY", () => 0.0001)).toBe("DAISY-004NY");
  });

  it("produces codes the staff scanner accepts", () => {
    for (let i = 0; i < 1000; i++) {
      expect(makeCustomerCode("HUGO")).toMatch(customerCodePattern("HUGO"));
    }
  });

  // Known bug (refactor-plan.md, "Bugs found"): a "round" random number has
  // fewer than 5 base-36 digits, giving a short code the scanner rejects.
  // Vanishingly rare with Math.random, but possible. Change to `it` once fixed.
  it.fails("always produces 5 characters, even for a short random value [KNOWN BUG]", () => {
    expect(makeCustomerCode("HUGO", () => 0.5)).toMatch(customerCodePattern("HUGO"));
  });
});

describe("customerCodePattern", () => {
  const hugo = customerCodePattern("HUGO");

  it("accepts this shop's codes", () => {
    expect(hugo.test("HUGO-2XAZK")).toBe(true);
  });

  it.each([
    ["another shop's code", "DAISY-2XAZK"],
    ["lowercase", "hugo-2xazk"],
    ["too short", "HUGO-2XAZ"],
    ["too long", "HUGO-2XAZKK"],
    ["extra text around it", " HUGO-2XAZK"],
    ["a prefix that only starts the same", "HUGOX-2XAZK"],
  ])("rejects %s", (_, code) => {
    expect(hugo.test(code)).toBe(false);
  });
});

describe("nextStampCount", () => {
  it("adds one stamp", () => {
    expect(nextStampCount(0, 9)).toBe(1);
    expect(nextStampCount(8, 9)).toBe(9);
  });

  it("stays at the reward count once the card is full", () => {
    expect(nextStampCount(9, 9)).toBe(9);
  });
});

describe("isRewardReady", () => {
  it("is ready only once the card is full", () => {
    expect(isRewardReady(8, 9)).toBe(false);
    expect(isRewardReady(9, 9)).toBe(true);
  });
});
