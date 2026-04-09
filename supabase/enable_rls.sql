-- Enable Row Level Security on all user-data tables.
--
-- This app uses a custom FastAPI backend with its own JWT auth (not Supabase Auth).
-- The backend connects via DATABASE_URL using the Supabase service role, which
-- automatically bypasses RLS — so the backend continues to work unchanged.
--
-- Enabling RLS with NO policies for anon/authenticated roles means:
--   - Direct PostgREST API calls (via the public anon key) are fully blocked.
--   - No user data is readable or writable through the Supabase REST/GraphQL endpoints.
--
-- HOW TO APPLY: Paste this file into the Supabase SQL Editor and run it.

-- ── users ──────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Explicitly deny all direct access (belt-and-suspenders; no policy = deny already).
REVOKE ALL ON public.users FROM anon, authenticated;

-- ── user_networks ──────────────────────────────────────────────────────────
ALTER TABLE public.user_networks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.user_networks FROM anon, authenticated;

-- ── simulation_runs ────────────────────────────────────────────────────────
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.simulation_runs FROM anon, authenticated;
