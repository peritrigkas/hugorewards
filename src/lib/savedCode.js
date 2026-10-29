// The customer's loyalty code, remembered on this device so the app opens
// straight to their card. Keyed per tenant so two shops' apps never collide.
import { clientConfig } from "../client.config";

// Read at call time, not import time, so it always uses the resolved tenant.
const storageKey = () => `${clientConfig.id}_customer_code`;

export const getSavedCode = () => localStorage.getItem(storageKey());
export const saveCode = (code) => localStorage.setItem(storageKey(), code);
export const clearSavedCode = () => localStorage.removeItem(storageKey());
