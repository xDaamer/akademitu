import fs from "fs";
import path from "path";
import need from "../../need.json" with { type: "json" };
import { ContentError, loadBlogContent, type BlogContent, type BlogPost } from "./content.js";
import { renderInline } from "./markdown.js";
import {
  authorPage, esc, listPage, notFoundPage, organizationNode, postPage, SITE,
} from "./templates.js";
import {
  absolute, authorPath, blogHome, blogPage, categoryPage, categoryPath,
  postPath, POSTS_PER_PAGE, rssPath, tagPath,
} from "./urls.js";

/**
 * BLOG SAYFALARINI ÜRETİR — `vite build`'den SONRA çalışır.
 * ============================================================================
 * Çıktı doğrudan `dist/` içine yazılıyor, `public/` içine değil. Sebep:
 * public/ depoya commit'lenen kaynak dizin; üretilmiş yüzlerce HTML dosyasını
 * oraya koymak, build çıktısını depoya karıştırmak olurdu.
 *
 * SAYFALAR KLASÖR/index.html BİÇİMİNDE yazılıyor (`dist/blog/<slug>/index.html`).
 * Bu bilinçli: Vercel istek karşılarken önce DOSYA SİSTEMİNE bakıyor, rewrite
 * kurallarına sonra. Yani /blog/<slug> adresinde gerçek bir dosya bulunduğu
 * için vercel.json'daki SPA yakalayıcısı ("/((?!api/).*)" -> /index.html) hiç
 * devreye girmiyor. Blog için ayrı bir rewrite kuralı eklemek gerekmiyor ve
 * fonksiyon da hiç çalışmıyor — sayfalar CDN'den statik olarak geliyor.
 */

const DIST = path.join(process.cwd(), "dist");

function yaz(rota: string, html: string) {
  /* "/blog" -> dist/blog/index.html ; "/blog/x" -> dist/blog/x/index.html */
  const hedef = path.join(DIST, rota.replace(/^\//, ""), "index.html");
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, html, "utf-8");
}

function dosyaYaz(rota: string, icerik: string) {
  const hedef = path.join(DIST, rota.replace(/^\//, ""));
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.writeFileSync(hedef, icerik, "utf-8");
}

function sayfala<T>(items: T[], perPage: number): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += perPage) pages.push(items.slice(i, i + perPage));
  return pages;
}

/* -------------------------------------------------------------------------- */

function blogListeleri(content: BlogContent) {
  const oneCikan = content.posts.find((post) => post.featured) ?? content.posts[0] ?? null;
  /* Öne çıkan yazı büyük kartta zaten görünüyor; listede ikinci kez
     tekrarlanmıyor. */
  const kalan = content.posts.filter((post) => post.slug !== oneCikan?.slug);
  const sayfalar = sayfala(kalan, POSTS_PER_PAGE);

  sayfalar.forEach((sayfaYazilari, index) => {
    const page = index + 1;
    const rota = blogPage(page);

    yaz(rota, listPage({
      /* Her sayfa KENDİ KENDİNE kanonik (Faz 1 §5.1): 2. sayfa 1. sayfaya
         canonical vermiyor, aksi halde oradaki yazılar dizine hiç girmezdi. */
      title: page === 1
        ? `YKS ve LGS Hazırlık Rehberi | ${need.site.name} Blog`
        : `YKS ve LGS Hazırlık Rehberi — Sayfa ${page} | ${need.site.name} Blog`,
      description:
        "YKS ve LGS hazırlığı için konu rehberleri, çalışma yöntemleri, deneme analizi ve veli rehberleri. Derece yapmış hocaların kaleminden.",
      heading: "YKS ve LGS Hazırlık Rehberi",
      introHtml: renderInline(
        "Bu blogda sınav hazırlığının üç tarafı var: **ne çalışılacağı** (konu " +
        "rehberleri ve sınav formatı), **nasıl çalışılacağı** (yöntem yazıları) ve " +
        "**süreç nasıl yönetilir** (koçluk ve veli rehberleri).\n\n" +
        "Yazılar ders veren kadronun deneyimine dayanıyor. Sınav formatı ve takvim " +
        "bilgilerinin kaynağı ÖSYM ile MEB kılavuzları; her yazıda hangi bilginin " +
        "nereden geldiği belirtiliyor ve güncel kılavuz esas alınıyor.",
      ),
      path: rota,
      posts: sayfaYazilari,
      content,
      page,
      totalPages: sayfalar.length,
      pageUrl: blogPage,
      crumbs: [
        { name: "Ana Sayfa", path: "/" },
        ...(page === 1 ? [{ name: "Blog", path: blogHome() }] : [
          { name: "Blog", path: blogHome() },
          { name: `Sayfa ${page}`, path: rota },
        ]),
      ],
      featured: page === 1 ? oneCikan : null,
      extraGraph: [{
        "@type": "Blog",
        "@id": `${absolute(SITE, blogHome())}#blog`,
        name: `${need.site.name} Blog`,
        url: absolute(SITE, blogHome()),
        inLanguage: "tr-TR",
        publisher: { "@id": `${SITE}/#organization` },
      }],
    }));
  });
}

function kategoriSayfalari(content: BlogContent) {
  for (const kategori of content.categories) {
    const yazilar = content.posts.filter((post) => post.categorySlug === kategori.slug);
    const sayfalar = sayfala(yazilar, POSTS_PER_PAGE);

    sayfalar.forEach((sayfaYazilari, index) => {
      const page = index + 1;
      const rota = categoryPage(kategori.slug, page);

      yaz(rota, listPage({
        title: page === 1
          ? (kategori.seoTitle || `${kategori.heading} | ${need.site.name} Blog`)
          : `${kategori.heading} — Sayfa ${page} | ${need.site.name} Blog`,
        description: kategori.seoDescription || `${kategori.name} kategorisindeki yazılar.`,
        heading: kategori.heading,
        introHtml: renderInline(kategori.descriptionMarkdown),
        path: rota,
        posts: sayfaYazilari,
        content,
        page,
        totalPages: sayfalar.length,
        pageUrl: (p) => categoryPage(kategori.slug, p),
        crumbs: [
          { name: "Ana Sayfa", path: "/" },
          { name: "Blog", path: blogHome() },
          { name: kategori.name, path: categoryPath(kategori.slug) },
          ...(page > 1 ? [{ name: `Sayfa ${page}`, path: rota }] : []),
        ],
        extraGraph: [{
          "@type": "CollectionPage",
          name: kategori.heading,
          url: absolute(SITE, rota),
          inLanguage: "tr-TR",
          isPartOf: { "@id": `${absolute(SITE, blogHome())}#blog` },
        }],
      }));
    });
  }
}

function etiketSayfalari(content: BlogContent) {
  for (const etiket of content.tags) {
    const yazilar = content.posts.filter((post) => post.tags.includes(etiket.slug));
    const rota = tagPath(etiket.slug);

    /* ETİKET SAYFALARI noindex, follow (Faz 1 §1). İnce ve büyük ölçüde
       kategori sayfalarını tekrar eden sayfalar; taranmalı ama dizine
       girmemeli. */
    yaz(rota, listPage({
      title: `${etiket.name} etiketli yazılar | ${need.site.name} Blog`,
      description: `${etiket.name} etiketiyle işaretlenmiş blog yazıları.`,
      heading: `${etiket.name} etiketli yazılar`,
      introHtml: `<p>Bu etiketle işaretlenmiş ${yazilar.length} yazı listeleniyor.</p>`,
      path: rota,
      posts: yazilar,
      content,
      page: 1,
      totalPages: 1,
      pageUrl: () => rota,
      noindex: true,
      crumbs: [
        { name: "Ana Sayfa", path: "/" },
        { name: "Blog", path: blogHome() },
        { name: etiket.name, path: rota },
      ],
    }));
  }
}

function yazarSayfalari(content: BlogContent) {
  for (const yazar of content.authors) {
    const yazilar = content.posts.filter((post) => post.authorSlug === yazar.slug);
    if (yazilar.length === 0) continue;
    yaz(authorPath(yazar.slug), authorPage(yazar, yazilar, content));
  }
}

/* -------------------------------------------------------------------------- */

function sitemapBlog(content: BlogContent): string {
  const url = (loc: string, lastmod: Date, priority: number) =>
    `  <url>\n    <loc>${esc(absolute(SITE, loc))}</loc>\n` +
    `    <lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>\n` +
    `    <priority>${priority}</priority>\n  </url>`;

  const girisler: string[] = [url(blogHome(), content.posts[0]?.publishedAt ?? new Date(), 0.9)];

  /* YALNIZCA dizine girebilen adresler: noindex yazılar ve etiket sayfaları
     sitemap'te YER ALMAZ (Faz 1 §5.2). */
  for (const post of content.posts) {
    if (post.noindex) continue;
    girisler.push(url(postPath(post.slug), post.contentUpdatedAt ?? post.publishedAt, 0.8));
  }
  for (const kategori of content.categories) {
    const yazilar = content.posts.filter((p) => p.categorySlug === kategori.slug && !p.noindex);
    if (yazilar.length === 0) continue;
    girisler.push(url(categoryPath(kategori.slug), yazilar[0].publishedAt, 0.7));
  }
  for (const yazar of content.authors) {
    const yazilar = content.posts.filter((p) => p.authorSlug === yazar.slug && !p.noindex);
    if (yazilar.length === 0) continue;
    girisler.push(url(authorPath(yazar.slug), yazilar[0].publishedAt, 0.5));
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${girisler.join("\n")}
</urlset>
`;
}

/** Sitemap index — /sitemap.xml artık iki dosyaya işaret ediyor. */
function sitemapIndex(): string {
  const bugun = new Date().toISOString().slice(0, 10);
  const giris = (loc: string) =>
    `  <sitemap>\n    <loc>${SITE}${loc}</loc>\n    <lastmod>${bugun}</lastmod>\n  </sitemap>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${giris("/sitemap-sayfalar.xml")}
${giris("/sitemap-blog.xml")}
</sitemapindex>
`;
}

/** Son 30 yazı, tam metin değil özet (Faz 1 §5.4). */
function rss(content: BlogContent): string {
  const ogeler = content.posts.slice(0, 30).map((post: BlogPost) => `    <item>
      <title>${esc(post.title)}</title>
      <link>${esc(absolute(SITE, postPath(post.slug)))}</link>
      <guid isPermaLink="true">${esc(absolute(SITE, postPath(post.slug)))}</guid>
      <description>${esc(post.excerpt)}</description>
      <pubDate>${post.publishedAt.toUTCString()}</pubDate>
    </item>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(need.site.name)} Blog</title>
    <link>${SITE}${blogHome()}</link>
    <atom:link href="${SITE}${rssPath()}" rel="self" type="application/rss+xml" />
    <description>${esc(need.site.description)}</description>
    <language>tr</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${ogeler}
  </channel>
</rss>
`;
}

/* -------------------------------------------------------------------------- */

function main() {
  if (!fs.existsSync(DIST)) {
    console.error("[blog] dist/ yok — bu script `vite build`den SONRA çalışmalı.");
    process.exit(1);
  }

  let content: BlogContent;
  try {
    content = loadBlogContent();
  } catch (err) {
    if (err instanceof ContentError) {
      console.error(`[blog] ${err.diagnostics.length} içerik hatası — sayfalar üretilmedi.`);
      process.exit(1);
    }
    throw err;
  }

  for (const post of content.posts) yaz(postPath(post.slug), postPage(post, content));
  blogListeleri(content);
  kategoriSayfalari(content);
  etiketSayfalari(content);
  yazarSayfalari(content);

  /* Blog 404'ü: bilinmeyen /blog/* adresleri için. */
  yaz(`${blogHome()}/404`, notFoundPage(content));

  dosyaYaz("/sitemap-blog.xml", sitemapBlog(content));
  dosyaYaz(rssPath(), rss(content));

  /* Mevcut /sitemap.xml (pazarlama sayfaları) yeni adına taşınıyor ve kök
     sitemap bir index dosyasına dönüşüyor. */
  const eski = path.join(DIST, "sitemap.xml");
  if (fs.existsSync(eski)) {
    fs.copyFileSync(eski, path.join(DIST, "sitemap-sayfalar.xml"));
  }
  dosyaYaz("/sitemap.xml", sitemapIndex());

  const sayfaSayisi =
    content.posts.length + content.categories.length + content.tags.length + content.authors.length;
  console.log(
    `✅ Blog: ${content.posts.length} yazı, ${content.categories.length} kategori, ` +
    `${content.tags.length} etiket, ${content.authors.length} yazar (~${sayfaSayisi} sayfa) + sitemap + RSS`,
  );
}

main();
