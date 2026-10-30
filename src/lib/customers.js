// Every read, write and realtime subscription on the customers table.
// Components call these instead of Supabase directly. Failures are reported
// as null / false rather than thrown, matching how the screens handle them.
import { supabase } from "../supabaseClient";

// The signed-in device's own card in this shop, or null. RLS only ever
// returns the caller's own card to a customer account.
export async function getMyCustomer(tenantId) {
  const { data, error } = await supabase.from("customers").select("*").eq("tenant_id", tenantId).maybeSingle();
  return error ? null : data;
}

export async function createCustomer({ name, contact, code, tenantId, userId }) {
  const row = { name, contact, code, stamps: 0, tenant_id: tenantId, user_id: userId };
  const { data, error } = await supabase.from("customers").insert(row).select().single();
  return error ? null : data;
}

export async function updateCustomerDetails(code, { name, contact }) {
  const { data, error } = await supabase.from("customers").update({ name, contact }).eq("code", code).select().single();
  return error ? null : data;
}

// True only if a row was actually deleted.
export async function deleteCustomer(code) {
  const { error, count } = await supabase.from("customers").delete({ count: "exact" }).eq("code", code);
  return !error && Boolean(count);
}

// True if another card in the shop has this contact (likely the same customer
// on a new phone). Reveals nothing else about that card.
export async function contactHasOtherCard(tenantId, contact) {
  const { data, error } = await supabase.rpc("contact_has_other_card", { shop_id: tenantId, contact });
  return !error && data === true;
}

// Staff dashboard: every customer visible to the signed-in staff member, oldest first.
export async function listCustomers() {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: true });
  return error ? null : data;
}

export async function setStamps(code, stamps) {
  const { error } = await supabase.from("customers").update({ stamps }).eq("code", code);
  return !error;
}

// Staff: adds the old card's stamps to the new card (the one on the customer's
// phone now) and removes the old card. Resolves to null on success, or the
// reason it was refused.
export async function moveCard(oldCode, newCode) {
  const { error } = await supabase.rpc("move_card", { old_code: oldCode, new_code: newCode });
  return error ? error.message : null;
}

// Calls onChange whenever a card owned by this account is added, changed or
// moved onto it. Returns an unsubscribe function.
export function subscribeToMyCustomer(userId, onChange) {
  const channel = supabase
    .channel(`customer-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "customers", filter: `user_id=eq.${userId}` }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Calls onChange after any insert, update or delete on customers.
// Returns an unsubscribe function.
export function subscribeToAllCustomers(onChange) {
  const channel = supabase.channel("owner-customers").on("postgres_changes", { event: "*", schema: "public", table: "customers" }, onChange).subscribe();
  return () => supabase.removeChannel(channel);
}
