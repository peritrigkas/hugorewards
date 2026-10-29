// Each app install gets its own invisible (anonymous) Supabase account the
// first time the customer joins. Supabase keeps it signed in, and the database
// only lets that account see and change its own card.
import { supabase } from "../supabaseClient";

export async function getDeviceSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Reuses this device's account, or creates one. Null if sign-in failed.
export async function ensureCustomerSession() {
  const session = await getDeviceSession();
  if (session) return session;
  const { data, error } = await supabase.auth.signInAnonymously();
  return error ? null : data.session;
}

// A device holds one login at a time; a non-anonymous one is a staff login.
export const isStaffSession = (session) => Boolean(session && !session.user.is_anonymous);
