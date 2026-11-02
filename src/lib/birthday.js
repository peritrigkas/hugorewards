// Birthday-treat rules (developent-docs/birthday-treat-design.md). Pure
// functions, like promos.js. Days are "YYYY-MM-DD" strings in the shop's time
// zone; the database applies the same rules when saving a birthday and
// redeeming the treat, so these only decide what the screens show.
import { addDays } from "./promos";

// A customer can save a birthday this many times; the last save locks it.
export const MAX_BIRTHDAY_SAVES = 2;

// The treat can be redeemed on the birthday and this many days after.
export const BIRTHDAY_WEEK_EXTRA_DAYS = 6;

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Days in a month, counting 29 February (birthdays have no year).
export const daysInMonth = (month) => new Date(Date.UTC(2000, month, 0)).getUTCDate();

const isLeapYear = (year) => new Date(Date.UTC(year, 1, 29)).getUTCMonth() === 1;
const pad = (n) => String(n).padStart(2, "0");

// The birthday in a given year; 29 February is the 28th in other years.
// Mirrors private.birthday_in() in supabase-birthday-treats.sql.
export function birthdayIn(year, month, day) {
  const d = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day;
  return `${year}-${pad(month)}-${pad(d)}`;
}

export const hasBirthday = (customer) => customer.birthday_month != null;

// "12 March"
export const formatBirthday = (customer) => `${customer.birthday_day} ${MONTHS[customer.birthday_month - 1]}`;

export const isBirthdayLocked = (customer) => customer.birthday_saves >= MAX_BIRTHDAY_SAVES;

// The birthday whose week (the birthday and the 6 days after) includes today,
// or null. Mirrors private.birthday_week_of().
export function birthdayWeekOf(customer, today) {
  if (!hasBirthday(customer)) return null;
  const year = Number(today.slice(0, 4));
  for (const y of [year, year - 1]) {
    const start = birthdayIn(y, customer.birthday_month, customer.birthday_day);
    if (start <= today && today <= addDays(start, BIRTHDAY_WEEK_EXTRA_DAYS)) return start;
  }
  return null;
}

// The next birthday on or after today.
function nextBirthday(customer, today) {
  const year = Number(today.slice(0, 4));
  const thisYear = birthdayIn(year, customer.birthday_month, customer.birthday_day);
  return thisYear >= today ? thisYear : birthdayIn(year + 1, customer.birthday_month, customer.birthday_day);
}

// What the treat looks like for one customer today. treats are their
// birthday_treats rows (or filter them first).
// none: no birthday saved. ready: birthday week, not redeemed yet (until =
// the week's last day). redeemed: given this birthday week. upcoming: from
// the next birthday (from), until that week's last day.
export function birthdayTreat(customer, treats, today) {
  if (!hasBirthday(customer)) return { kind: "none" };
  const week = birthdayWeekOf(customer, today);
  if (week) {
    const until = addDays(week, BIRTHDAY_WEEK_EXTRA_DAYS);
    const given = treats.find((t) => t.birthday_on.slice(0, 4) === week.slice(0, 4));
    return given ? { kind: "redeemed", until, redeemedAt: given.redeemed_at } : { kind: "ready", until };
  }
  const from = nextBirthday(customer, today);
  return { kind: "upcoming", from, until: addDays(from, BIRTHDAY_WEEK_EXTRA_DAYS) };
}
