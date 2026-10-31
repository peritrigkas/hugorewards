// Staff "Scans add to" choice while a promo runs: "main", "promo" or "ask".
// Remembered on this device, per tenant.
import { clientConfig } from "../client.config";

// Read at call time, not import time, so it always uses the resolved tenant.
const storageKey = () => `${clientConfig.id}_scans_add_to`;

export const getScanSetting = () => localStorage.getItem(storageKey()) || "main";
export const setScanSetting = (setting) => localStorage.setItem(storageKey(), setting);
