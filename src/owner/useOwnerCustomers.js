import { useEffect, useState } from "react";
import { listCustomers, moveCard as moveCardInDb, setStamps, subscribeToAllCustomers } from "../lib/customers";
import { nextStampCount } from "../lib/loyalty";
import { isStaffSession } from "../lib/customerAuth";
import { getStaffSession, onStaffSessionChange, signOutStaff } from "../lib/staffAuth";
import { STAMPS_FOR_REWARD } from "../loyaltySettings";

// The staff session and, once signed in, the shop's customers kept live.
// session: undefined = still checking, null = no staff login, object = signed in.
// A customer's anonymous login on this device doesn't count as staff;
// customerOnDevice reports it so sign-in can warn that it will be replaced.
export function useOwnerCustomers() {
  const [deviceSession, setDeviceSession] = useState(undefined);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const session = deviceSession === undefined ? undefined : isStaffSession(deviceSession) ? deviceSession : null;
  const customerOnDevice = Boolean(deviceSession && !isStaffSession(deviceSession));

  useEffect(() => {
    getStaffSession().then(setDeviceSession);
    return onStaffSessionChange(setDeviceSession);
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

  // Resolves to null on success, or the reason the database refused.
  const moveCard = async (oldCode, newCode) => {
    const error = await moveCardInDb(oldCode, newCode);
    if (!error) await fetchCustomers();
    return error;
  };

  const signOut = async () => {
    await signOutStaff();
  };

  return { session, customerOnDevice, customers, loading, addStampByCode, resetStamps, moveCard, signOut };
}
