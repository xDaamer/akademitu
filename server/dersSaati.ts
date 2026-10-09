/*
 * DERS SAATİ VE MÜSAİTLİK HESABI — /api/admin'in yardımcısı
 * ===========================================================================
 * Ders atama artık serbest bir tarih-saat girdisi değil: ders öğretmenin
 * haftalık müsaitliği içinde, saat başı ya da buçukta başlıyor ve süresi
 * deneme dersi olup olmamasından TÜRETİLİYOR. Bu dosya o kuralların sunucu
 * tarafı; istemcideki eşleniği src/lib/dersSaati.ts. İstemci yalnızca
 * hangi hücrenin tıklanabilir olduğunu göstermek için hesaplıyor — karar
 * burada veriliyor.
 *
 * Saatler Türkiye saatiyle konuşuluyor. weekUtils.ts'teki gerekçeyle sabit
 * +03:00: Türkiye 2016'dan beri kalıcı UTC+3'te.
 */

export const DENEME_DK = 25;
export const NORMAL_DK = 50;
/** Derslerin başlayabildiği ve müsaitlik sınırlarının oturduğu adım. */
export const ADIM_DK = 30;
const GUN_DK = 24 * 60;
/** weekUtils.TR_OFFSET ("+03:00") ile aynı ofset, milisaniye cinsinden. */
const TR_OFSET_MS = 3 * 60 * 60 * 1000;
const DAKIKA_MS = 60 * 1000;

/** Bir günün tek müsaitlik aralığı. Bitiş DIŞLAYICI. */
export interface Aralik {
  /** ISO: 1 = Pazartesi ... 7 = Pazar. */
  weekday: number;
  /** Gece yarısından itibaren dakika, Türkiye saatiyle. */
  startMinute: number;
  endMinute: number;
}

export function dersSuresi(isTrial: boolean): number {
  return isTrial ? DENEME_DK : NORMAL_DK;
}

/** timestamptz -> Türkiye'deki ISO gün numarası ve günün dakikası. */
export function trGunDakika(iso: string): { weekday: number; minute: number } {
  const d = new Date(new Date(iso).getTime() + TR_OFSET_MS);
  const gun = d.getUTCDay(); // 0 = Pazar
  return { weekday: gun === 0 ? 7 : gun, minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** Saat başı ya da buçuk mu — saniyesi/milisaniyesi de sıfır olmalı. */
export function adimaOturuyor(iso: string): boolean {
  const d = new Date(iso);
  return d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0 && trGunDakika(iso).minute % ADIM_DK === 0;
}

export function bitisHesapla(baslangicIso: string, sureDk: number): string {
  return new Date(new Date(baslangicIso).getTime() + sureDk * DAKIKA_MS).toISOString();
}

/** Dersin tamamı (başlangıç + süre) aynı gün içinde tek bir aralığa sığıyor mu. */
export function musaitlikIcinde(araliklar: Aralik[], baslangicIso: string, sureDk: number): boolean {
  const { weekday, minute } = trGunDakika(baslangicIso);
  return araliklar.some(
    (a) => a.weekday === weekday && a.startMinute <= minute && minute + sureDk <= a.endMinute,
  );
}

/** [aBas, aBit) ile [bBas, bBit) kesişiyor mu. Uç uca değmek çakışma değil. */
export function cakisiyor(aBas: string, aBit: string, bBas: string, bBit: string): boolean {
  return new Date(aBas).getTime() < new Date(bBit).getTime() &&
    new Date(bBas).getTime() < new Date(aBit).getTime();
}

/*
 * Eski dersler elle girildi ve bir kısmının ends_at'i yok. Çakışma
 * hesabında onlar normal ders süresinde sayılıyor — yoksa sıfır uzunlukta
 * bir ders hiçbir şeyle çakışmaz ve üstüne ders yazılabilirdi.
 */
export function dersBitisi(startsAt: string, endsAt: string | null): string {
  return endsAt ?? bitisHesapla(startsAt, NORMAL_DK);
}

/**
 * İstemcinin gönderdiği aralık listesini doğrular, sıralar ve aynı gün
 * içinde çakışan/bitişik aralıkları BİRLEŞTİRİR (09:00-12:00 + 11:00-14:00
 * -> 09:00-14:00). Tabloda exclusion kısıtı yok; tekilliği burası sağlıyor.
 */
export function musaitlikNormalize(value: unknown): { hata: string } | { araliklar: Aralik[] } {
  if (!Array.isArray(value)) return { hata: "Müsait saatler gönderilmedi." };
  if (value.length > 100) return { hata: "Çok fazla saat aralığı gönderildi." };

  const ham: Aralik[] = [];
  for (const a of value) {
    const weekday = a?.weekday;
    const bas = a?.startMinute;
    const bit = a?.endMinute;
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) {
      return { hata: "Müsaitlikte geçersiz bir gün var." };
    }
    if (
      !Number.isInteger(bas) || !Number.isInteger(bit) ||
      bas < 0 || bit > GUN_DK || bit <= bas ||
      bas % ADIM_DK !== 0 || bit % ADIM_DK !== 0
    ) {
      return { hata: "Saat aralıkları yarım saatin katı olmalı ve bitiş başlangıçtan sonra gelmeli." };
    }
    ham.push({ weekday, startMinute: bas, endMinute: bit });
  }

  ham.sort((x, y) => x.weekday - y.weekday || x.startMinute - y.startMinute);

  const birlesik: Aralik[] = [];
  for (const a of ham) {
    const son = birlesik[birlesik.length - 1];
    if (son && son.weekday === a.weekday && a.startMinute <= son.endMinute) {
      son.endMinute = Math.max(son.endMinute, a.endMinute);
    } else {
      birlesik.push({ ...a });
    }
  }
  return { araliklar: birlesik };
}
