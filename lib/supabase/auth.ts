import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Resolve the authenticated user for the current request. Returns the user and a
 * ready-to-use RLS-scoped Supabase client, or null when not signed in.
 * Use `getUser()` (not `getSession()`) so the token is verified with Supabase.
 */
export async function getAuth(): Promise<{ user: User; sb: SupabaseClient } | null> {
  const sb = await createClient();
  const {
    data: { user }
  } = await sb.auth.getUser();
  return user ? { user, sb } : null;
}
