/**
 * TÜRK CEP TELEFONU YARDIMCILARI
 * ============================================================================
 * Bu fonksiyonlar PopUpForm.tsx'in içinde yaşıyordu. Portal giriş ekranı da
 * telefon numarası aldığı için ikinci bir kullanıcı oldular; doğrulamanın iki
 * ayrı kopyası olmasın diye buraya taşındılar. Davranış birebir aynı —
 * PopUpForm tarafında değişen tek şey import satırı.
 *
 * SAKLANAN BİÇİM HER YERDE AYNI: `05321234567` (11 hane, başında 0).
 * Görüntü biçimi çağırana göre değişir:
 *   - lead formu:  formatPhoneDisplay()   -> "0 (532) 123 45 67"
 *   - portal:      formatNationalMobile() -> "532 123 45 67"  (yanında +90 çipi)
 * Veritabanındaki RLS kuralı (`^0?5[0-9]{9}$`) ikisinin de ürettiği kanonik
 * değeri kabul eder.
 */

/** Rakam dışındaki her şeyi atar. */
export const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '');

/** Kanonik saklama biçimi: baştaki sıfırlar tekleştirilir, 11 haneye kırpılır. */
export const normalizeTurkishMobile = (value: string) => {
  const digits = normalizePhoneNumber(value).replace(/^0+/, '');
  return `0${digits}`.slice(0, 11);
};

export const isValidTurkishMobilePhone = (value: string) => {
  const digits = normalizePhoneNumber(value);
  return /^05\d{9}$/.test(digits);
};

// Significant digits only: the 10 digits after the leading 0 (e.g. "532xxxxxxx").
// Used to drive the live "0 (5XX) XXX XX XX" mask below.
export const extractSignificantPhoneDigits = (value: string) =>
  normalizePhoneNumber(value).replace(/^0+/, '').slice(0, 10);

/** Lead formunun maskesi: "0 (532) 123 45 67". */
export const formatPhoneDisplay = (digits: string) => {
  if (!digits) return '';
  const area = digits.slice(0, 3);
  const mid1 = digits.slice(3, 6);
  const mid2 = digits.slice(6, 8);
  const mid3 = digits.slice(8, 10);
  let out = `0 (${area}`;
  if (area.length === 3) out += ')';
  if (mid1) out += ` ${mid1}`;
  if (mid2) out += ` ${mid2}`;
  if (mid3) out += ` ${mid3}`;
  return out;
};

/**
 * Portalın maskesi: "532 123 45 67".
 * Baştaki 0 yok — alanın solunda sabit bir "+90" çipi duruyor ve numarayı
 * hem "0532..." hem "+90 0532..." diye okutmak yanlış olurdu.
 */
export const formatNationalMobile = (digits: string) => {
  if (!digits) return '';
  return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 8), digits.slice(8, 10)]
    .filter(Boolean)
    .join(' ');
};
