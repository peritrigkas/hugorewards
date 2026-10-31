// Promos, promo stamps and card history (supabase-promo-cards.sql), plus
// stamping and redeeming. Like customers.js, failures are reported as
// null / an error message rather than thrown.
import { supabase } from "../supabaseClient";

// Every promo the shop has run or scheduled (public shop info).
export async function listPromos(tenantId) {
  const { data, error } = await supabase.from("promos").select("*").eq("tenant_id", tenantId).order("starts_on");
  return error ? null : data;
}

// A customer gets their own promo stamps; staff get their shop's.
export async function listPromoStamps() {
  const { data, error } = await supabase.from("promo_stamps").select("*");
  return error ? null : data;
}

// Redeemed cards, newest first: a customer's own, or staff's whole shop's.
export async function listHistory() {
  const { data, error } = await supabase.from("card_history").select("*").order("finished_at", { ascending: false });
  return error ? null : data;
}

// Staff: one stamp on the main card (promoId null) or a promo card.
// Resolves to { stamps } (the card's new count) or { error }.
export async function addStamp(code, promoId = null) {
  const { data, error } = await supabase.rpc("add_stamp", { card_code: code, promo: promoId });
  return error ? { error: error.message } : { stamps: data };
}

// Staff: gives the reward for a full card, records it in the customer's past
// cards and empties the card. Resolves to null, or the reason it was refused.
export async function redeemCard(code, promoId = null) {
  const { error } = await supabase.rpc("redeem", { card_code: code, promo: promoId });
  return error ? error.message : null;
}

const OVERLAPPING_PROMO = "23P01"; // promos_no_overlap

function promoError(error) {
  if (error.code === OVERLAPPING_PROMO) return "Another promo is already on during those dates";
  return error.message;
}

// Staff: creates the promo (no id) or saves changes to it. Resolves to null,
// or the reason it was refused.
export async function savePromo({ id, ...fields }) {
  const { error } = id
    ? await supabase.from("promos").update(fields).eq("id", id)
    : await supabase.from("promos").insert(fields);
  return error ? promoError(error) : null;
}

export async function deletePromo(id) {
  const { error } = await supabase.from("promos").delete().eq("id", id);
  return error ? promoError(error) : null;
}
