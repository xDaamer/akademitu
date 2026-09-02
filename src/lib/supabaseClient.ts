import { createClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client, using the public anon/publishable key.
 *
 * Safe to ship in the client bundle: this key can only do what
 * supabase-anon-lead-insert.sql's RLS policies explicitly allow —
 * INSERT/UPDATE on `leads` (never SELECT/DELETE) and SELECT on published
 * `testimonials`. Never use this client for anything that needs the
 * service-role key (that stays server-only, see server.ts).
 *
 * `null` when the env vars aren't configured, so callers can fail closed
 * the same way the rest of this app already does (see saveLocalLead in
 * supabase.ts) instead of throwing at import time.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

if (!supabase) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not configured — ' +
    'lead form writes will only be saved to localStorage and testimonials will not load.',
  );
}
