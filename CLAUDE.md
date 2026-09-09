# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

akademITU — a Turkish-language marketing site (YKS/LGS exam coaching) built as a single-page React app with a small Express backend (`server.ts`). The backend proxies the two-step lead-capture form into Supabase; that proxy was unreachable in production on Vercel for a long time (root cause found and fixed 2026-09-08 — see Architecture below) and the form had meanwhile been rewired to talk to Supabase straight from the browser. On 2026-09-09 everything moved back behind the proxy and the browser stopped touching Supabase entirely; there is now also a user portal at `/portal` with cookie-based auth. It originated from a Google AI Studio scaffold (see `metadata.json` / `.env.example` Gemini references) but the app does **not** currently call the Gemini API anywhere in `src/` or `server.ts` — treat those as inherited boilerplate, not live functionality.

## Commands

- `npm run dev` — starts `dev-server.ts` via `tsx`, which boots Express (imported from `server.ts`) with Vite in middleware mode (one process serves both the API and the SPA with HMR). Not `server.ts` directly — see the vite-isolation note below.
- `npm run build` — runs `scripts/generate-seo.ts` (writes `public/sitemap.xml` / `public/robots.txt` from `need.json`), then `vite build`, then bundles `server.ts` to `server-dist/server.cjs` with esbuild.
- `npm start` — runs the built `server-dist/server.cjs` (production mode, serves static `dist/` and falls back to `index.html` for SPA routes).
- `npm run lint` — `tsc --noEmit`. There is no separate lint tool (no ESLint) and no test suite/framework in this repo — don't assume `npm test` exists.
- `npm run clean` — removes `dist/`.
- `npm run push` — plain `git push`, nothing more (a bare alias; `git push` works the same).

**Versioning is manual, by design.** `need.json`'s `site.version` is the source of truth (the footer renders it). Bump it by hand when you want a new version to show. There used to be `scripts/push.cjs` and `scripts/version-bump-on-push.cjs` that auto-bumped the patch on every push; both were deleted on 2026-09-08 because nothing called them any more — `package.json`'s `push` script had become a plain `git push` and `.husky/pre-push` was disabled, so this file was documenting behaviour that hadn't existed for a while. Don't reintroduce automatic bumping without wiring it somewhere real.

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

Both fixes are verified locally (esbuild → ESM → invoke handler reproduces the original error before the change and returns 200 after) but **not yet confirmed on a live deployment**. This matters much more than it used to: since 2026-09-09 the lead form, testimonials and the whole portal go through this function, so if it breaks, they all break. Re-run that local ESM probe after touching anything in `server.ts`'s import graph.

**`need.json` is the single source of site config.** Domain, contact info, social links, and the SEO page list all live in `need.json` and are consumed in three places that must stay in sync conceptually: `scripts/generate-seo.ts` (pre-build generation of `public/sitemap.xml` + `public/robots.txt`, run via the `prebuild` hook), `vite.config.ts` (replaces the `{{site.title}}`-style placeholders that `index.html` actually uses), and `server.ts` (`/api/config` only). `server.ts` used to serve its own dynamic `/sitemap.xml` and `/robots.txt`; those routes were dead duplicates of the static files (and shadowed them in dev, producing different output than production) and were removed on 2026-09-08. When the real production domain/contact details change, edit `need.json`, not the individual files (README calls this out explicitly).

**All Supabase traffic goes through `/api/*` — the browser never talks to Supabase (changed 2026-09-09).** `src/lib/supabaseClient.ts` is **deleted** and `VITE_SUPABASE_*` no longer exist; there is no Supabase key or URL in the client bundle (removing the client library also cut the main chunk from 683 kB to 468 kB). The single HTTP entry point is `src/lib/api.ts` (`apiFetch`, `credentials: 'include'`).

Be precise about *why* this was done, because the obvious reason is wrong: **Supabase's anon key is public by design** — it is a signed JWT carrying only "which project, which role", and hiding it buys nothing on its own. The real gains are:
1. `anon` now has **zero privileges on every table** (`supabase-portal-auth.sql`). That is the actual security boundary, and it is only possible because nothing in the browser needs the key any more.
2. Session tokens live in `httpOnly` cookies (`server/cookies.ts`). Supabase's browser client stores them in `localStorage`, where any XSS can read them. With a portal this stopped being theoretical.
3. Per-IP rate limiting became possible (`public.auth_attempts`). This was explicitly impossible at the RLS/PostgREST level, which is why the old design fell back to a blunt site-wide 20/minute trigger.

**Server-side Supabase clients — which one you use IS the security model** (`server/supabase.ts`):
- `anonServerClient()` — auth calls only (login/signup/refresh). Holds the anon key, which now lives solely on the server.
- `userClient(accessToken)` — **all logged-in user data**. Built per request from the cookie's JWT, so RLS applies as that user. An authorization bug in a route still hits the RLS safety net.
- `serviceClient()` — **bypasses RLS.** Only for things that belong to nobody: lead capture (nobody is logged in yet), published testimonials, the rate-limit counter, and the phone→email lookup at login (the one moment when no session can exist yet). Reading user data with this defeats the entire layer.

**Auth: login by phone, signup by email.** Supabase Auth's own `phone` field is deliberately unused (it would require wiring an SMS provider). The number lives in `public.profiles` (`id` → `auth.users`, `phone` UNIQUE), and `/api/auth/login` translates phone → email server-side. Login and signup return **identical error text** for "no such number" and "wrong password" — splitting them would let anyone enumerate which numbers are registered. Tokens are never returned in a response body. If email confirmation is enabled on the project, signup returns `requiresEmailConfirmation` instead of a session and the UI shows a different screen.

**CSRF.** The `ALLOWED_ORIGINS` check in `server.ts` is **not** CSRF protection — it only inspects `Origin` when present and waves the request through when absent. Real protection is `requireTrustedOrigin` (`server/security.ts`), mounted on `/api/auth`: on state-changing methods `Origin` is **mandatory**, which is safe because browsers always send it on POST. A double-submit token was considered and rejected as redundant next to `sameSite=lax`.

**Lead form data flow (two-step, now server-mediated).** `src/components/PopUpForm.tsx` collects data in two steps. `src/lib/supabase.ts` still writes a `localStorage` backup (`derece_leads`) first as a fail-safe, then POSTs to `/api/leads` and `/api/leads/step2`. Step 2 calls the `update_lead_step2` RPC server-side, which targets that phone's newest `step = 1` row — do **not** replace it with `upsert(onConflict: "phone")`; `leads_phone_key` was dropped when repeat submissions were allowed, so that form fails with Postgres 42P10. Both routes now return real errors: they used to answer `success: true` even when the write failed (and when Supabase was unconfigured), which was invisible while the client talked to Supabase directly but would have meant silent data loss once the form went through them.

Anti-spam: honeypot (`website`), Turkish mobile format validated on the server, the global `enforce_leads_insert_rate_limit` trigger (20 inserts/minute site-wide), plus the in-memory per-IP limiter in `server.ts`. That last one is near-useless on Vercel (each serverless instance has its own memory) — auth uses the Postgres-backed counter instead for exactly this reason. No CAPTCHA; reintroducing Cloudflare Turnstile was considered and declined.

Testimonials are read through `/api/testimonials` (`TestimonialsSection.tsx` → `apiFetch`), same columns and ordering as before.

**Do not grant `anon` anything.** The whole point of `supabase-portal-auth.sql` is that `anon` ended up with no privileges at all; `supabase-anon-lead-insert.sql` is kept only as the documented way back if the proxy ever has to be abandoned. Supabase's security advisor reports "RLS enabled, no policy" for `leads`/`testimonials`/`auth_attempts` — that is the **intended** state here (no policy + no grant = nobody can reach them; only the service role, which bypasses RLS, touches them).

**Teacher photos load dynamically via Vite glob.** `src/utils/teacherLoader.ts` uses `import.meta.glob` to auto-discover images in `src/assets/teachers/*` or `public/teachers/*` at build time and turns filenames into display names; if none are found the ticker simply renders nothing (`DEFAULT_TEACHERS` in `src/config.ts` was deleted; the note below about it was stale). Adding/removing files in those folders changes the teacher carousel with no code changes needed.

**Routing and page structure.** `src/App.tsx` owns `react-router-dom` routes (`/`, `/gizlilik-politikasi`, `/kullanim-kosullari`, `/portal`, `/portal/kayit`, `/portal/panel`, catch-all 404) plus global chrome (Header, Footer, floating call/WhatsApp buttons, sticky mobile CTA, cookie banner) and the popup form's open/close state, which is shared across the whole app rather than owned by individual pages. The `/portal*` routes deliberately render **without** that chrome (`isPortal` in `App.tsx`): the login screen is the product's front door, not a marketing page, and the sticky mobile CTA sat on top of its submit button. `AuthProvider` wraps the app in `src/main.tsx`. `src/pages/HomePage.tsx` composes the marketing sections (Hero, Packages, WhyUs, Testimonials, FAQ) and handles scroll-to-section navigation triggered via router `location.state`.

**Site-wide constants.** `src/config.ts` is now down to `SITE_URL` and `TEACHER_TICKER_PIXELS_PER_SECOND`; `BRAND_COLORS`, `CAMPAIGN_DEADLINE` and `DEFAULT_TEACHERS` were deliberately removed (the file says why). Brand colours live as literal hex in Tailwind classes — `#191F61` navy, `#B6D6CC` mint, `#c5a059` gold, `#101442`/`#1a1f5a`/`#2a3080` gradient stops — because there is no `tailwind.config`. The one theme token that does exist is `--font-sans` in `src/index.css`'s `@theme` block (Geologica); it must stay there rather than in `@layer base`, since Tailwind v4's utilities layer beats base and the `font-sans` utility on `<body>` would otherwise win — which is exactly why the site rendered in the system font until 2026-09-09.

## Environment variables

See `.env.example` for the full list. Key points:
- Anything prefixed `VITE_` is exposed to the browser bundle; secrets (`SUPABASE_SERVICE_ROLE_KEY`) must never carry that prefix.
- `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` **no longer exist.** The anon key moved server-side as `SUPABASE_ANON_KEY` (used for auth calls and for building per-user clients); `SUPABASE_SERVICE_ROLE_KEY` stays server-only as before. Nothing Supabase-related carries a `VITE_` prefix any more, and adding one back would undo the whole proxy layer.
- `ALLOWED_ORIGINS` is comma-separated and enforced server-side in `server.ts`. It now matters for every request, since all Supabase traffic goes through `/api/*`. Note it is not CSRF protection on its own (see the CSRF note in Architecture); include `http://localhost:3000` for local development.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
