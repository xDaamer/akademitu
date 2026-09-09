import React, { useId } from 'react';
import { Check } from 'lucide-react';
import {
  extractSignificantPhoneDigits,
  formatNationalMobile,
  isValidTurkishMobilePhone,
} from '../../lib/phone';
import { FieldShell, fieldInputClasses } from './Field';

/*
 * TELEFON ALANI (+90 SABİT ÇİPİ)
 * ---------------------------------------------------------------------------
 * Ülke seçici YOK, bilinçli olarak: akademITU yalnızca Türkiye'ye hizmet
 * veriyor ve veritabanı kuralı da (`^0?5[0-9]{9}$`) sadece TR cep numarası
 * kabul ediyor. 50 ülkelik bir açılır liste, hiçbiri seçilemeyecekken
 * kullanıcıya seçim varmış izlenimi verirdi.
 *
 * Alan 10 hane alır ("532 123 45 67"); dışarıya verilen değer sitenin geri
 * kalanıyla aynı kanonik biçimdedir: "05321234567" (bkz. lib/phone.ts).
 *
 * İmleç yönetimi: maske sadece araya boşluk koyduğu için imleç her zaman
 * metnin sonunda kalır. Kullanıcı ortadan silmeye çalışırsa rakam sırası
 * korunur — girdi tamamen rakamlardan yeniden kurulduğu için maskenin
 * boşlukları asla "silinebilir karakter" gibi davranmaz.
 */

interface PhoneFieldProps {
  /** Kanonik değer: "05321234567" ya da boş. */
  value: string;
  onChange: (canonicalValue: string) => void;
  label?: string;
  error?: string;
  id?: string;
  autoComplete?: string;
  disabled?: boolean;
  /** Doğru numara girildiğinde sağda mint bir onay işareti gösterir. */
  showValidMark?: boolean;
}

const HINT = '5 ile başlayan 10 hane · 532 123 45 67';

export const PhoneField: React.FC<PhoneFieldProps> = ({
  value,
  onChange,
  label = 'Telefon numarası',
  error,
  id,
  autoComplete = 'tel-national',
  disabled = false,
  showValidMark = true,
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  const digits = extractSignificantPhoneDigits(value);
  const isValid = isValidTurkishMobilePhone(value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextDigits = extractSignificantPhoneDigits(event.target.value);
    // Alan boşaltıldığında "0" değil boş string dönmeli, yoksa boş form
    // doğrulaması "girilmiş ama geçersiz" sanır.
    onChange(nextDigits ? `0${nextDigits}` : '');
  };

  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={HINT}>
      {({ describedBy }) => (
        <div className="flex items-stretch">
          {/*
            +90 çipi bir <input> değil, gösterge. aria-hidden değil çünkü
            ekran okuyucunun numaranın ülke kodunu okuması gerekiyor; ancak
            odaklanabilir de değil — sekme sırasına gereksiz bir durak
            eklemez.
          */}
          <span className="flex shrink-0 items-center gap-2 rounded-l-xl border border-r-0 border-slate-200 bg-slate-100 px-3.5 text-base font-semibold text-slate-600">
            <span aria-hidden="true">🇹🇷</span>
            <span>+90</span>
          </span>

          <div className="relative flex-1">
            <input
              id={fieldId}
              type="tel"
              inputMode="numeric"
              autoComplete={autoComplete}
              disabled={disabled}
              placeholder="532 123 45 67"
              value={formatNationalMobile(digits)}
              onChange={handleChange}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              /* 13 = 10 rakam + 3 boşluk. Yapıştırılan uzun metni de kırpar. */
              maxLength={13}
              className={fieldInputClasses({
                hasError: Boolean(error),
                padding: showValidMark && isValid ? 'pl-4 pr-11' : 'px-4',
                extra: 'rounded-l-none',
              })}
            />

            {showValidMark && isValid && (
              <Check
                className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-[#191F61]"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      )}
    </FieldShell>
  );
};
