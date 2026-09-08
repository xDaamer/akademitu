/**
 * HOCA FOTOĞRAFLARINI DUYARLI WEBP VARYANTLARINA ÇEVİRİR
 * ============================================================================
 * Neden: Lighthouse ölçümünde 7 hoca fotoğrafı 639 KB aktarıyordu ve sayfanın
 * 936 KB'lık toplam ağırlığının %73'ü buradan geliyordu. Üç ayrı eksik vardı:
 *
 *   1) Format — hepsi JPEG'di, WebP tek başına ~%30 kazandırıyor.
 *   2) Boyut  — kaynak dosyalar 800px genişlikte, mobilde çizildikleri alan
 *               bunun çok altında; 352px'lik ekrana 800px görsel gidiyordu.
 *   3) Yükleme— hiçbirinde srcset yoktu, tarayıcı seçim yapamıyordu.
 *
 * Bu script `public/teachers/*.jpg` dosyalarını okur ve yanlarına
 * `<ad>-400.webp` / `<ad>-800.webp` yazar. Orijinal JPEG'ler <picture>
 * içinde yedek olarak kalır (WebP desteklemeyen çok eski tarayıcılar için).
 *
 * `prebuild` adımında çalışır. `sharp` zaten bağımlılıklarda kuruluydu ve
 * hiçbir yerde kullanılmıyordu — yeni paket eklenmedi.
 *
 * Not: üretilen .webp dosyaları build çıktısıdır, kaynak değil. Yeni bir hoca
 * fotoğrafı eklerken sadece .jpg koymanız yeterli; varyantlar otomatik üretilir.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const teachersDir = path.join(rootDir, "public", "teachers");

/** Üretilecek genişlikler. 400 = mobil, 800 = masaüstü/retina mobil. */
const WIDTHS = [400, 800];

async function main() {
  if (!fs.existsSync(teachersDir)) {
    console.log("ℹ️  public/teachers/ yok, görsel dönüştürme atlandı.");
    return;
  }

  const sources = fs
    .readdirSync(teachersDir)
    .filter((file) => /\.(jpe?g|png)$/i.test(file));

  if (sources.length === 0) {
    console.log("ℹ️  Dönüştürülecek hoca fotoğrafı bulunamadı.");
    return;
  }

  let written = 0;
  let savedBytes = 0;

  for (const file of sources) {
    const sourcePath = path.join(teachersDir, file);
    const baseName = file.replace(/\.[^.]+$/, "");
    const sourceSize = fs.statSync(sourcePath).size;

    for (const width of WIDTHS) {
      const outPath = path.join(teachersDir, `${baseName}-${width}.webp`);

      // Kaynak dosyadan daha yeniyse tekrar üretme (build'i yavaşlatmasın).
      if (
        fs.existsSync(outPath) &&
        fs.statSync(outPath).mtimeMs >= fs.statSync(sourcePath).mtimeMs
      ) {
        continue;
      }

      const info = await sharp(sourcePath)
        // withoutEnlargement: kaynak 400px'den darsa büyütüp bulanıklaştırma.
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toFile(outPath);

      written += 1;
      if (width === 800) savedBytes += sourceSize - info.size;
    }
  }

  console.log(
    `✅ Görseller: ${sources.length} kaynaktan ${written} WebP varyantı üretildi` +
      (savedBytes > 0
        ? ` (800px sürümlerde ~${Math.round(savedBytes / 1024)} KB tasarruf)`
        : " (hepsi güncel)")
  );
}

main().catch((error) => {
  // Görsel dönüştürme build'i düşürmemeli: varyant yoksa <picture> zaten
  // orijinal JPEG'e düşer, site çalışmaya devam eder.
  console.warn("⚠️  Görsel dönüştürme başarısız, orijinaller kullanılacak:", error);
});
