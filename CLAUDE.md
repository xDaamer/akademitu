# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

akademITU — a Turkish-language marketing site (YKS/LGS exam coaching) built as a single-page React app with a small Express backend (`server.ts`). The backend originally proxied the two-step lead-capture form into Supabase; that proxy was unreachable in production on Vercel for a long time (root cause found and fixed 2026-09-08 — see Architecture below), and the form meanwhile moved to writing to Supabase directly from the browser, which is still how it works. It originated from a Google AI Studio scaffold (see `metadata.json` / `.env.example` Gemini references) but the app does **not** currently call the Gemini API anywhere in `src/` or `server.ts` — treat those as inherited boilerplate, not live functionality.

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
- Vercel: `api/[...path].ts` imports `app` from `server.ts` and wraps it as a serverless function; `vercel.json`'s rewrite (`/((?!api/).*) -> /index.html`) explicitly excludes `/api` so a broken function fails as a 404 instead of silently being served `index.html` (which is what turns into a confusing 405 on non-GET methods). **The long-standing `FUNCTION_INVOCATION_FAILED` on every `/api/*` request was diagnosed and fixed on 2026-09-08.** Vercel's runtime log gave the actual cause:

```
ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'
imported from /var/task/api/[...path].js
```

`api/[...path].ts` imported `"../server"` **without a file extension**. Because `package.json` sets `"type": "module"`, the compiled function runs as ESM, and Node's ESM resolver — unlike CommonJS — does not guess extensions. Every request died at cold start before reaching any route, which is why even `GET /api/health` 500'd. The fix is the `.js` extension (`import app from "../server.js"`); `dev-server.ts` was aligned to the same form so the mistake can't reappear unnoticed. Note this is unrelated to the `vite`-in-the-import-graph trap described above, which is a separate, still-valid constraint.

A second, independent bug surfaced while verifying that fix: `server.ts` reads `need.json` via `readFileSync(process.cwd() + "/need.json")`, and Vercel's file tracer only follows **static imports** — it cannot see a runtime path, so `need.json` was never packaged and `/api/config` returned an empty object. `vercel.json` now declares it explicitly:

```json
"functions": { "api/**": { "includeFiles": "need.json" } }
```

Both fixes are verified locally (esbuild → ESM → invoke handler reproduces the original error before the change and returns 200 after) but **not yet confirmed on a live deployment**. The lead form and testimonials still talk to Supabase directly (next section); that path is independent and does not depend on this function.

**`need.json` is the single source of site config.** Domain, contact info, social links, and the SEO page list all live in `need.json` and are consumed in three places that must stay in sync conceptually: `scripts/generate-seo.ts` (pre-build generation of `public/sitemap.xml` + `public/robots.txt`, run via the `prebuild` hook), `vite.config.ts` (replaces the `{{site.title}}`-style placeholders that `index.html` actually uses), and `server.ts` (`/api/config` only). `server.ts` used to serve its own dynamic `/sitemap.xml` and `/robots.txt`; those routes were dead duplicates of the static files (and shadowed them in dev, producing different output than production) and were removed on 2026-09-08. When the real production domain/contact details change, edit `need.json`, not the individual files (README calls this out explicitly).

**Lead form data flow (two-step, direct-to-Supabase via anon key).** The trial-lesson popup (`src/components/PopUpForm.tsx`) collects data in two steps. `src/lib/supabase.ts` always writes a local backup to `localStorage` (`derece_leads`) first as a fail-safe, then talks to Supabase **directly from the browser** using the anon/publishable key (`src/lib/supabaseClient.ts`, `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) — not through `server.ts`'s `/api/leads*` routes. Those routes were unreachable for a long time (see the Vercel note above); the function is fixed now, but the browser-direct path is the one in use and the RLS design below is what makes it safe. The `/api/leads*` routes remain unused.

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
