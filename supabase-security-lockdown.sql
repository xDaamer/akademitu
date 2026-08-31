-- SUPABASE SQL: Security Lockdown for `leads` and `testimonials`
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor).
--
-- Why: the app now talks to Supabase exclusively from the server (server.ts),
-- using the service_role key, which bypasses Row Level Security entirely.
-- The `anon` (and `authenticated`) roles used by the public REST/Realtime API
-- therefore need ZERO privileges on these tables. If they have any, anyone
-- who has ever seen your anon key can read/write/delete rows directly at
-- https://<project>.supabase.co/rest/v1/<table>, completely bypassing the
-- server's rate limiting, Turnstile check, and honeypot.
--
-- Two layers are applied to each table:
--   1) Row Level Security enabled, with NO policies for anon/authenticated
--      (RLS enabled + no matching policy = Postgres denies by default).
--   2) Explicit REVOKE of the underlying table grants, so that even if RLS
--      were ever accidentally disabled later, anon/authenticated still
--      couldn't touch the table.
--
-- Safe to run multiple times (idempotent).

-- =========================================================================
-- leads
-- =========================================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'leads'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.leads', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.leads FROM anon, authenticated;

-- =========================================================================
-- testimonials
-- =========================================================================
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'testimonials'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.testimonials', pol.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.testimonials FROM anon, authenticated;

-- =========================================================================
-- Prevent this from silently happening again on future tables
-- =========================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- =========================================================================
-- Verification (run these after the block above)
-- =========================================================================
-- Should return ZERO rows for leads/testimonials:
--   select * from pg_policies where schemaname = 'public' and tablename in ('leads', 'testimonials');
--
-- Should show no privileges for anon/authenticated on leads/testimonials:
--   select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name in ('leads', 'testimonials')
--   order by table_name, grantee;
--
-- External proof the leak is closed (run from any machine, replace <project> and <anon-key>):
--   curl "https://<project>.supabase.co/rest/v1/leads?select=*" \
--     -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>"
--   -> should return a permission-denied error, not row data.
