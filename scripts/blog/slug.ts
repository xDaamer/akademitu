/**
 * TÜRKÇE SLUG ÜRETİMİ
 * ============================================================================
 * Blog adresleri bu dosyadan çıkıyor. Tek yerde durmasının sebebi, slug'ın
 * üç ayrı yerde tutarlı olması gerekmesi: dosya adı, sitemap ve iç linkler.
 *
 * KÜÇÜK HARFE ÇEVİRME SIRASI ÖNEMLİ — ve sezgiye aykırı.
 * ---------------------------------------------------------------------------
 * JavaScript'in toLowerCase()'i Unicode kurallarını uygular: "İ".toLowerCase()
 * "i" değil, "i" + U+0307 (birleşen nokta) üretir. Bu iki karakterlik dizi
 * sonraki [a-z] filtresinden "i" olarak değil, "i" + görünmez bir işaret
 * olarak geçer ve slug'a sessizce bozuk bir karakter sızar.
 *
 * Bu yüzden Türkçe harfler toLowerCase()'TEN ÖNCE elle eşleniyor. Sonrasında
 * NFD + birleşen işaret temizliği, geri kalan aksanlı harfleri (â, é, ñ)
 * yakalayan ikinci ağ.
 *
 * "I" HARFİ BİLEREK "i"YE EŞLENİYOR, "ı"ya değil. Dil kuralına göre büyük I'nın
 * küçüğü "ı"dır; ama slug bir kelime değil bir adres ve kullanıcı "ISPARTA"yı
 * aradığında "isparta" yazar. Türkçe karakterlerin tamamı zaten ASCII'ye
 * indirgendiği için burada dil doğruluğu değil, tahmin edilebilirlik aranıyor.
 */

/* Eşleme tablosu: büyük harfler önce, çünkü toLowerCase() henüz çalışmadı. */
const TURKISH_MAP: Record<string, string> = {
  İ: "i", I: "i", Ş: "s", Ğ: "g", Ü: "u", Ö: "o", Ç: "c",
  ı: "i", ş: "s", ğ: "g", ü: "u", ö: "o", ç: "c",
};

/**
 * Slug'dan atılan kelimeler. Liste BİLEREK KISA: agresif bir stop-word
 * temizliği "ders çalışma teknikleri"ni "ders-calisma-teknikleri" yerine
 * anlamsız bir kırıntıya çevirebilir. Buradakiler tek başına hiçbir arama
 * niyetini taşımayan bağlaçlar.
 */
const STOP_WORDS = new Set([
  "ve", "ile", "icin", "bir", "bu", "su", "o", "da", "de", "ki",
  "mi", "mı", "mu", "mü", "ya", "veya", "ama", "fakat", "ise",
]);

/** Slug'da kaç kelime tutulacağı (§1: 3-6 kelime). */
const MAX_WORDS = 6;

/** Yıl kalıbı: 2026, 1999. Slug'a GİRMEZ — bkz. slugify()'ın dokümanı. */
const YEAR_PATTERN = /^(19|20)\d{2}$/;

/** Yayınlanmış bir adreste kabul edilen biçim. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Türkçe harfleri ASCII'ye indirir ve küçük harfe çevirir. */
export function asciiFold(value: string): string {
  return value
    .replace(/[İIŞĞÜÖÇışğüöç]/g, (ch) => TURKISH_MAP[ch] ?? ch)
    .toLowerCase()
    /* NFD: "â" -> "a" + birleşen şapka; ikinci replace işareti atar. */
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Başlıktan slug üretir.
 *
 * YIL SLUG'A KONMAZ. Bir yazı her yıl güncellenir ("2026 YKS konuları" ->
 * "2027 YKS konuları") ama adresi sabit kalmalı; yıl slug'a girerse her
 * güncelleme ya yanlış bir adres ya da bir 301 zinciri bırakır. Yıl yalnızca
 * başlıkta ve içerikte geçer.
 */
export function slugify(value: string): string {
  const words = asciiFold(value)
    /* Kesme işareti kelimeyi bölmemeli: "YKS'nin" -> "yksnin". */
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !YEAR_PATTERN.test(word));

  /* Stop-word'ler atılıyor; ama hepsi atılırsa ham kelimelere dönülüyor —
     "Bu ve Şu" gibi bir başlıkta boş slug üretmek en kötü sonuç olurdu. */
  const meaningful = words.filter((word) => !STOP_WORDS.has(word));
  const chosen = meaningful.length > 0 ? meaningful : words;

  return chosen.slice(0, MAX_WORDS).join("-");
}

/**
 * Başlık içi bağlantı (anchor) kimliği. slugify()'dan AYRI bir işlev:
 * burada kelime sayısı sınırlanmaz ve stop-word atılmaz, çünkü iki farklı
 * H2 ("Ders çalışma planı" / "Ders çalışma planı örneği") aynı id'ye
 * düşerse içindekiler tablosundaki linkler yanlış yere gider.
 */
export function headingId(value: string): string {
  const base = asciiFold(value)
    .replace(/['’ʼ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base || "bolum";
}

/**
 * Aynı id iki kez üretilirse sonuna sayı ekler. Çağıran taraf `seen`
 * kümesini yazı boyunca taşır.
 */
export function uniqueHeadingId(value: string, seen: Set<string>): string {
  const base = headingId(value);
  if (!seen.has(base)) {
    seen.add(base);
    return base;
  }

  let suffix = 2;
  while (seen.has(`${base}-${suffix}`)) suffix += 1;

  const unique = `${base}-${suffix}`;
  seen.add(unique);
  return unique;
}
