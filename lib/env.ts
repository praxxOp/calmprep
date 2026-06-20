/**
 * Centralised, validated environment access.
 *
 * Split into `publicEnv` (safe in the browser, `NEXT_PUBLIC_*`) and `serverEnv`
 * (secrets — only ever read inside server code). Importing `serverEnv` into a
 * `"use client"` module is a build-time mistake we want to make obvious.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}. Add it to .env.local (see .env.example).`
    );
  }
  return value;
}

/** Safe to reference from client or server. */
export const publicEnv = {
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
};

/** SERVER ONLY. Never import this from a "use client" file. */
export const serverEnv = {
  get geminiApiKey() {
    return required("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL || "gemini-2.5-flash";
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
};
