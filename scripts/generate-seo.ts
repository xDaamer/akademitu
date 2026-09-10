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
/*
 * Yalnızca bu sitede GERÇEKTEN var olan yollar listelenir.
 * Eskiden /admin/, /cart/, /src/, /dist/, /node_modules/ gibi bu projede
 * hiç yayınlanmayan yollar ve Google'ın yok saydığı `Crawl-delay` vardı;
 * var olmayan kuralları listelemek dosyayı okunmaz yapıyor ve gerçek bir
 * kural eklendiğinde gözden kaçmasına yol açıyordu.
 *
 * /assets/ ve /teachers/ bilinçli olarak AÇIK: Google sayfayı render
 * edebilmek için JS, CSS ve görsellere erişmek zorunda.
 *
 * PANEL ALT ALAN ADI (portal.akademitu.com) BURADAN ENGELLENMEZ ve
 * engellenmemeli. Aynı statik dosya iki host'tan da servis edildiği için
 * buraya yazılacak bir `Disallow: /` ana siteyi de kapatırdı. Panelin dizine
 * girmemesini sağlayan şey vercel.json'daki host koşullu
 * `X-Robots-Tag: noindex, nofollow` başlığı — ve doğrusu da budur: robots.txt
 * ile taramayı engellemek, tarayıcının o noindex başlığını GÖRMESİNİ de
 * engeller, yani adres yine de dizinde kalabilir. Tara ama dizine alma.
 */
const robotsTxt = `# robots.txt for ${need.site.name}

User-agent: *
Allow: /

# Sunucu uçları taranmasın (SPA rewrite dışında kalan tek alan).
Disallow: /api/

Sitemap: ${need.site.domain}/sitemap.xml`;

fs.writeFileSync(
  path.join(publicDir, "robots.txt"),
  robotsTxt,
  "utf-8"
);
console.log("✅ Generated: public/robots.txt");
