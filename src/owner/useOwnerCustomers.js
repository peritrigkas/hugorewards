import { useEffect, useState } from "react";
import { clientConfig } from "../client.config";
import { addStamp, deletePromo as deletePromoInDb, listHistory, listPromos, listPromoStamps, redeemCard, savePromo as savePromoInDb } from "../lib/cards";
import { listCustomers, moveCard as moveCardInDb, subscribeToAllCustomers } from "../lib/customers";
import { isStaffSession } from "../lib/customerAuth";
import { getStaffSession, onStaffSessionChange, signOutStaff } from "../lib/staffAuth";

const NO_CARDS = { promos: [], promoStamps: [], history: [] };

// The staff session and, once signed in, the shop's customers, promos, promo
// stamps and redeemed cards, kept live.
// session: undefined = still checking, null = no staff login, object = signed in.
// A customer's anonymous login on this device doesn't count as staff;
// customerOnDevice reports it so sign-in can warn that it will be replaced.
export function useOwnerCustomers() {
  const [deviceSession, setDeviceSession] = useState(undefined);
  const [customers, setCustomers] = useState([]);
  const [cards, setCards] = useState(NO_CARDS);
  const [loading, setLoading] = useState(true);
  const session = deviceSession === undefined ? undefined : isStaffSession(deviceSession) ? deviceSession : null;
  const customerOnDevice = Boolean(deviceSession && !isStaffSession(deviceSession));

  useEffect(() => {
    getStaffSession().then(setDeviceSession);
    return onStaffSessionChange(setDeviceSession);
  }, []);

  // A failed read keeps what was there before.
  const fetchAll = async () => {
    const [data, promos, promoStamps, history] = await Promise.all([
      listCustomers(), listPromos(clientConfig.tenantId), listPromoStamps(), listHistory(),
    ]);
    if (data) setCustomers(data);
    setCards((prev) => ({ promos: promos ?? prev.promos, promoStamps: promoStamps ?? prev.promoStamps, history: history ?? prev.history }));
  };

  // Promo stamps and redemptions also touch the customer's row, so this one
  // subscription keeps everything current.
  useEffect(() => {
    if (!session) return;
    fetchAll().finally(() => setLoading(false));
    return subscribeToAllCustomers(fetchAll);
  }, [session]);

  // One stamp on the main card (promo null) or a promo card. Resolves to
  // { ok, message } for the screen to show.
  const stamp = async (customer, promo = null) => {
    const { error } = await addStamp(customer.code, promo?.id ?? null);
    if (error) return { ok: false, message: error };
    await fetchAll();
    const card = promo ? `a ${promo.name} stamp` : "a stamp";
    return { ok: true, message: `✓ Added ${card} for ${customer.name}` };
  };

  // Resolves to null on success, or the reason the database refused.
  const redeem = async (customer, promo = null) => {
    const error = await redeemCard(customer.code, promo?.id ?? null);
    if (!error) await fetchAll();
    return error;
  };

  const moveCard = async (oldCode, newCode) => {
    const error = await moveCardInDb(oldCode, newCode);
    if (!error) await fetchAll();
    return error;
  };

  const savePromo = async (promo) => {
    const error = await savePromoInDb({ ...promo, tenant_id: clientConfig.tenantId });
    if (!error) await fetchAll();
    return error;
  };

  const deletePromo = async (id) => {
    const error = await deletePromoInDb(id);
    if (!error) await fetchAll();
    return error;
  };

  const signOut = async () => {
    await signOutStaff();
  };

  return { session, customerOnDevice, customers, cards, loading, stamp, redeem, moveCard, savePromo, deletePromo, signOut };
}
