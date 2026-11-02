import { describe, expect, it } from "vitest";
import { birthdayIn, birthdayTreat, birthdayWeekOf, daysInMonth, formatBirthday, isBirthdayLocked } from "../../src/lib/birthday.js";

const born = (month, day, saves = 1) => ({ id: "c", birthday_month: month, birthday_day: day, birthday_saves: saves });
const treat = (birthday_on) => ({ customer_id: "c", birthday_on, redeemed_at: `${birthday_on}T12:00:00Z` });

describe("birthday dates", () => {
  it("29 February is the 28th outside leap years", () => {
    expect(birthdayIn(2027, 2, 29)).toBe("2027-02-28");
    expect(birthdayIn(2028, 2, 29)).toBe("2028-02-29");
    expect(birthdayIn(2027, 3, 5)).toBe("2027-03-05");
  });

  it("every month offers its days, February including the 29th", () => {
    expect([1, 2, 4, 12].map(daysInMonth)).toEqual([31, 29, 30, 31]);
  });

  it("formats the day and month", () => {
    expect(formatBirthday(born(3, 12))).toBe("12 March");
  });

  it("locks after two saves", () => {
    expect([0, 1, 2].map((saves) => isBirthdayLocked(born(3, 12, saves)))).toEqual([false, false, true]);
  });
});

describe("birthday week: the birthday and the 6 days after", () => {
  it("starts on the birthday and ends 6 days later", () => {
    const c = born(3, 12);
    expect(birthdayWeekOf(c, "2027-03-11")).toBeNull();
    expect(birthdayWeekOf(c, "2027-03-12")).toBe("2027-03-12");
    expect(birthdayWeekOf(c, "2027-03-18")).toBe("2027-03-12");
    expect(birthdayWeekOf(c, "2027-03-19")).toBeNull();
  });

  it("runs into the new year", () => {
    expect(birthdayWeekOf(born(12, 29), "2028-01-03")).toBe("2027-12-29");
  });

  it("is never on for a customer without a birthday", () => {
    expect(birthdayWeekOf({ birthday_month: null, birthday_day: null }, "2027-03-12")).toBeNull();
  });
});

describe("the birthday treat today", () => {
  it("asks for a birthday when none is saved", () => {
    expect(birthdayTreat({ birthday_month: null, birthday_day: null, birthday_saves: 0 }, [], "2027-03-12")).toEqual({ kind: "none" });
  });

  it("is ready during the birthday week until redeemed", () => {
    expect(birthdayTreat(born(3, 12), [], "2027-03-14")).toEqual({ kind: "ready", until: "2027-03-18" });
    expect(birthdayTreat(born(3, 12), [treat("2027-03-12")], "2027-03-14")).toMatchObject({ kind: "redeemed", until: "2027-03-18" });
  });

  it("counts last year's treat only for last year", () => {
    expect(birthdayTreat(born(3, 12), [treat("2026-03-12")], "2027-03-14").kind).toBe("ready");
  });

  it("a treat for a week that ran into January belongs to the year it started", () => {
    expect(birthdayTreat(born(12, 29), [treat("2027-12-29")], "2028-01-02").kind).toBe("redeemed");
  });

  it("otherwise shows the next birthday week, this year or next", () => {
    expect(birthdayTreat(born(3, 12), [], "2027-01-10")).toEqual({ kind: "upcoming", from: "2027-03-12", until: "2027-03-18" });
    expect(birthdayTreat(born(3, 12), [], "2027-03-20")).toEqual({ kind: "upcoming", from: "2028-03-12", until: "2028-03-18" });
  });
});
