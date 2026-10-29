// Every read, write and realtime subscription on the customers table.
// Components call these instead of Supabase directly. Failures are reported
// as null / false rather than thrown, matching how the screens handle them.
import { supabase } from "../supabaseClient";

export async function getCustomerByCode(code) {
  const { data, error } = await supabase.from("customers").select("*").eq("code", code).single();
  return error ? null : data;
}

// Case-insensitive match on phone/email, used to log a returning customer
// back into their existing card instead of creating a duplicate.
export async function findCustomerByContact(contact) {
  const { data } = await supabase.from("customers").select("*").ilike("contact", contact.trim()).limit(1).maybeSingle();
  return data;
}

// tenantId is only set if applyTenantConfig() resolved the tenants row;
// otherwise the DB's customers_default_tenant trigger fills in hugo.
export async function createCustomer({ name, contact, code, tenantId }) {
  const row = { name, contact, code, stamps: 0, ...(tenantId && { tenant_id: tenantId }) };
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

// Staff dashboard: every customer visible to the signed-in staff member, oldest first.
export async function listCustomers() {
  const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: true });
  return error ? null : data;
}

export async function setStamps(code, stamps) {
  const { error } = await supabase.from("customers").update({ stamps }).eq("code", code);
  return !error;
}

// Calls onUpdate with the new row whenever this customer's row changes.
// Returns an unsubscribe function.
export function subscribeToCustomer(code, onUpdate) {
  const channel = supabase
    .channel(`customer-${code}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customers", filter: `code=eq.${code}` }, (payload) => {
      onUpdate(payload.new);
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// Calls onChange after any insert, update or delete on customers.
// Returns an unsubscribe function.
export function subscribeToAllCustomers(onChange) {
  const channel = supabase.channel("owner-customers").on("postgres_changes", { event: "*", schema: "public", table: "customers" }, onChange).subscribe();
  return () => supabase.removeChannel(channel);
}
