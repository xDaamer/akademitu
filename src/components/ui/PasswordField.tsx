import React, { useId, useState } from 'react';
import { Eye, EyeOff, Lock, Check } from 'lucide-react';
import { FieldShell, fieldInputClasses, FIELD_ICON_CLASSES } from './Field';

/*
 * ŞİFRE ALANI
 * ---------------------------------------------------------------------------
 * Göster/gizle düğmesi ve (kayıt ekranında) güç göstergesi.
 *
 * Düğme tabIndex={-1} DEĞİL: klavyeyle gezen biri de şifresini görebilmeli.
 * aria-pressed ile durumu bildirilir, etiketi duruma göre değişir. Basınca
 * odak düğmede kalır — input'a zıplatmak, kullanıcının yazdığı yeri
 * kaybetmesine yol açardı.
 *
 * Güç ölçütleri yalnızca YOL GÖSTERİR; zorunlu olan tek şey formun kendi
 * doğrulamasıdır (en az 8 karakter). Kullanıcıyı noktalama işareti koymaya
 * mecbur bırakmak, pratikte daha kısa ve daha tahmin edilebilir şifreler
 * üretiyor — o yüzden liste bir kontrol değil, öneri.
 */

const REQUIREMENTS = [
  { label: 'En az 8 karakter', test: (v: string) => v.length >= 8 },
  { label: 'Bir rakam', test: (v: string) => /\d/.test(v) },
  { label: 'Bir küçük harf', test: (v: string) => /[a-zçğıöşü]/.test(v) },
  { label: 'Bir büyük harf', test: (v: string) => /[A-ZÇĞİÖŞÜ]/.test(v) },
] as const;

const STRENGTH_LABELS = ['', 'Zayıf', 'Zayıf', 'Orta', 'Güçlü'] as const;
const STRENGTH_COLORS = [
  '',
  'bg-rose-400',
  'bg-rose-400',
  'bg-[#c5a059]',
  'bg-[#191F61]',
] as const;

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Güç çubuğu + ölçüt listesi — yalnızca kayıt ekranında. */
  showStrength?: boolean;
  /** Etiketin sağındaki ikincil eylem (ör. "Şifremi unuttum"). */
  labelAction?: React.ReactNode;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  value,
  onChange,
  label = 'Şifre',
  error,
  id,
  autoComplete = 'current-password',
  /* Nokta dizisi placeholder DEĞİL: boş alan doluymuş gibi görünüyor ve
     kullanıcı "zaten yazılı" sanıp geçiyor. */
  placeholder = 'Şifreni gir',
  disabled = false,
  showStrength = false,
  labelAction,
}) => {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [visible, setVisible] = useState(false);

  const metCount = REQUIREMENTS.filter((req) => req.test(value)).length;

  return (
    <div className="space-y-2">
      <FieldShell
        label={label}
        htmlFor={fieldId}
        error={error}
        labelAction={labelAction}
      >
        {({ describedBy }) => (
          <div className="relative">
            <Lock className={FIELD_ICON_CLASSES} aria-hidden="true" />

            <input
              id={fieldId}
              type={visible ? 'text' : 'password'}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={fieldInputClasses({
                hasError: Boolean(error),
                padding: 'pl-11 pr-12',
              })}
            />

            <button
              type="button"
              onClick={() => setVisible((current) => !current)}
              aria-pressed={visible}
              aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
              aria-controls={fieldId}
              className="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-[#191F61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] cursor-pointer"
            >
              {visible ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        )}
      </FieldShell>

      {/* Gösterge yalnızca yazmaya başlandığında belirir: boş bir alanın
          altında "Zayıf" yazması, henüz bir şey yapılmamışken azarlamaktır. */}
      {showStrength && value.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="flex h-1 flex-1 gap-1"
              role="img"
              aria-label={`Şifre gücü: ${STRENGTH_LABELS[metCount]}`}
            >
              {REQUIREMENTS.map((req, index) => (
                <span
                  key={req.label}
                  className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                    index < metCount ? STRENGTH_COLORS[metCount] : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {STRENGTH_LABELS[metCount]}
            </span>
          </div>

          <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
            {REQUIREMENTS.map((req) => {
              const met = req.test(value);
              return (
                <li
                  key={req.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    met ? 'font-semibold text-[#191F61]' : 'text-slate-500'
                  }`}
                >
                  <Check
                    className={`h-3.5 w-3.5 shrink-0 ${
                      met ? 'text-[#191F61]' : 'text-slate-300'
                    }`}
                    aria-hidden="true"
                  />
                  {req.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
