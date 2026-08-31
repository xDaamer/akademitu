# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

akademITU — a Turkish-language marketing site (YKS/LGS exam coaching) built as a single-page React app with a small Express backend that exists mainly to proxy a two-step lead-capture form into Supabase. It originated from a Google AI Studio scaffold (see `metadata.json` / `.env.example` Gemini references) but the app does **not** currently call the Gemini API anywhere in `src/` or `server.ts` — treat those as inherited boilerplate, not live functionality.

## Commands

- `npm run dev` — starts `server.ts` via `tsx`, which boots Express with Vite in middleware mode (one process serves both the API and the SPA with HMR).
- `npm run build` — runs `scripts/generate-seo.ts` (writes `public/sitemap.xml` / `public/robots.txt` from `need.json`), then `vite build`, then bundles `server.ts` to `dist/server.cjs` with esbuild.
- `npm start` — runs the built `dist/server.cjs` (production mode, serves static `dist/` and falls back to `index.html` for SPA routes).
- `npm run lint` — `tsc --noEmit`. There is no separate lint tool (no ESLint) and no test suite/framework in this repo — don't assume `npm test` exists.
- `npm run clean` — removes `dist/`.
- `npm run push` — runs `scripts/push.cjs`, which auto-bumps the patch version in `need.json` and creates a `chore: bump version` commit before pushing (this is how versions in `need.json`/`package.json` get incremented; not manual).

## Architecture

**Single Express server, two modes.** `server.ts` is the only backend entry point in both dev and prod:
- Dev: Vite runs in middleware mode inside the same Express process (`app.use(vite.middlewares)`), so there's no separate frontend dev server.
- Prod: Express serves the static `dist/` output and sends `index.html` for all non-API routes (SPA fallback), matching `vercel.json`'s rewrite rule for deployment on Vercel.

**`need.json` is the single source of site config.** Domain, contact info, social links, and the SEO page list all live in `need.json` and are consumed in three places that must stay in sync conceptually: `server.ts` (dynamic `/sitemap.xml`, `/robots.txt`, `/api/config`), `vite.config.ts` (replaces `{{site.title}}`-style placeholders in `index.html` at build time), and `scripts/generate-seo.ts` (pre-build static generation of `public/sitemap.xml`/`robots.txt`, run via the `prebuild` npm hook). When the real production domain/contact details change, edit `need.json`, not the individual files (README calls this out explicitly).

**Lead form data flow (two-step, security-hardened).** The trial-lesson popup (`src/components/PopUpForm.tsx`) collects data in two steps and never talks to Supabase directly from the browser:
1. `src/lib/supabase.ts` (misnomer — it's a fetch wrapper, not a Supabase client) posts to `/api/leads` (step 1: name + phone) and `/api/leads/step2` (step 2: student/parent/grade/subjects), always writing a local backup to `localStorage` (`derece_leads`) first as a fail-safe.
2. `server.ts` holds the real Supabase client, built from `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (service-role key is server-only, never exposed to the client). It enforces: per-IP rate limiting (5 requests / 10 min, in-memory `Map`), a hidden honeypot field (`website`), Turkish mobile phone format validation, and an `ALLOWED_ORIGINS` origin allowlist. If Supabase isn't configured or errors, the endpoints still return `success: true` so the UX doesn't break (data is logged server-side / kept in the client's localStorage backup).

Do not add public Supabase INSERT/UPDATE policies for the `leads` table (see `supabase-testimonials-setup.sql` and the comment block in `src/lib/supabase.ts` for the expected table schema) — all writes must go through the server's service-role key.

**Teacher photos load dynamically via Vite glob.** `src/utils/teacherLoader.ts` uses `import.meta.glob` to auto-discover images in `src/assets/teachers/*` or `public/teachers/*` at build time and turns filenames into display names; if none are found it falls back to `DEFAULT_TEACHERS` in `src/config.ts`. Adding/removing files in those folders changes the teacher carousel with no code changes needed.

**Routing and page structure.** `src/App.tsx` owns `react-router-dom` routes (`/`, `/gizlilik-politikasi`, `/kullanim-kosullari`, catch-all 404) plus global chrome (Header, Footer, floating call/WhatsApp buttons, sticky mobile CTA, cookie banner) and the popup form's open/close state, which is shared across the whole app rather than owned by individual pages. `src/pages/HomePage.tsx` composes the marketing sections (Hero, Packages, WhyUs, Testimonials, FAQ) and handles scroll-to-section navigation triggered via router `location.state`.

**Site-wide constants** (brand colors, campaign deadline, teacher-carousel scroll speed, default teacher list) live in `src/config.ts` — check there before hardcoding values like colors or dates elsewhere.

## Environment variables

See `.env.example` for the full list. Key points:
- Anything prefixed `VITE_` is exposed to the browser bundle; secrets (`SUPABASE_SERVICE_ROLE_KEY`) must never carry that prefix.
- `ALLOWED_ORIGINS` is comma-separated and enforced server-side in `server.ts`.
