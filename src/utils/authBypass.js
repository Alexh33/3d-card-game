import { supabase } from "../supabaseClient";

const BYPASS_KEY = "mm_admin_bypass";
const BYPASS_USER = {
  id: "admin-local",
  email: "admin@local",
  role: "admin-bypass",
};

export function enableBypass() {
  localStorage.setItem(BYPASS_KEY, "true");
}

export function disableBypass() {
  localStorage.removeItem(BYPASS_KEY);
}

export function getBypassUser() {
  return localStorage.getItem(BYPASS_KEY) === "true" ? BYPASS_USER : null;
}

export async function getUserOrBypass() {
  const bypassUser = getBypassUser();
  if (bypassUser) {
    return { user: bypassUser, bypass: true };
  }

  const { data, error } = await supabase.auth.getUser();
  return {
    user: data?.user ?? null,
    error,
    bypass: false,
  };
}
