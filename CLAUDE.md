# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

akademITU — a Turkish-language marketing site (YKS/LGS exam coaching) built as a single-page React app with a small Express backend (`server.ts`). The backend originally proxied the two-step lead-capture form into Supabase; that proxy is currently unreachable in production on Vercel (see Architecture below) and the form now writes to Supabase directly from the browser instead. It originated from a Google AI Studio scaffold (see `metadata.json` / `.env.example` Gemini references) but the app does **not** currently call the Gemini API anywhere in `src/` or `server.ts` — treat those as inherited boilerplate, not live functionality.

## Commands

- `npm run dev` — starts `dev-server.ts` via `tsx`, which boots Express (imported from `server.ts`) with Vite in middleware mode (one process serves both the API and the SPA with HMR). Not `server.ts` directly — see the vite-isolation note below.
- `npm run build` — runs `scripts/generate-seo.ts` (writes `public/sitemap.xml` / `public/robots.txt` from `need.json`), then `vite build`, then bundles `server.ts` to `server-dist/server.cjs` with esbuild.
- `npm start` — runs the built `server-dist/server.cjs` (production mode, serves static `dist/` and falls back to `index.html` for SPA routes).
- `npm run lint` — `tsc --noEmit`. There is no separate lint tool (no ESLint) and no test suite/framework in this repo — don't assume `npm test` exists.
- `npm run clean` — removes `dist/`.
- `npm run push` — runs `scripts/push.cjs`, which auto-bumps the patch version in `need.json` and creates a `chore: bump version` commit before pushing (this is how versions in `need.json`/`package.json` get incremented; not manual).

## Architecture

**Single Express app (`server.ts`), split entry points.** `server.ts` defines and exports the Express `app` (routes, middleware) and is imported by two different entry points — it never imports `vite` itself and never binds a port on its own:
- Dev: `dev-server.ts` imports `app` from `server.ts`, adds Vite in middleware mode (`app.use(vite.middlewares)`), and calls `app.listen()`. `vite` is a dev-only dependency deliberately kept out of `server.ts`'s own import graph — a static or dynamic `import ... from "vite"` there gets traced into the Vercel serverless function bundle (see below) and was confirmed to break it at runtime (`FUNCTION_INVOCATION_FAILED` on every request, even a plain `GET /api/health`).
- Prod (`npm start`, not Vercel): `server.ts`'s own `startProductionServer()` (guarded by `!process.env.VERCEL && NODE_ENV === "production"`) serves the static `dist/` output and sends `index.html` for all non-API routes (SPA fallback).
- Vercel: `api/[...path].ts` imports `app` from `server.ts` and wraps it as a serverless function; `vercel.json`'s rewrite (`/((?!api/).*) -> /index.html`) explicitly excludes `/api` so a broken function fails as a 404 instead of silently being served `index.html` (which is what turns into a confusing 405 on non-GET methods). As of this writing the live Vercel deployment still throws `FUNCTION_INVOCATION_FAILED` on every `/api/*` request for a reason that couldn't be diagnosed without access to Vercel's function logs — this is why the lead form and testimonials moved to talking to Supabase directly (next section) instead of depending on this path.

**`need.json` is the single source of site config.** Domain, contact info, social links, and the SEO page list all live in `need.json` and are consumed in three places that must stay in sync conceptually: `server.ts` (dynamic `/sitemap.xml`, `/robots.txt`, `/api/config`), `vite.config.ts` (replaces `{{site.title}}`-style placeholders in `index.html` at build time), and `scripts/generate-seo.ts` (pre-build static generation of `public/sitemap.xml`/`robots.txt`, run via the `prebuild` npm hook). When the real production domain/contact details change, edit `need.json`, not the individual files (README calls this out explicitly).

**Lead form data flow (two-step, direct-to-Supabase via anon key).** The trial-lesson popup (`src/components/PopUpForm.tsx`) collects data in two steps. `src/lib/supabase.ts` always writes a local backup to `localStorage` (`derece_leads`) first as a fail-safe, then talks to Supabase **directly from the browser** using the anon/publishable key (`src/lib/supabaseClient.ts`, `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) — not through `server.ts`'s `/api/leads*` routes, which are unreachable in production (see the Vercel note above) and now effectively dead code kept around in case that gets fixed later.

This is safe only because of the narrow RLS policies in `supabase-anon-lead-insert.sql` (run it in the Supabase SQL Editor before this works) — `anon` has **INSERT-only** on `leads`, never SELECT/UPDATE/DELETE:
1. `saveLeadStep1()` — a plain `supabase.from('leads').insert(...)`, no `.select()` chained (Postgres requires SELECT privilege to return a row under RLS, which `anon` intentionally doesn't have — the returned "id" is just the localStorage fallback id, never a real Supabase one).
2. `updateLeadStep2()` — calls the `update_lead_step2` RPC (a `SECURITY DEFINER` Postgres function), not a raw table `UPDATE`. A raw `.update().eq('phone', ...)` would need `anon` to have SELECT on the `phone` column too (Postgres requires SELECT on any column referenced in an UPDATE's WHERE clause, independent of RLS) — that would let anyone enumerate every submitted phone number via `?select=phone`. The RPC runs with elevated privileges internally instead, so `anon` never gets any SELECT grant on `leads` at all.

Anti-spam is DB-level only (no CAPTCHA, reintroducing Cloudflare Turnstile was considered and declined): a honeypot column (`website`, rejected via the INSERT policy's `WITH CHECK`), Turkish mobile phone format validated again in the `WITH CHECK` (defense in depth beyond the client-side check), the existing `UNIQUE(phone)` constraint, and a blunt global rate-limit trigger (`enforce_leads_insert_rate_limit`, 20 inserts/minute site-wide — there's no per-IP rate limiting available at the RLS/PostgREST level). None of this stops a determined scripted spammer varying phone numbers; it only blocks naive/bulk bot submissions.

Testimonials are read the same way now (`TestimonialsSection.tsx` queries `supabase.from('testimonials')` directly, RLS restricts `anon` to `is_published = true`), also bypassing the broken `/api/testimonials` route.

Do not grant `anon` SELECT or UPDATE on the `leads` table directly — that's exactly the leak `update_lead_step2` was built to avoid. If you need a new field written from step 2, add it to that RPC function's parameters, not a raw client-side `.update()`.

**Teacher photos load dynamically via Vite glob.** `src/utils/teacherLoader.ts` uses `import.meta.glob` to auto-discover images in `src/assets/teachers/*` or `public/teachers/*` at build time and turns filenames into display names; if none are found it falls back to `DEFAULT_TEACHERS` in `src/config.ts`. Adding/removing files in those folders changes the teacher carousel with no code changes needed.

**Routing and page structure.** `src/App.tsx` owns `react-router-dom` routes (`/`, `/gizlilik-politikasi`, `/kullanim-kosullari`, catch-all 404) plus global chrome (Header, Footer, floating call/WhatsApp buttons, sticky mobile CTA, cookie banner) and the popup form's open/close state, which is shared across the whole app rather than owned by individual pages. `src/pages/HomePage.tsx` composes the marketing sections (Hero, Packages, WhyUs, Testimonials, FAQ) and handles scroll-to-section navigation triggered via router `location.state`.

**Site-wide constants** (brand colors, campaign deadline, teacher-carousel scroll speed, default teacher list) live in `src/config.ts` — check there before hardcoding values like colors or dates elsewhere.

## Environment variables

See `.env.example` for the full list. Key points:
- Anything prefixed `VITE_` is exposed to the browser bundle; secrets (`SUPABASE_SERVICE_ROLE_KEY`) must never carry that prefix.
- `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are meant to be public (the anon/publishable key) — they're only as safe as the RLS policies in `supabase-anon-lead-insert.sql`, so don't loosen those policies without re-reading that file's comments.
- `ALLOWED_ORIGINS` is comma-separated and enforced server-side in `server.ts` — currently moot for the lead form/testimonials since those no longer go through `server.ts` in production (see Architecture above), but still applies to any other `/api/*` route.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
