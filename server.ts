import express from "express";
import path from "path";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Plain readFileSync+JSON.parse instead of `import ... with { type: "json" }` or
// createRequire(import.meta.url): both rely on syntax/semantics that can break
// depending on whether Vercel's Node function runtime bundles this as ESM or CJS.
// readFileSync + process.cwd() has no module-system-specific syntax at all, so it
// behaves identically under tsx (dev), esbuild (npm start), and Vercel.
//
// Wrapped in try/catch: this runs at module load (cold start). If it throws
// unguarded, the whole function fails to load and EVERY route 500s
// (FUNCTION_INVOCATION_FAILED) — including ones that never touch `need` —
// which is exactly the failure mode this deployment kept hitting. Falling
// back to a minimal shape keeps the function alive even if the file can't
// be read, so at least the actual error is diagnosable from server logs
// instead of a blanket crash.
let need: any = { site: {}, contact: {}, social: {}, seo: { pages: [] } };
try {
  need = JSON.parse(readFileSync(path.join(process.cwd(), "need.json"), "utf-8"));
} catch (err: any) {
  console.error("[Server API] Failed to read need.json:", err?.message || err);
}

// quiet: true suppresses dotenv's own startup log line (including its random
// promotional "tip" messages) so it never buries the Supabase error logs below.
dotenv.config({ quiet: true });

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");

  const origin = req.get("origin");
  if (origin && allowedOrigins.size > 0 && !allowedOrigins.has(origin)) {
    return res.status(403).json({ success: false, error: "Geçersiz istek kaynağı." });
  }

  next();
});

type RateLimitEntry = { count: number; resetAt: number };
const leadRequestLimits = new Map<string, RateLimitEntry>();
const LEAD_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const LEAD_RATE_LIMIT_MAX_REQUESTS = 5;

function limitLeadRequests(req: express.Request, res: express.Response, next: express.NextFunction) {
  const now = Date.now();
  const clientIp = req.ip || "unknown";
  const entry = leadRequestLimits.get(clientIp);

  if (!entry || entry.resetAt <= now) {
    leadRequestLimits.set(clientIp, { count: 1, resetAt: now + LEAD_RATE_LIMIT_WINDOW_MS });
    return next();
  }

  if (entry.count >= LEAD_RATE_LIMIT_MAX_REQUESTS) {
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
    return res.status(429).json({ success: false, error: "Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin." });
  }

  entry.count += 1;
  next();
}

function isValidTurkishMobile(value: string) {
  return /^0?5\d{9}$/.test(value.replace(/\D/g, ""));
}

// Server-side Supabase client (hidden from browser/frontend).
// Intentionally uses ONLY the service-role key: it bypasses Row Level
// Security, so this is the sole path allowed to touch `leads`/`testimonials`.
// Never fall back to an anon key here — anon has zero table privileges by
// design (see supabase-security-lockdown.sql), so a fallback would only
// mask a misconfigured deployment instead of failing loudly.
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// A small function (rather than the try/catch inline) so `supabase`'s type
// is still inferred straight from the real createClient(url, key) call,
// same as the plain ternary this replaced — inlining the try/catch around
// a pre-declared `let supabase: ReturnType<typeof createClient> | null`
// loses that inference and turns every later .insert()/.upsert() row type
// into `never`.
function createSupabaseClient() {
  if (!supabaseUrl || !supabaseKey || !supabaseUrl.startsWith("http")) return null;
  try {
    return createClient(supabaseUrl, supabaseKey);
  } catch (err: any) {
    // createClient() can throw synchronously on a malformed URL. Never let
    // that take down the whole function at cold start (see the need.json
    // note above) — fail open to null instead, same as when it's simply
    // not configured.
    console.error("[Server API] Failed to create Supabase client:", err?.message || err);
    return null;
  }
}

const supabase = createSupabaseClient();

if (!supabase) {
  console.warn(
    "[Server API] Supabase not configured (missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY). " +
    "Leads will only be logged/stored locally and /api/testimonials will return an empty list.",
  );
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", supabaseConfigured: !!supabase });
});

// SEO: Dynamic Sitemap from need.json
app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml");
  
  const sitemapEntries = need.seo.pages
    .map(page => `
  <url>
    <loc>${need.site.domain}${page.path}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
    .join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.mobile.googlebot.org/schemas/mobile/1.0">
${sitemapEntries}
</urlset>`;

  res.send(sitemap);
});

// SEO: Dynamic robots.txt from need.json
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain");
  
  const robotsTxt = `# robots.txt for ${need.site.name}
# Allow Google and other search engines to crawl public pages

User-agent: *
Allow: /
Allow: /index.html
Allow: /sitemap.xml
Allow: /public/

# Disallow private/unnecessary routes
Disallow: /admin/
Disallow: /dashboard/
Disallow: /user/
Disallow: /account/
Disallow: /checkout/
Disallow: /cart/
Disallow: /.git/
Disallow: /node_modules/
Disallow: /src/
Disallow: /dist/
Disallow: /build/

# Crawl delay
Crawl-delay: 1

# Sitemap location
Sitemap: ${need.site.domain}/sitemap.xml
`;

  res.send(robotsTxt);
});

// API endpoint to get site config (for frontend)
app.get("/api/config", (_req, res) => {
  res.json({
    site: need.site,
    contact: need.contact,
    social: need.social
  });
});

// Public testimonials list (server-mediated: browser never talks to Supabase directly)
app.get("/api/testimonials", async (_req, res) => {
  if (!supabase) {
    return res.json({ success: true, testimonials: [] });
  }

  try {
    const { data, error } = await supabase
      .from("testimonials")
      .select("id, student_name, student_grade, content, rating")
      .eq("is_published", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("[Server API] Supabase Testimonials Notice:", error.message);
      return res.json({ success: true, testimonials: [] });
    }

    return res.json({ success: true, testimonials: data ?? [] });
  } catch (err: any) {
    console.error("[Server API] Supabase Exception Testimonials:", err?.message || err);
    return res.json({ success: true, testimonials: [] });
  }
});

// Step 1: Lead Submission (Name & Phone)
app.post("/api/leads", limitLeadRequests, async (req, res) => {
  const { fullName, phone, examType, website } = req.body;

  if (website || typeof fullName !== "string" || typeof phone !== "string" || !fullName.trim() || !isValidTurkishMobile(phone)) {
    return res.status(400).json({ success: false, error: "Ad soyad ve telefon zorunludur." });
  }

  const payload = {
    full_name: String(fullName).trim(),
    phone: String(phone).trim(),
    exam_type: examType ? String(examType).trim() : "YKS",
    step: 1,
    created_at: new Date().toISOString(),
  };

  if (!supabase) {
    console.log("[Server API] Lead Step 1 received (Supabase not configured):", payload);
    return res.json({ success: true, id: "srv_" + Date.now() });
  }

  try {
    const { data, error } = await supabase
      .from("leads")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      // Full detail (message/code/details/hint) so a misconfigured service-role
      // key, schema mismatch, or RLS issue is diagnosable from Vercel/server logs
      // even though the client always gets success:true (see file header note).
      console.error("[Server API] Supabase Step 1 INSERT failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        payload,
      });
      return res.json({ success: true, id: "srv_" + Date.now(), warning: error.message });
    }

    return res.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("[Server API] Supabase Exception Step 1:", err?.message || err, { payload });
    return res.json({ success: true, id: "srv_" + Date.now() });
  }
});

const ALLOWED_EXAM_TYPES = new Set(["YKS", "LGS", "Diğer"]);

// Step 2: Lead Details Update
app.post("/api/leads/step2", limitLeadRequests, async (req, res) => {
  const {
    leadId,
    phone,
    fullName,
    examType,
    studentFullName,
    parentFullName,
    userRole,
    gradeClass,
    selectedSubjects,
    website,
  } = req.body;

  if (website || typeof phone !== "string" || typeof studentFullName !== "string" || !studentFullName.trim() || !isValidTurkishMobile(phone)) {
    return res.status(400).json({ success: false, error: "Telefon ve öğrenci adı zorunludur." });
  }

  const payload = {
    phone: String(phone).trim(),
    student_full_name: String(studentFullName).trim(),
    parent_full_name: parentFullName ? String(parentFullName).trim() : "",
    user_role: userRole || "Öğrenci",
    grade_class: gradeClass || "",
    selected_subjects: Array.isArray(selectedSubjects) ? selectedSubjects : [],
    step: 2,
    updated_at: new Date().toISOString(),
  };

  if (!supabase) {
    console.log("[Server API] Lead Step 2 received (Supabase not configured):", payload);
    return res.json({ success: true });
  }

  try {
    let error;
    if (leadId && !String(leadId).startsWith("lead_") && !String(leadId).startsWith("srv_")) {
      // Step 1's insert gave us a real row id - update it directly.
      const resUpdate = await supabase
        .from("leads")
        .update(payload)
        .eq("id", leadId);
      error = resUpdate.error;
    } else {
      // Step 1 either never ran (leadId missing) or its insert failed and we
      // only have a fake fallback id ("srv_"/"lead_" prefixed) - there may or
      // may not already be a row for this phone. `phone` is UNIQUE, so upsert
      // on that conflict key does the right thing atomically in one round
      // trip: update the existing row, or insert a new one if none exists.
      // Carrying full_name/exam_type here too means the row is complete even
      // when step 1's insert never landed (see saveLeadStep1 in supabase.ts).
      const upsertPayload: Record<string, unknown> = { ...payload };
      if (fullName) upsertPayload.full_name = String(fullName).trim();
      if (examType && ALLOWED_EXAM_TYPES.has(String(examType))) upsertPayload.exam_type = String(examType);

      const resUpsert = await supabase
        .from("leads")
        .upsert(upsertPayload, { onConflict: "phone" });
      error = resUpsert.error;
    }

    if (error) {
      console.error("[Server API] Supabase Step 2 write failed:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        leadId,
        payload,
      });
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Server API] Supabase Exception Step 2:", err?.message || err, { leadId, payload });
    return res.json({ success: true });
  }
});

function startProductionServer() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// On Vercel, this file is imported by api/[...path].ts as a serverless
// function handler — it must never bind a port or serve dist/ from local
// disk there (Vercel serves the static build and routes /api/* to the
// function separately).
//
// Local dev (`npm run dev`) does NOT run this file directly — it runs
// dev-server.ts instead, which imports `app` from here and adds Vite's
// middleware itself. That split matters: this file must never reference
// `vite` in any way (static or dynamic import), because Vercel's function
// bundler traces every import reachable from this file — including dynamic
// ones — to decide what to include in the deployed function. Pulling in
// `vite` (a large dev-only tool) that way was confirmed to break the
// function at runtime (every /api/* request failed with
// FUNCTION_INVOCATION_FAILED, even simple GETs, i.e. a cold-start crash).
//
// `npm start` (production, `node server-dist/server.cjs`) does run this
// file directly, hence the production-only branch below.
if (!process.env.VERCEL && process.env.NODE_ENV === "production") {
  startProductionServer();
}

export default app;
