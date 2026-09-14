/**
 * BLOG ADRESLERİ — TEK KAYNAK
 * ============================================================================
 * §1'deki URL tablosunun kodda karşılığı. Hiçbir yerde elle "/blog/..." dizisi
 * kurulmuyor: sitemap, RSS, iç link doğrulaması, şablonlar ve JSON-LD hepsi
 * buradan okuyor. Bir adres değişirse değişecek tek yer burası.
 *
 * KATEGORİ SEGMENTİ YAZI ADRESİNDE YOK (§1'deki kritik karar): yazı ileride
 * kategori değiştirirse adresi kırılmasın diye. Yazı her zaman /blog/<slug>.
 */

export const BLOG_BASE = "/blog";

/** §4.1: sayfa başına 12 yazı. */
export const POSTS_PER_PAGE = 12;

export const blogHome = () => BLOG_BASE;

/** 1. sayfa kendi kanonik adresi olan /blog'dur; /blog/sayfa/1 üretilmez. */
export const blogPage = (page: number) =>
  page <= 1 ? BLOG_BASE : `${BLOG_BASE}/sayfa/${page}`;

export const postPath = (slug: string) => `${BLOG_BASE}/${slug}`;

export const categoryPath = (slug: string) => `${BLOG_BASE}/kategori/${slug}`;

export const categoryPage = (slug: string, page: number) =>
  page <= 1 ? categoryPath(slug) : `${categoryPath(slug)}/sayfa/${page}`;

export const tagPath = (slug: string) => `${BLOG_BASE}/etiket/${slug}`;

export const authorPath = (slug: string) => `${BLOG_BASE}/yazar/${slug}`;

export const searchPath = () => `${BLOG_BASE}/ara`;

export const rssPath = () => `${BLOG_BASE}/rss.xml`;

export const blogSitemapPath = () => "/sitemap-blog.xml";

/** Görsellerin yayınlanmış adresi (kaynakları content/blog/gorseller/). */
export const imagePath = (file: string) => `${BLOG_BASE}/gorseller/${file}`;

/** Mutlak adres — canonical, og:url ve JSON-LD mutlak URL istiyor (§5.1). */
export function absolute(origin: string, path: string): string {
  return `${origin.replace(/\/+$/, "")}${path}`;
}
