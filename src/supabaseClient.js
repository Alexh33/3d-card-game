import { createClient } from "@supabase/supabase-js";

// Use env vars so keys aren't hardcoded.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://gestmnabxqgceogoipxf.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  // Fail fast to make missing config obvious in local dev/previews.
  throw new Error("Missing VITE_SUPABASE_ANON_KEY. Set it in your .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
