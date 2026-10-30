// Each app install gets its own invisible (anonymous) Supabase account the
// first time the customer joins. Supabase keeps it signed in, and the database
// only lets that account see and change its own card.
import { supabase } from "../supabaseClient";
import { getCaptchaToken } from "./captcha";

export async function getDeviceSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Reuses this device's account, or creates one (after the bot check). Null if
// sign-in failed.
export async function ensureCustomerSession() {
  const session = await getDeviceSession();
  if (session) return session;
  try {
    const captchaToken = await getCaptchaToken();
    const { data, error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
    return error ? null : data.session;
  } catch {
    return null;
  }
}

// A device holds one login at a time; a non-anonymous one is a staff login.
export const isStaffSession = (session) => Boolean(session && !session.user.is_anonymous);
