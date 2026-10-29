import { useEffect, useState } from "react";
import { listCustomers, setStamps, subscribeToAllCustomers } from "../lib/customers";
import { nextStampCount } from "../lib/loyalty";
import { getStaffSession, onStaffSessionChange, signOutStaff } from "../lib/staffAuth";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";

// The staff session and, once signed in, the shop's customers kept live.
// session: undefined = still checking, null = signed out, object = signed in.
export function useOwnerCustomers() {
  const [session, setSession] = useState(undefined);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStaffSession().then(setSession);
    return onStaffSessionChange(setSession);
  }, []);

  const fetchCustomers = async () => {
    const data = await listCustomers();
    if (data) setCustomers(data);
  };

  useEffect(() => {
    if (!session) return;
    fetchCustomers().finally(() => setLoading(false));
    return subscribeToAllCustomers(fetchCustomers);
  }, [session]);

  // Resolves to { ok: true, name } or { ok: false, message } for the scanner to show.
  const addStampByCode = async (code) => {
    const target = customers.find((c) => c.code === code);
    if (!target) return { ok: false, message: "No customer found for that code" };
    const saved = await setStamps(code, nextStampCount(target.stamps, STAMPS_FOR_REWARD));
    if (!saved) return { ok: false, message: "Couldn't save — try again" };
    return { ok: true, name: target.name };
  };

  const resetStamps = async (code) => {
    await setStamps(code, 0);
  };

  const signOut = async () => {
    await signOutStaff();
  };

  return { session, customers, loading, addStampByCode, resetStamps, signOut };
}
