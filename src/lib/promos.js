// Promo-card rules (developent-docs/promo-cards-design.md). Pure functions,
// like loyalty.js, so they can be unit-tested. Days are "YYYY-MM-DD" strings
// in the shop's time zone; the database applies the same rules when stamping
// and redeeming, so these only decide what the screens show.

// Today in the shop's time zone, e.g. "2026-10-30".
export function shopToday(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const toDate = (day) => new Date(`${day}T00:00:00Z`);
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(day, n) {
  const date = toDate(day);
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

export const daysBetween = (from, to) => Math.round((toDate(to) - toDate(from)) / DAY_MS);

// "30 Nov"
export const formatDay = (day) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(toDate(day));

// The last day a full card can still be claimed after the promo ends.
export const claimUntil = (promo) => addDays(promo.ends_on, promo.claim_days);

// scheduled → running (start to end date) → claim (full cards can still be
// redeemed) → finished.
export function promoPhase(promo, today) {
  if (today < promo.starts_on) return "scheduled";
  if (today <= promo.ends_on) return "running";
  if (today <= claimUntil(promo)) return "claim";
  return "finished";
}

// At most one: the database refuses overlapping promos.
export const runningPromo = (promos, today) => promos.find((p) => promoPhase(p, today) === "running") ?? null;

export const isPromoCardFull = (promo, stamps) => stamps >= promo.stamps_for_reward;

// One customer's promo cards to show now, oldest promo first: the running
// promo (even before its first stamp) and full cards from ended promos that
// can still be claimed. stampsByPromo maps promo id → stamps.
export function activePromoCards(promos, stampsByPromo, today) {
  return promos
    .map((promo) => ({ promo, stamps: stampsByPromo[promo.id] ?? 0, phase: promoPhase(promo, today) }))
    .filter(({ promo, stamps, phase }) => phase === "running" || (phase === "claim" && isPromoCardFull(promo, stamps)))
    .sort((a, b) => a.promo.starts_on.localeCompare(b.promo.starts_on));
}

// A history row moved to Past cards by a stamp on a full card, not redeemed
// yet: waiting until its claim_by time, expired after it.
const isWaiting = (h, now) => h.outcome === "ready" && new Date(h.claim_by) >= now;

// Rewards waiting to be claimed, oldest first, from card_history rows (one
// customer's, or filter them first).
export const waitingRewards = (history, now = new Date()) =>
  history.filter((h) => isWaiting(h, now)).sort((a, b) => a.finished_at.localeCompare(b.finished_at));

// One customer's finished cards: rewards waiting to be claimed first (oldest
// first), then the rest newest first. From card_history: waiting, redeemed,
// and waiting rewards that weren't claimed in time (expired). Plus every
// promo card with stamps that wasn't redeemed in time: an unfinished card
// expires when its promo ends; a full one when the claim window closes. Empty
// promo cards aren't kept.
export function pastCards({ history, promos, stampsByPromo, today, timeZone, now = new Date() }) {
  const fromHistory = history.map((h) => {
    const outcome = h.outcome === "ready" ? (isWaiting(h, now) ? "ready" : "expired") : "redeemed";
    const at = outcome === "redeemed" ? h.finished_at : h.claim_by;
    return {
      key: `history-${h.id}`,
      outcome,
      day: shopToday(timeZone, new Date(at)),
      at,
      name: h.card_name,
      icon: h.icon,
      isMain: !h.promo_id,
      stamps: h.stamps,
      stampsForReward: h.stamps_for_reward,
    };
  });
  const expired = promos.flatMap((promo) => {
    const stamps = stampsByPromo[promo.id] ?? 0;
    if (stamps === 0) return [];
    const day = isPromoCardFull(promo, stamps) ? claimUntil(promo) : promo.ends_on;
    if (today <= day) return [];
    return [{
      key: `expired-${promo.id}`,
      outcome: "expired",
      day,
      at: `${day}T23:59:59Z`,
      name: promo.name,
      icon: promo.icon,
      isMain: false,
      stamps,
      stampsForReward: promo.stamps_for_reward,
    }];
  });
  const all = [...fromHistory, ...expired];
  const ready = all.filter((c) => c.outcome === "ready").sort((a, b) => a.at.localeCompare(b.at));
  const done = all.filter((c) => c.outcome !== "ready").sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at));
  return [...ready, ...done];
}

// Staff "Scans add to" setting: "main", "promo" or "ask". With no promo
// running there's only one card to stamp, so scans go to the main card.
export function scanTarget(setting, promo) {
  if (!promo || setting === "main" || !setting) return { kind: "main" };
  if (setting === "ask") return { kind: "ask" };
  return { kind: "promo", promo };
}

// Staff Promo page: running first, then upcoming (soonest first), then past
// (latest first).
export function groupPromos(promos, today) {
  const byStart = [...promos].sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  return {
    running: byStart.filter((p) => promoPhase(p, today) === "running"),
    upcoming: byStart.filter((p) => promoPhase(p, today) === "scheduled"),
    past: byStart.filter((p) => ["claim", "finished"].includes(promoPhase(p, today))).reverse(),
  };
}

// "End now": the promo's last day becomes yesterday, so no more stamps today;
// full cards can still be claimed for its claim window. A promo that started
// today is moved to start yesterday too, as a promo can't end before it starts.
export function endNowDates(promo, today) {
  const yesterday = addDays(today, -1);
  return { starts_on: promo.starts_on < yesterday ? promo.starts_on : yesterday, ends_on: yesterday };
}

export const MAX_PROMO_STAMPS = 20;

// What's wrong with a promo form, or null if it can be saved.
export function promoFormError({ name, icon, stamps_for_reward: stamps, starts_on: start, ends_on: end }) {
  if (!name?.trim()) return "Give the promo a name";
  if (!icon) return "Pick an icon";
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > MAX_PROMO_STAMPS) return `Stamps needed must be 1 to ${MAX_PROMO_STAMPS}`;
  if (!start || !end) return "Pick a start and end date";
  if (end < start) return "The end date must be on or after the start date";
  return null;
}
