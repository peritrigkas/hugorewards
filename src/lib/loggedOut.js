// "Log out" only hides the card on this device; the device's account (and so
// the card) stays, and "Log back in" shows it again. Keyed per tenant.
import { clientConfig } from "../client.config";

// Read at call time, not import time, so it always uses the resolved tenant.
const storageKey = () => `${clientConfig.id}_logged_out`;

export const isLoggedOut = () => localStorage.getItem(storageKey()) === "1";
export const setLoggedOut = (loggedOut) =>
  loggedOut ? localStorage.setItem(storageKey(), "1") : localStorage.removeItem(storageKey());
