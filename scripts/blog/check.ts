import { loadBlogContent, ContentError } from "./content.js";
import type { Diagnostic } from "./frontmatter.js";

/**
 * `npm run blog:check`
 * ============================================================================
 * İçeriği doğrular ve raporlar. Build'in başında da aynı yükleyici çalışıyor;
 * bu komut onu yazı yazarken tek başına çalıştırabilmek için var — bir hatayı
 * görmek için tam bir `vite build` beklemek gerekmesin diye.
 *
 * ÇIKIŞ KODU: hata varsa 1. Böylece CI'da ve pre-commit'te kullanılabilir.
 * Uyarılar çıkış kodunu DEĞİŞTİRMEZ (bkz. Diagnostics: uyarı bir SEO
 * tavsiyesidir, yayını engellemez).
 */

/* Tazelik döngüsü (§3.2): 90 günden eski sarı, 180 günden eski kırmızı. */
const STALE_WARN_DAYS = 90;
const STALE_ALERT_DAYS = 180;

const GUN = 24 * 60 * 60 * 1000;

function group(items: Diagnostic[]): Map<string, Diagnostic[]> {
  const byFile = new Map<string, Diagnostic[]>();
  for (const item of items) {
    const list = byFile.get(item.file) ?? [];
    list.push(item);
    byFile.set(item.file, list);
  }
  return byFile;
}

function print(title: string, items: Diagnostic[], mark: string) {
  if (items.length === 0) return;

  console.log(`\n${title} (${items.length})`);
  for (const [file, list] of group(items)) {
    console.log(`\n  ${file}`);
    for (const item of list) {
      const field = item.field ? ` [${item.field}]` : "";
      console.log(`    ${mark}${field} ${item.message}`);
    }
  }
}

function main() {
  const now = new Date();

  let content;
  try {
    content = loadBlogContent(now);
  } catch (err) {
    if (err instanceof ContentError) {
      print("HATALAR", err.diagnostics, "x");
      console.log(`\n${err.diagnostics.length} hata. Yayına çıkılamaz.\n`);
      process.exit(1);
    }
    throw err;
  }

  console.log(
    `\nYayında ${content.posts.length} yazı · ${content.categories.length} kategori · ` +
    `${content.authors.length} yazar · ${content.tags.length} etiket · ${content.redirects.length} yönlendirme`,
  );

  if (content.unpublished.length > 0) {
    console.log(`\nYayında olmayanlar (${content.unpublished.length})`);
    for (const item of content.unpublished) {
      console.log(`  - ${item.slug} (${item.reason}) — ${item.sourcePath}`);
    }
  }

  /*
   * TAZELİK RAPORU. Panelde bir sütun olacaktı; içerik depoda durduğu için
   * onun karşılığı bu çıktı. Ölçü `lastReviewedAt`: "bu yazıya en son ne
   * zaman bakıldı" sorusunun cevabı, "ne zaman değişti"nin (contentUpdatedAt)
   * değil — bir yazı hiç değişmeden de eskir (sınav tarihleri, kontenjanlar).
   */
  const stale = content.posts
    .map((post) => {
      const reference = post.lastReviewedAt ?? post.contentUpdatedAt ?? post.publishedAt;
      return { post, days: Math.floor((now.getTime() - reference.getTime()) / GUN) };
    })
    .filter((item) => item.days >= STALE_WARN_DAYS)
    .sort((a, b) => b.days - a.days);

  if (stale.length > 0) {
    console.log(`\nTazelik uyarısı (${stale.length})`);
    for (const { post, days } of stale) {
      const mark = days >= STALE_ALERT_DAYS ? "!!" : "!";
      console.log(`  ${mark} ${days} gündür gözden geçirilmedi: ${post.slug}`);
    }
  }

  print("UYARILAR", content.warnings, "!");

  console.log(
    content.warnings.length > 0
      ? `\nHata yok, ${content.warnings.length} uyarı. Yayına çıkılabilir.\n`
      : "\nHata ve uyarı yok.\n",
  );
}

main();
