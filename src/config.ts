import need from '../need.json';

// =========================================================================
// SİTE AYARLARI
// =========================================================================

/**
 * KANONİK SİTE ADRESİ
 * -------------------------------------------------------------------------
 * Tek kaynak `need.json`'dır. Kod içinde "https://www.akademitu.com" yazmayın —
 * eskiden canonical/sitemap www'suz, JSON-LD www'lu yazılmıştı ve kodda iki
 * farklı "doğru" adres dolaşıyordu. Sondaki `/` yoktur; kullanan taraf ekler.
 */
export const SITE_URL: string = need.site.domain;

/**
 * HOCALAR GÖRSEL AKIŞ HIZI (Saniyede Kaç Piksel)
 * -------------------------------------------------------------------------
 * Hız saniye cinsinden bir "tur süresi" değil, saniyede kat edilen piksel
 * olarak tanımlıdır. Sebebi: sol ve sağ sütunlarda farklı sayıda görsel
 * olabilir. Sabit tur süresi verilirse çok görselli sütun daha hızlı akar
 * (eski davranış buydu). Ortak px/sn ile iki sütun her zaman aynı hızda akar.
 *
 * Büyütürseniz akış hızlanır, küçültürseniz yavaşlar.
 * Bu yalnızca varsayılandır; `public/teachers/config.json` içindeki
 * `pixelsPerSecond` alanı yayına almadan hız değiştirmenizi sağlar.
 */
export const TEACHER_TICKER_PIXELS_PER_SECOND = 70;

/*
 * KALDIRILANLAR — bilerek silindi, geri eklemeyin:
 *
 * - `DEFAULT_TEACHERS`: uydurma isimler, Unsplash stok fotoğrafları ve
 *   "YKS Sayısal 42.si", "LGS Türkiye 1.si" gibi doğrulanamaz derece
 *   iddiaları içeriyordu. Hiçbir bileşen kullanmıyordu, ama "fotoğraf
 *   bulunamazsa devreye gir" mantığıyla yazılmıştı: public/teachers/
 *   bir gün boşalsa site bu iddiaları yayınlardı. Eğitim sektöründe bu,
 *   güven kaybının ötesinde reklam mevzuatı sorunudur.
 * - `getTeacherList()` / `src/utils/teacherLoader.ts`: yalnızca yukarıdaki
 *   listeye düşmek için vardı, hiçbir yerden çağrılmıyordu.
 * - `CAMPAIGN_DEADLINE`: hiçbir yerde okunmuyordu ve tarihi geçmek üzereydi.
 * - `BRAND_COLORS`: hiçbir yerde okunmuyordu; renkler Tailwind sınıflarında
 *   ve `src/index.css` içindeki CSS değişkenlerinde yaşıyor.
 */
