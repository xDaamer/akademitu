/*
 * HAFTA IZGARASI İÇİN PAYLAŞILAN TARİH YARDIMCILARI
 * ===========================================================================
 * Öğrenci ve öğretmen panelleri aynı "hafta" tanımını (Türkiye saatiyle
 * pazartesi-pazar) kullanıyor; hesap tek yerde yaşıyor ki ikisi sessizce
 * ayrışmasın (bkz. server/weekUtils.ts — sunucudaki eşdeğeri).
 */

export const GUN_ADLARI = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
] as const;

/** "2026-09-08" -> o günden n gün sonrası, yine "YYYY-MM-DD". */
export function gunEkle(tarih: string, n: number): string {
  const d = new Date(`${tarih}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "2026-09-08" -> "8 Eylül". Hafta başlığı ve gün etiketleri için. */
export function gunEtiketi(tarih: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${tarih}T00:00:00Z`));
}
