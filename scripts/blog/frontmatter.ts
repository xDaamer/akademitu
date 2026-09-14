import { load, CORE_SCHEMA } from "js-yaml";

/**
 * FRONTMATTER: DOSYA BAŞINDAKİ YAML BLOĞU
 * ============================================================================
 * Blogun tamamı `content/blog/` altındaki markdown dosyalarından geliyor;
 * veritabanı yok. Bu dosya o dosyaların ÜST BLOĞUNU okuyup doğrular.
 *
 * NEDEN VERİTABANI DEĞİL: içerik depoda durduğu sürece çalışma anında hiçbir
 * yazma yolu yok — editör, yükleme ucu, önizleme jetonu, `id` üzerinden
 * yetkilendirme yok. Dolayısıyla stored XSS, IDOR, open redirect gibi
 * sınıfların hiçbirinin karşılığı da yok. Doğrulama bu yüzden BUILD ZAMANINDA
 * ve HATA VEREREK yapılıyor: kırık bir yazı yayına çıkmaz, `npm run build`
 * durur.
 *
 * YAML ŞEMASI `CORE_SCHEMA` (YAML 1.2) — bilinçli:
 *   - YAML 1.1'in "yes/no -> boolean" davranışı yok (bir başlıkta geçen
 *     "no" kelimesi sessizce false olmaz),
 *   - tarih etiketi yok, yani `2026-09-14` Date değil string kalır ve
 *     zaman dilimini biz kontrol ederiz (bkz. parseDate),
 *   - özel tag (`!!js/function` gibi) çözülmez.
 */

/** Tek bir doğrulama bulgusu. */
export interface Diagnostic {
  /** Depo köküne göre dosya yolu — mesajda tıklanabilir olsun diye. */
  file: string;
  field?: string;
  message: string;
}

/**
 * Hata ve uyarıları toplayan kap.
 *
 * HATA ile UYARI ayrımı: hata build'i durdurur (kırık link, eksik alan,
 * var olmayan kategori — yayına çıkarsa zarar verir). Uyarı SEO tavsiyesidir
 * (odak kelime H2'de geçmiyor, kategori açıklaması kısa) ve yayını
 * engellemez; §3.2'deki "canlı SEO kontrol listesi bilgilendirme amaçlıdır,
 * yayını engellemez" kuralının bu mimarideki karşılığı.
 */
export class Diagnostics {
  readonly errors: Diagnostic[] = [];
  readonly warnings: Diagnostic[] = [];

  constructor(private readonly file: string) {}

  error(message: string, field?: string) {
    this.errors.push({ file: this.file, field, message });
  }

  warn(message: string, field?: string) {
    this.warnings.push({ file: this.file, field, message });
  }

  get ok() {
    return this.errors.length === 0;
  }
}

export interface ParsedFile {
  /** Frontmatter bloğundan çözülen ham nesne. */
  data: Record<string, unknown>;
  /** `---` bloğundan sonraki markdown gövdesi. */
  body: string;
}

/*
 * Frontmatter sınırlayıcısı. Dosyanın İLK satırı `---` olmalı; ortada bir
 * yerde başlayan bloğu kabul etmiyoruz, çünkü o durumda gövdenin bir kısmı
 * sessizce meta veri sanılırdı.
 */
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(raw: string, diag: Diagnostics): ParsedFile | null {
  /* BOM (byte order mark) bazı editörlerin bıraktığı görünmez karakter;
     temizlenmezse ilk satır `---` ile eşleşmez ve hata mesajı "frontmatter
     yok" der ki bu, gerçek sebebi gizler. */
  const text = raw.replace(/^\uFEFF/, "");
  const match = FRONTMATTER.exec(text);

  if (!match) {
    diag.error("Dosya `---` ile başlayan bir frontmatter bloğu içermiyor.");
    return null;
  }

  let data: unknown;
  try {
    data = load(match[1], { schema: CORE_SCHEMA });
  } catch (err: any) {
    diag.error(`Frontmatter YAML olarak okunamadı: ${err?.message || err}`);
    return null;
  }

  if (data === null || data === undefined) data = {};

  if (typeof data !== "object" || Array.isArray(data)) {
    diag.error("Frontmatter bir anahtar/değer bloğu olmalı.");
    return null;
  }

  return { data: data as Record<string, unknown>, body: text.slice(match[0].length) };
}

/* --------------------------------------------------------------------------
 * ALAN OKUYUCULAR
 * Hepsi aynı deseni izliyor: değeri doğrula, sorunluysa diag'a yaz, güvenli
 * bir değer döndür. Fırlatmıyorlar — tek bir dosyadaki tüm sorunlar tek
 * seferde raporlansın diye (ilk hatada durmak, altı tur build gerektirirdi).
 * ------------------------------------------------------------------------ */

interface TextOptions {
  required?: boolean;
  max?: number;
  min?: number;
}

export function readText(
  data: Record<string, unknown>,
  key: string,
  diag: Diagnostics,
  { required = false, max, min }: TextOptions = {},
): string {
  const value = data[key];

  if (value === undefined || value === null || value === "") {
    if (required) diag.error(`\`${key}\` zorunlu.`, key);
    return "";
  }

  if (typeof value !== "string") {
    diag.error(`\`${key}\` metin olmalı (bulunan: ${typeof value}).`, key);
    return "";
  }

  const text = value.trim();

  if (max !== undefined && text.length > max) {
    diag.error(`\`${key}\` en fazla ${max} karakter olmalı (şu an ${text.length}).`, key);
  }
  if (min !== undefined && text.length > 0 && text.length < min) {
    diag.warn(`\`${key}\` ${min} karakterden kısa (şu an ${text.length}).`, key);
  }

  return text;
}

export function readBoolean(
  data: Record<string, unknown>,
  key: string,
  diag: Diagnostics,
  fallback = false,
): boolean {
  const value = data[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "boolean") {
    diag.error(`\`${key}\` true veya false olmalı.`, key);
    return fallback;
  }
  return value;
}

export function readList(
  data: Record<string, unknown>,
  key: string,
  diag: Diagnostics,
  { max }: { max?: number } = {},
): string[] {
  const value = data[key];
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    diag.error(`\`${key}\` liste olmalı (\`[a, b]\` ya da alt alta \`- a\`).`, key);
    return [];
  }

  const items = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  if (items.some((item) => !item)) {
    diag.error(`\`${key}\` yalnızca metin içerebilir, boş öğe olamaz.`, key);
  }

  const clean = items.filter(Boolean);

  /* Aynı etiketi iki kez yazmak zararsız görünür ama etiket sayfasında ve
     şemada tekrar üretir; sessizce tekilleştirmek yerine söylüyoruz. */
  const unique = [...new Set(clean)];
  if (unique.length !== clean.length) {
    diag.warn(`\`${key}\` içinde tekrar eden değer var; tekrarlar atıldı.`, key);
  }

  if (max !== undefined && unique.length > max) {
    diag.error(`\`${key}\` en fazla ${max} öğe içerebilir (şu an ${unique.length}).`, key);
  }

  return unique;
}

/**
 * TARİHLER +03:00 OLARAK YORUMLANIR — UTC olarak değil.
 *
 * `2026-09-14` yazan biri Türkiye'de o günü kastediyor. Bunu UTC saymak,
 * yazının yayın tarihini bir gün öncesine kaydırabilir ve sitemap'teki
 * `lastmod` ile sayfadaki tarih birbirini tutmaz. Proje zaten aynı kararı
 * ders haftası hesabında vermişti (bkz. server/routes/teacher.ts): Türkiye
 * 2016'dan beri kalıcı UTC+3, dolayısıyla sabit ofset doğru.
 *
 * Saat verilmezse 09:00 kabul ediliyor: gün ortası bir saat, hangi zaman
 * diliminden bakılırsa bakılsın aynı takvim gününde kalır.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function readDate(
  data: Record<string, unknown>,
  key: string,
  diag: Diagnostics,
  { required = false }: { required?: boolean } = {},
): Date | null {
  const value = data[key];

  if (value === undefined || value === null || value === "") {
    if (required) diag.error(`\`${key}\` zorunlu (örn. 2026-09-14).`, key);
    return null;
  }

  if (typeof value !== "string") {
    diag.error(`\`${key}\` tarih metni olmalı (örn. 2026-09-14).`, key);
    return null;
  }

  const text = value.trim();
  const iso = DATE_ONLY.test(text) ? `${text}T09:00:00+03:00` : text;
  const parsed = new Date(iso);

  if (Number.isNaN(parsed.getTime())) {
    diag.error(`\`${key}\` geçerli bir tarih değil: "${text}".`, key);
    return null;
  }

  return parsed;
}

export interface FaqItem {
  q: string;
  a: string;
}

/**
 * SSS listesi. §6: FAQPage şeması YALNIZCA sayfada görünür bir SSS bölümü
 * varsa yayınlanır ve metinleri birebir aynı olmalıdır. Bu yüzden SSS tek
 * kaynaktan (buradan) geliyor; şema da, accordion da aynı diziyi kullanıyor.
 *
 * Tek soruluk SSS kabul edilmiyor: Google'ın FAQPage kuralı en az iki
 * soru bekler ve tek soruluk bir bölüm zaten accordion olmayı hak etmez.
 */
export function readFaq(
  data: Record<string, unknown>,
  diag: Diagnostics,
): FaqItem[] {
  const value = data.faq;
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    diag.error("`faq` liste olmalı: her öğe `q:` ve `a:` içerir.", "faq");
    return [];
  }

  const items: FaqItem[] = [];

  value.forEach((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      diag.error(`\`faq[${index}]\` \`q\` ve \`a\` alanları olan bir blok olmalı.`, "faq");
      return;
    }

    const record = entry as Record<string, unknown>;
    const q = typeof record.q === "string" ? record.q.trim() : "";
    const a = typeof record.a === "string" ? record.a.trim() : "";

    if (!q || !a) {
      diag.error(`\`faq[${index}]\` hem \`q\` hem \`a\` içermeli.`, "faq");
      return;
    }

    items.push({ q, a });
  });

  if (items.length === 1) {
    diag.error("`faq` ya boş bırakılmalı ya da en az 2 soru içermeli.", "faq");
  }

  return items;
}

/**
 * Frontmatter'da tanınmayan anahtar = büyük ihtimalle yazım hatası.
 * `publishedat` yazan biri tarihinin okunmadığını fark etmez; yazı da
 * sessizce taslak kalır. Bu yüzden bilinmeyen anahtar HATA.
 */
export function rejectUnknownKeys(
  data: Record<string, unknown>,
  known: readonly string[],
  diag: Diagnostics,
) {
  const allowed = new Set(known);
  for (const key of Object.keys(data)) {
    if (!allowed.has(key)) {
      diag.error(`Bilinmeyen alan: \`${key}\`. Yazım hatası olabilir.`, key);
    }
  }
}
