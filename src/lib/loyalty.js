// Loyalty-card rules. Pure functions (no config, database or storage access)
// so they can be unit-tested; callers pass in the tenant's prefix and stamp count.

export function makeCustomerCode(prefix, random = Math.random) {
  return `${prefix}-${random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const customerCodePattern = (prefix) => new RegExp(`^${prefix}-[0-9A-Z]{5}$`);

// A full card stays full until staff redeem it.
export const nextStampCount = (stamps, stampsForReward) => Math.min(stamps + 1, stampsForReward);

export const isRewardReady = (stamps, stampsForReward) => stamps >= stampsForReward;

// Ignores case, spaces, dashes, dots and brackets, so "07827 421616" matches
// "07827421616". Mirrors private.normalize_contact in supabase-anon-customers.sql.
export const normalizeContact = (contact) => (contact || "").toLowerCase().replace(/[\s.()-]/g, "");

// For the staff list: maps each card's id to an older card in the list with
// the same contact — likely the same customer, now on a new phone.
export function findEarlierCards(customers) {
  const oldestByContact = new Map();
  const earlier = {};
  const byAge = [...customers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const card of byAge) {
    const key = normalizeContact(card.contact);
    if (!key) continue;
    const first = oldestByContact.get(key);
    if (first) earlier[card.id] = first;
    else oldestByContact.set(key, card);
  }
  return earlier;
}
