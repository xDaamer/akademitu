/*
 * HAFTA HESABI — /api/teacher ve /api/portal'ın ORTAK YARDIMCISI
 * ===========================================================================
 * İkisi de aynı soruyu soruyor: "hangi ders bu haftada". Cevap Türkiye
 * saatiyle pazartesi-pazar; hesap burada tek yerde yaşıyor ki iki panel
 * sessizce farklı haftalar göstermesin (bkz. server/routes/teacher.ts'in
 * eski, dosyaya özel sürümü — buraya taşındı).
 *
 * Dersler `timestamptz` olarak duruyor, yani mutlak bir an. "Hangi hafta"
 * sorusu ise YEREL bir soru: pazartesi Türkiye'de pazartesi.
 *
 * Sınırlar bu yüzden UTC'de DEĞİL, +03:00 ofsetiyle kuruluyor. UTC'de
 * hesaplasaydık pazartesi 01:00'deki bir ders UTC'de pazar 22:00 olur ve
 * bir önceki haftada görünürdü.
 *
 * SABİT +03:00 KULLANILIYOR, Intl/zaman dilimi veritabanı değil: Türkiye
 * 2016'dan beri kalıcı UTC+3'te ve yaz saati uygulamıyor. Ofset değişirse
 * burası da değişmeli — bu yüzden tek bir sabitte duruyor, koda dağılmıyor.
 */
export const TR_OFFSET = "+03:00";

/** Verilen günün içinde bulunduğu haftanın PAZARTESİsi (Türkiye saatiyle). */
export function haftaninPazartesisi(gun: Date): string {
  /* getUTCDay() üzerinden gidiliyor çünkü `gun` zaten +03:00'lık bir günün
     UTC gece yarısı olarak kuruluyor; sunucunun yerel saat dilimi ne olursa
     olsun sonuç değişmesin diye. */
  const gunIndeksi = gun.getUTCDay(); // 0 = Pazar
  const pazartesiyeKalan = gunIndeksi === 0 ? -6 : 1 - gunIndeksi;

  const pazartesi = new Date(gun);
  pazartesi.setUTCDate(pazartesi.getUTCDate() + pazartesiyeKalan);
  return pazartesi.toISOString().slice(0, 10);
}

/**
 * `week` parametresini haftanın pazartesisine çevirir.
 * Geçersiz/eksikse İÇİNDE BULUNULAN hafta — istemciye hata döndürmek yerine
 * anlamlı bir varsayılana düşmek doğru, çünkü bu bir gezinme parametresi.
 */
export function haftaBasi(week: unknown): string {
  if (typeof week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const ayrıstirilan = new Date(`${week}T00:00:00Z`);
    if (!Number.isNaN(ayrıstirilan.getTime())) {
      return haftaninPazartesisi(ayrıstirilan);
    }
  }

  /* Bugünün Türkiye'deki tarihi: UTC'ye 3 saat ekleyip tarih kısmını al. */
  const simdi = new Date();
  const trBugun = new Date(simdi.getTime() + 3 * 60 * 60 * 1000);
  return haftaninPazartesisi(new Date(`${trBugun.toISOString().slice(0, 10)}T00:00:00Z`));
}

/** Pazartesiden bir sonraki pazartesiye — üst sınır DIŞLAYICI. */
export function haftaSonrasi(pazartesi: string): string {
  const d = new Date(`${pazartesi}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}
