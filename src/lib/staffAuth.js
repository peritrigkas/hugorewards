// Staff sign-in for the owner dashboard (Supabase Auth email + password).
import { supabase } from "../supabaseClient";
import { getCaptchaToken } from "./captcha";

// True on success, false for a wrong email/password, a failed bot check or any
// other error.
export async function signInStaff(email, password) {
  try {
    const captchaToken = await getCaptchaToken();
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
    return !error;
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

export async function signOutStaff() {
  await supabase.auth.signOut();
}
