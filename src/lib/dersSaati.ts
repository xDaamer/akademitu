/*
 * DERS SAATİ YARDIMCILARI — istemci
 * ===========================================================================
 * server/dersSaati.ts'in istemci eşleniği: ders atama ızgarasında hangi
 * hücrenin tıklanabilir olduğunu göstermek için. Karar sunucuda veriliyor;
 * buradaki hesap sunucununkinden ayrışırsa en kötü ihtimalle tıklanabilen
 * bir hücre kaydedilirken reddedilir. Sabitler (25/50/30) iki tarafta da
 * aynı olmalı.
 *
 * Saatler Türkiye saatiyle ve sabit +03:00 ile hesaplanıyor — sunucunun hafta
 * sınırlarıyla (server/weekUtils.ts) aynı varsayım.
 */

export const DENEME_DK = 25;
export const NORMAL_DK = 50;
export const ADIM_DK = 30;
export const GUN_DK = 24 * 60;
const TR_OFSET_MS = 3 * 60 * 60 * 1000;

/** Bir günün tek müsaitlik aralığı. weekday ISO (1 = Pazartesi), bitiş dışlayıcı. */
export interface Aralik {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export function dersSuresi(isTrial: boolean): number {
  return isTrial ? DENEME_DK : NORMAL_DK;
}

/** 570 -> "09:30", 1440 -> "24:00". */
export function dakikaMetni(dk: number): string {
  return `${String(Math.floor(dk / 60)).padStart(2, '0')}:${String(dk % 60).padStart(2, '0')}`;
}

/** timestamptz -> Türkiye'deki gün ("YYYY-MM-DD"), ISO gün numarası ve günün dakikası. */
export function trGunDakika(iso: string): { tarih: string; weekday: number; minute: number } {
  const d = new Date(new Date(iso).getTime() + TR_OFSET_MS);
  const gun = d.getUTCDay();
  return {
    tarih: d.toISOString().slice(0, 10),
    weekday: gun === 0 ? 7 : gun,
    minute: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

/** ("2026-10-14", 750) -> 12:30 Türkiye saatinin ISO karşılığı. */
export function trAnIso(tarih: string, dakika: number): string {
  return new Date(`${tarih}T${dakikaMetni(dakika)}:00+03:00`).toISOString();
}

/**
 * Aralıkları sıralar ve aynı gün içinde çakışan/bitişik olanları birleştirir.
 * Sunucu da aynısını yapıyor; burada yapılması düzenleyicinin, kaydedilecek
 * hâli göstermesi için.
 */
export function araliklariBirlestir(araliklar: Aralik[]): Aralik[] {
  const sirali = [...araliklar].sort(
    (x, y) => x.weekday - y.weekday || x.startMinute - y.startMinute
  );
  const sonuc: Aralik[] = [];
  for (const a of sirali) {
    const son = sonuc[sonuc.length - 1];
    if (son && son.weekday === a.weekday && a.startMinute <= son.endMinute) {
      son.endMinute = Math.max(son.endMinute, a.endMinute);
    } else {
      sonuc.push({ ...a });
    }
  }
  return sonuc;
}
