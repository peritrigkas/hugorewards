// The "New promo" banner shows once per promo on this phone. Keyed per tenant.
import { clientConfig } from "../client.config";

// Read at call time, not import time, so it always uses the resolved tenant.
const storageKey = (promoId) => `${clientConfig.id}_seen_promo_${promoId}`;

export const hasSeenPromo = (promoId) => localStorage.getItem(storageKey(promoId)) === "1";
export const markPromoSeen = (promoId) => localStorage.setItem(storageKey(promoId), "1");
