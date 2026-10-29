import { useEffect, useState } from "react";
import { clientConfig } from "../client.config";
import {
  createCustomer, deleteCustomer, findCustomerByContact, getCustomerByCode, subscribeToCustomer,
  updateCustomerDetails,
} from "../lib/customers";
import { makeCustomerCode } from "../lib/loyalty";
import { clearSavedCode, getSavedCode, saveCode } from "../lib/savedCode";

// The branded loading screen always shows for at least this long on launch.
const MIN_LOADING_MS = 3000;

// The customer whose card is saved on this device (null if none), kept in
// sync with the database while the app is open. Actions resolve to true/false
// so screens can show their own error messages.
export function useCustomer() {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async (code) => {
    const data = await getCustomerByCode(code);
    if (data) setCustomer(data);
  };

  useEffect(() => {
    const savedCode = getSavedCode();
    const minDelay = new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS));
    if (savedCode) {
      Promise.all([fetchMe(savedCode), minDelay]).finally(() => setLoading(false));
    } else {
      minDelay.then(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (!customer) return;
    return subscribeToCustomer(customer.code, setCustomer);
  }, [customer?.code]);

  const join = async (name, contact) => {
    // Returning customer: if this contact already has a card, log them back into
    // it instead of creating a duplicate — fixes losing stamps on logout/rejoin.
    if (contact) {
      const existing = await findCustomerByContact(contact);
      if (existing) {
        saveCode(existing.code);
        setCustomer(existing);
        return true;
      }
    }
    const code = makeCustomerCode(clientConfig.loyalty.codePrefix);
    const data = await createCustomer({ name, contact, code, tenantId: clientConfig.tenantId });
    if (!data) return false;
    saveCode(code);
    setCustomer(data);
    return true;
  };

  const saveDetails = async (name, contact) => {
    const data = await updateCustomerDetails(customer.code, { name, contact });
    if (!data) return false;
    setCustomer(data);
    return true;
  };

  const logout = () => {
    clearSavedCode();
    setCustomer(null);
  };

  const deleteAccount = async () => {
    const deleted = await deleteCustomer(customer.code);
    if (!deleted) {
      return false;
    }
    clearSavedCode();
    setCustomer(null);
    return true;
  };

  return { customer, loading, join, saveDetails, logout, deleteAccount };
}
