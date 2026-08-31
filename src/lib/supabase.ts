import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = (() => {
  if (!url || !anonKey) return false;
  if (url.includes("your-project-url") || anonKey.includes("your-anon-key")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
})();

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env and set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  if (!client) {
    client = createClient<Database>(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "mrs-auth",
      },
    });
  }

  return client;
}
