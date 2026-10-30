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

// For the staff list: when several cards share a contact (likely the same
// customer on a new phone), maps the newest one's id to the oldest one. Only
// the newest card gets a suggestion, so each customer shows up once.
export function findEarlierCards(customers) {
  const byContact = new Map();
  const byAge = [...customers].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const card of byAge) {
    const key = normalizeContact(card.contact);
    if (!key) continue;
    const group = byContact.get(key) ?? { oldest: card, newest: card };
    group.newest = card;
    byContact.set(key, group);
  }
  const earlier = {};
  for (const { oldest, newest } of byContact.values()) {
    if (oldest !== newest) earlier[newest.id] = oldest;
  }
  return earlier;
}
