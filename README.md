<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a1bf94d0-bc83-453e-9f59-cbf8e8f572c7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Lead API Security

Lead submission requires Cloudflare Turnstile. Create a Turnstile widget for the production domain, then set `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and `ALLOWED_ORIGINS` in the deployment environment. The secret must never use a `VITE_` prefix.

The server accepts at most five lead API requests per IP address in ten minutes, validates the Turnstile token server-side, rejects a hidden honeypot field, and blocks origins outside `ALLOWED_ORIGINS`. Keep Supabase Row Level Security enabled and do not create public write policies for the `leads` table; only the server should have `SUPABASE_SERVICE_ROLE_KEY`.

The browser never talks to Supabase directly — there is no client-side Supabase client in this app. Both `leads` writes and `testimonials` reads go through server API routes using the service-role key, and the `anon`/`authenticated` roles have **zero** table privileges (RLS enabled with no policies, plus explicit `REVOKE`d grants as a second layer). Run [`supabase-security-lockdown.sql`](supabase-security-lockdown.sql) against your Supabase project's SQL Editor to apply/verify this.




Important: domain name and important values stored in need.json which needed to edit after real domain
