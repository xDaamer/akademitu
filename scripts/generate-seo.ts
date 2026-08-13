import fs from "fs";
import path from "path";
import need from "../need.json" with { type: "json" };

const publicDir = path.join(import.meta.url.replace("file://", ""), "../../public");

// Generate sitemap.xml
const sitemapEntries = need.seo.pages
  .map(
    (page: any) => `
  <url>
    <loc>${need.site.domain}${page.path}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>${page.changefreq || "weekly"}</changefreq>
    <priority>${page.priority || 0.8}</priority>
  </url>`
  )
  .join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.mobile.googlebot.org/schemas/mobile/1.0">
${sitemapEntries}
</urlset>`;

fs.writeFileSync(
  path.join(publicDir, "sitemap.xml"),
  sitemap,
  "utf-8"
);
console.log("✅ Generated: public/sitemap.xml");

// Generate robots.txt
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

Crawl-delay: 1
Sitemap: ${need.site.domain}/sitemap.xml`;

fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  robotsTxt,
  "utf-8"
);
console.log("✅ Generated: public/robots.txt");
