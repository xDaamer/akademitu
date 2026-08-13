import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer as createViteServer } from "vite";
import need from "./need.json" with { type: "json" };

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Supabase client (hidden from browser/frontend)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const supabase =
  supabaseUrl && supabaseKey && supabaseUrl.startsWith("http")
    ? createClient(supabaseUrl, supabaseKey)
    : null;

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

// Step 1: Lead Submission (Name & Phone)
app.post("/api/leads", async (req, res) => {
  const { fullName, phone, examType } = req.body;

  if (!fullName || !phone) {
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
      console.warn("[Server API] Supabase Step 1 Notice:", error.message);
      return res.json({ success: true, id: "srv_" + Date.now(), warning: error.message });
    }

    return res.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("[Server API] Supabase Exception Step 1:", err?.message || err);
    return res.json({ success: true, id: "srv_" + Date.now() });
  }
});

// Step 2: Lead Details Update
app.post("/api/leads/step2", async (req, res) => {
  const {
    leadId,
    phone,
    studentFullName,
    parentFullName,
    userRole,
    gradeClass,
    selectedSubjects,
  } = req.body;

  if (!phone || !studentFullName) {
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
      const resUpdate = await supabase
        .from("leads")
        .update(payload)
        .eq("id", leadId);
      error = resUpdate.error;
    } else {
      const resUpdatePhone = await supabase
        .from("leads")
        .update(payload)
        .eq("phone", payload.phone);

      if (resUpdatePhone.error || !resUpdatePhone.data) {
        const resInsert = await supabase
          .from("leads")
          .insert([payload]);
        error = resInsert.error;
      }
    }

    if (error) {
      console.warn("[Server API] Supabase Step 2 Notice:", error.message);
    }

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Server API] Supabase Exception Step 2:", err?.message || err);
    return res.json({ success: true });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
