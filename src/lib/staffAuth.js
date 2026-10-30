// Staff sign-in for the owner dashboard (Supabase Auth email + password).
//
// A device holds one login at a time, so staff sign-in replaces the phone's
// customer (anonymous) account. Its refresh token is kept until staff sign
// out, which signs the customer account back in: same card, same stamps.
import { clientConfig } from "../client.config";
import { supabase } from "../supabaseClient";
import { getCaptchaToken } from "./captcha";

// Read at call time, not import time, so it always uses the resolved tenant.
const savedCustomerKey = () => `${clientConfig.id}_customer_login`;

// True on success, false for a wrong email/password, a failed bot check or any
// other error.
export async function signInStaff(email, password) {
  try {
    const captchaToken = await getCaptchaToken();
    const { data } = await supabase.auth.getSession();
    const customerSession = data.session?.user.is_anonymous ? data.session : null;
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    if (error) return false;
    if (customerSession) localStorage.setItem(savedCustomerKey(), customerSession.refresh_token);
    return true;
  } catch {
    return false;
  }
}

export async function getStaffSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Calls onChange with the new session (or null) on sign-in/out.
// Returns an unsubscribe function.
export function onStaffSessionChange(onChange) {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => onChange(session));
  return () => listener.subscription.unsubscribe();
}

// Signs staff out of this device only, then brings back the customer account
// that staff sign-in replaced, if there was one.
export async function signOutStaff() {
  await supabase.auth.signOut({ scope: "local" });
  const refreshToken = localStorage.getItem(savedCustomerKey());
  if (!refreshToken) return;
  localStorage.removeItem(savedCustomerKey());
  await supabase.auth.refreshSession({ refresh_token: refreshToken });
}
