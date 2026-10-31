import { describe, expect, it } from "vitest";
import {
  customerCodePattern, findEarlierCards, isRewardReady, makeCustomerCode, normalizeContact,
} from "../../src/lib/loyalty.js";

describe("makeCustomerCode", () => {
  it("is the prefix, a dash and 5 random digits or capital letters", () => {
    const draws = [0, 0.1, 0.5, 0.99, 0.999999];
    expect(makeCustomerCode("HUGO", () => draws.shift())).toBe("HUGO-03IZZ");
    expect(makeCustomerCode("DAISY", () => 0.0001)).toBe("DAISY-00000");
  });

  it("produces codes the staff scanner accepts", () => {
    for (let i = 0; i < 1000; i++) {
      expect(makeCustomerCode("HUGO")).toMatch(customerCodePattern("HUGO"));
    }
  });

  // Was a bug (refactor-plan.md, "Bugs found"): codes came from one random
  // number's base-36 digits, so a "round" value like 0.5 gave HUGO-I.
  it.each([0, 0.5, 0.25, 0.9999999])("always produces 5 characters, even for a round random value (%s)", (value) => {
    expect(makeCustomerCode("HUGO", () => value)).toMatch(customerCodePattern("HUGO"));
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

describe("isRewardReady", () => {
  it("is ready only once the card is full", () => {
    expect(isRewardReady(8, 9)).toBe(false);
    expect(isRewardReady(9, 9)).toBe(true);
  });
});

describe("normalizeContact", () => {
  it.each([
    ["07827 421616", "07827421616"],
    ["(07827) 421-616", "07827421616"],
    ["+44 7827.421.616", "+447827421616"],
    // Dots go too, so "john.smith@" and "johnsmith@" also match — fine for a hint staff confirm.
    ["  Peri@Example.COM ", "peri@examplecom"],
  ])("treats %j like %j", (input, expected) => {
    expect(normalizeContact(input)).toBe(expected);
  });

  it("treats a missing contact as empty", () => {
    expect(normalizeContact(null)).toBe("");
  });
});

describe("findEarlierCards", () => {
  const card = (id, contact, created_at) => ({ id, contact, created_at });

  it("links only the newest card to the oldest card with the same contact", () => {
    const old = card("old", "07827 421616", "2026-10-01T10:00:00Z");
    const mid = card("mid", "07827421616", "2026-10-15T10:00:00Z");
    const fresh = card("new", "(07827) 421616", "2026-10-29T10:00:00Z");
    expect(findEarlierCards([fresh, old, mid])).toEqual({ new: old });
  });

  it("gives each customer their own suggestion", () => {
    const periOld = card("periOld", "peri@example.com", "2026-10-01T10:00:00Z");
    const naniOld = card("naniOld", "nani@example.com", "2026-10-02T10:00:00Z");
    const periNew = card("periNew", "Peri@example.com", "2026-10-03T10:00:00Z");
    const naniNew = card("naniNew", "nani@example.com", "2026-10-04T10:00:00Z");
    expect(findEarlierCards([periOld, naniOld, periNew, naniNew])).toEqual({ periNew: periOld, naniNew: naniOld });
  });

  it("ignores cards without a contact and cards with different contacts", () => {
    const cards = [
      card("a", "", "2026-10-01T10:00:00Z"),
      card("b", "", "2026-10-02T10:00:00Z"),
      card("c", "peri@example.com", "2026-10-03T10:00:00Z"),
      card("d", "nani@example.com", "2026-10-04T10:00:00Z"),
    ];
    expect(findEarlierCards(cards)).toEqual({});
  });
});
