import { useEffect, useState } from "react";
import { clientConfig } from "../client.config";
import { listHistory, listPromos, listPromoStamps } from "../lib/cards";
import {
  contactHasOtherCard, createCustomer, deleteCustomer, getMyCustomer, subscribeToMyCustomer, updateCustomerDetails,
} from "../lib/customers";
import { ensureCustomerSession, getDeviceSession, isStaffSession } from "../lib/customerAuth";
import { isLoggedOut, setLoggedOut } from "../lib/loggedOut";
import { makeCustomerCode } from "../lib/loyalty";
import { activePromoCards, pastCards, runningPromo, shopToday } from "../lib/promos";
import { hasSeenPromo, markPromoSeen } from "../lib/seenPromos";
import { signOutStaff } from "../lib/staffAuth";

// The branded loading screen always shows for at least this long on launch.
const MIN_LOADING_MS = 3000;

const NO_CARDS = { promos: [], promoStamps: [], history: [] };

// The shop's promos and this customer's promo stamps and redeemed cards. A
// failed read shows as none, so the main card still works.
async function loadCards() {
  const [promos, promoStamps, history] = await Promise.all([listPromos(clientConfig.tenantId), listPromoStamps(), listHistory()]);
  return { promos: promos ?? [], promoStamps: promoStamps ?? [], history: history ?? [] };
}

// The card belonging to this device's (anonymous) account, kept in sync with
// the database while the app is open. Actions resolve to true/false so screens
// can show their own error messages.
export function useCustomer() {
  const [customer, setCustomer] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedOut, setLoggedOutState] = useState(isLoggedOut);
  // A staff login on this device would make the customer screens act as staff.
  const [staffOnDevice, setStaffOnDevice] = useState(false);
  // Another card in this shop has the same contact: likely this customer's old phone.
  const [hasEarlierCard, setHasEarlierCard] = useState(false);
  const [cards, setCards] = useState(NO_CARDS);
  const [, setSeenChanged] = useState(0);

  const refresh = async () => {
    const card = await getMyCustomer(clientConfig.tenantId);
    setCustomer(card);
    const [earlier, loaded] = card
      ? await Promise.all([contactHasOtherCard(clientConfig.tenantId, card.contact), loadCards()])
      : [false, NO_CARDS];
    setHasEarlierCard(earlier);
    setCards(loaded);
  };

  const load = async () => {
    // No account is created just by opening the app — only on joining.
    const session = await getDeviceSession();
    setStaffOnDevice(isStaffSession(session));
    if (session && !isStaffSession(session)) {
      setUserId(session.user.id);
      await refresh();
    }
  };

  useEffect(() => {
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
    Promise.all([load(), minDelay]).finally(() => setLoading(false));
  }, []);

  // Live stamps (promo stamps and redemptions touch the card too), and stamps
  // staff move onto this phone from an old one.
  useEffect(() => {
    if (!userId) return;
    return subscribeToMyCustomer(userId, refresh);
  }, [userId]);

  const join = async (name, contact) => {
    const session = await ensureCustomerSession();
    if (!session || isStaffSession(session)) return false;
    const code = makeCustomerCode(clientConfig.loyalty.codePrefix);
    const data = await createCustomer({ name, contact, code, tenantId: clientConfig.tenantId, userId: session.user.id });
    if (!data) return false;
    logBackIn();
    setUserId(session.user.id);
    setCustomer(data);
    const [earlier, loaded] = await Promise.all([contactHasOtherCard(clientConfig.tenantId, contact), loadCards()]);
    setHasEarlierCard(earlier);
    setCards(loaded);
    return true;
  };

  const saveDetails = async (name, contact) => {
    const data = await updateCustomerDetails(customer.code, { name, contact });
    if (!data) return false;
    setCustomer(data);
    return true;
  };

  // Hides the card on this device; the account and card stay for logBackIn.
  const logout = () => {
    setLoggedOut(true);
    setLoggedOutState(true);
  };

  const logBackIn = () => {
    setLoggedOut(false);
    setLoggedOutState(false);
  };

  const deleteAccount = async () => {
    const deleted = await deleteCustomer(customer.code);
    if (!deleted) {
      return false;
    }
    setCustomer(null);
    setHasEarlierCard(false);
    setCards(NO_CARDS);
    return true;
  };

  // Brings back this phone's own card, if staff sign-in replaced it.
  const signOutStaffOnDevice = async () => {
    await signOutStaff();
    setCustomer(null);
    await load();
  };

  const today = shopToday(clientConfig.timezone);
  const stampsByPromo = Object.fromEntries(cards.promoStamps.map((s) => [s.promo_id, s.stamps]));
  const promoCards = activePromoCards(cards.promos, stampsByPromo, today);
  const past = pastCards({ history: cards.history, promos: cards.promos, stampsByPromo, today, timeZone: clientConfig.timezone });
  // The running promo, until the customer dismisses its "New" banner.
  const current = runningPromo(cards.promos, today);
  const newPromo = current && !hasSeenPromo(current.id) ? current : null;
  const dismissNewPromo = () => {
    markPromoSeen(newPromo.id);
    setSeenChanged((n) => n + 1);
  };

  return {
    customer, loading, loggedOut, staffOnDevice, hasEarlierCard, today, promoCards, pastCards: past, newPromo,
    join, saveDetails, logout, logBackIn, deleteAccount, signOutStaffOnDevice, dismissNewPromo,
  };
}
