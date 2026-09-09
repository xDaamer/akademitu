import React, { useId } from 'react';

/*
 * ORTAK FORM ALANI
 * ---------------------------------------------------------------------------
 * Button.tsx ile aynı gerekçe: alan biçimi sitede tek yerde tanımlı değildi.
 * PopUpForm.tsx her input'u elle yazıyor, MobileLeadSheet.tsx aynı sınıfları
 * kendi modül içi FIELD_CLASSES/LABEL_CLASSES sabitlerine kopyalamış durumda.
 * Portal ekranları üçüncü kopya olmasın diye etiket + ikon + input + hata
 * burada birleşti.
 *
 * Erişilebilirlik burada bir kez doğru yapılıyor: label htmlFor ile input'a
 * bağlanır, hata ve yardım metni aria-describedby ile okunur, geçersiz alan
 * aria-invalid taşır. Elle yazılan alanlarda bunların hiçbiri yoktu.
 *
 * PopUpForm bu fazda BİLEREK değiştirilmedi (1073 satır, kendi akışı var);
 * oradaki alanların buraya taşınması ayrı bir iş.
 */

/**
 * Sitedeki kanonik input biçimi — PopUpForm.tsx'ten alındı, ancak ZEMİN VE
 * KENAR RENGİ BURADA YOK.
 *
 * Neden ayrı: projede tailwind-merge yok (bkz. Button.tsx). Temel sınıfa
 * `border-slate-200` yazıp hata durumunda className'e `border-rose-300`
 * eklemek İŞE YARAMAZ — iki utility de sınıf listesinde durur ve kazananı
 * class attribute'undaki sıra değil, üretilen stylesheet'teki sıra belirler.
 * (Tam olarak bu yüzden hatalı alanların kırmızı kenarı görünmüyordu.)
 * Çözüm ezmek değil, çakışan utility'yi baştan tek kez seçmek:
 * fieldInputClasses() aşağıda durum başına TAM takımı döndürüyor.
 */
const FIELD_INPUT_BASE =
  'w-full py-3 text-base border rounded-xl text-slate-900 ' +
  'placeholder-slate-400 focus:outline-none focus:ring-2 ' +
  'focus:ring-[#191F61] transition-all';

const FIELD_STATE_DEFAULT = 'bg-slate-50 border-slate-200 focus:bg-white';
const FIELD_STATE_INVALID = 'bg-rose-50 border-rose-300 focus:bg-white';

export const FIELD_LABEL_CLASSES =
  'block text-xs font-bold uppercase tracking-wider text-slate-700';

export const FIELD_ICON_CLASSES =
  'w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none';

/**
 * Bir input'un tam sınıf dizesi. `padding` ve `extra` çağırana bırakılır
 * (ikon varsa sol dolgu, telefon alanında sol köşenin düzleşmesi gibi);
 * bunlar temel takımla çakışmadığı için eklenmeleri güvenli.
 */
export function fieldInputClasses({
  hasError = false,
  padding = 'px-4',
  extra = '',
}: {
  hasError?: boolean;
  padding?: string;
  extra?: string;
} = {}): string {
  return [
    FIELD_INPUT_BASE,
    hasError ? FIELD_STATE_INVALID : FIELD_STATE_DEFAULT,
    padding,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

interface FieldShellProps {
  label: string;
  /** Alanın kendi id'si; verilmezse üretilir. */
  htmlFor: string;
  error?: string;
  /** Alanın altındaki açıklama (ör. beklenen biçim). */
  hint?: string;
  /** Hata ve ipucu id'lerini alan, input'u render eden fonksiyon. */
  children: (ids: { describedBy?: string }) => React.ReactNode;
  /** Etiketin sağına konan ikincil eylem (ör. "Şifremi unuttum"). */
  labelAction?: React.ReactNode;
}

/**
 * Etiket + içerik + ipucu/hata iskeleti. Input'un kendisini children render
 * eder; böylece aynı iskelet düz input, telefon alanı ve şifre alanı için
 * çalışır.
 */
export const FieldShell: React.FC<FieldShellProps> = ({
  label,
  htmlFor,
  error,
  hint,
  children,
  labelAction,
}) => {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;

  /* Hata varsa ipucu yerine hata okunur: ekran okuyucuya iki çelişen
     açıklama vermek yerine o an geçerli olan tek bilgi verilir. */
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className={FIELD_LABEL_CLASSES}>
          {label}
        </label>
        {labelAction}
      </div>

      {children({ describedBy })}

      {error ? (
        <p id={errorId} className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

interface FieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  /** Solda duran lucide ikonu; verilmezse input'un sol dolgusu küçülür. */
  icon?: React.ReactNode;
  id?: string;
}

/** İkonlu tek satırlık metin alanı (ad soyad, e-posta, ...). */
export const Field: React.FC<FieldProps> = ({
  label,
  error,
  hint,
  icon,
  id,
  className = '',
  ...inputProps
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;

  return (
    <FieldShell label={label} htmlFor={fieldId} error={error} hint={hint}>
      {({ describedBy }) => (
        <div className="relative">
          {icon}
          <input
            {...inputProps}
            id={fieldId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={fieldInputClasses({
              hasError: Boolean(error),
              padding: icon ? 'pl-11 pr-4' : 'px-4',
              extra: className,
            })}
          />
        </div>
      )}
    </FieldShell>
  );
};
