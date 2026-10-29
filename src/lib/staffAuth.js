// Staff sign-in for the owner dashboard (Supabase Auth email + password).
import { supabase } from "../supabaseClient";

// True on success, false for a wrong email/password or any other error.
export async function signInStaff(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
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
