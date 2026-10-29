// Loyalty-card rules. Pure functions (no config, database or storage access)
// so they can be unit-tested; callers pass in the tenant's prefix and stamp count.

export function makeCustomerCode(prefix, random = Math.random) {
  return `${prefix}-${random().toString(36).slice(2, 7).toUpperCase()}`;
}

export const customerCodePattern = (prefix) => new RegExp(`^${prefix}-[0-9A-Z]{5}$`);

// A full card stays full until staff redeem it.
export const nextStampCount = (stamps, stampsForReward) => Math.min(stamps + 1, stampsForReward);

export const isRewardReady = (stamps, stampsForReward) => stamps >= stampsForReward;
