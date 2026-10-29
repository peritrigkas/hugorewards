import { useEffect, useState } from "react";
import { clientConfig } from "../client.config";
import {
  contactHasOtherCard, createCustomer, deleteCustomer, getMyCustomer, subscribeToMyCustomer, updateCustomerDetails,
} from "../lib/customers";
import { ensureCustomerSession, getDeviceSession, isStaffSession } from "../lib/customerAuth";
import { isLoggedOut, setLoggedOut } from "../lib/loggedOut";
import { makeCustomerCode } from "../lib/loyalty";
import { signOutStaff } from "../lib/staffAuth";

// The branded loading screen always shows for at least this long on launch.
const MIN_LOADING_MS = 3000;

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

  const refresh = async () => {
    const card = await getMyCustomer(clientConfig.tenantId);
    setCustomer(card);
    setHasEarlierCard(card ? await contactHasOtherCard(clientConfig.tenantId, card.contact) : false);
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

  // Live stamps, and the card staff move onto this phone from an old one.
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
    setHasEarlierCard(await contactHasOtherCard(clientConfig.tenantId, contact));
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
    return true;
  };

  const signOutStaffOnDevice = async () => {
    await signOutStaff();
    setStaffOnDevice(false);
    setCustomer(null);
  };

  return {
    customer, loading, loggedOut, staffOnDevice, hasEarlierCard,
    join, saveDetails, logout, logBackIn, deleteAccount, signOutStaffOnDevice,
  };
}
