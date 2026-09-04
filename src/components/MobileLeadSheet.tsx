import React from 'react';
import { X, Phone, User, ArrowRight } from 'lucide-react';
import { motion, PanInfo } from 'motion/react';
import logoWhite from '../assets/logo-white.png';
import { Button } from './ui/Button';

/*
 * MOBİL: ALTTAN AÇILAN İLK ADIM
 * ---------------------------------------------------------------------------
 * Telefonda aynı çekmeceye masaüstündeki formun tamamı sığdırılmaya çalışılıyordu:
 * iki rozet, üç satır açıklama, sınav seçimi ve iki alan 60vh'ye sığmadığı için
 * "Gönder" düğmesi ekranın altında kalıyor, görmek için çekmecenin içinde ayrıca
 * kaydırmak gerekiyordu. Bir açılış ekranında görünmeyen düğme, olmayan düğmedir.
 *
 * Bu yüzden mobil ilk adım kendi bileşeni: yalnızca ad, telefon ve gönder.
 * Rozetlerle paragrafın söylediğini tek satır söylüyor, hedef sınav ise ikinci
 * adıma taşındı (PopUpForm'daki `examDeferred`). Sonuç ~424px — 844px'lik bir
 * telefonda ekranın tam yarısı, kaydırma yok.
 *
 * Sürükleme: çekmecenin tamamı aşağı sürüklenebilir (yalnızca üstteki tutamaç
 * değil), çünkü insanlar bu yüzeyi kapatmak için parmağını nereye koyarsa oraya
 * koyar. Arkadaki sayfanın kayması PopUpForm'daki gövde kilidiyle engelleniyor.
 */

interface MobileLeadSheetProps {
  fullName: string;
  phone: string;
  website: string;
  error: string;
  isSubmitting: boolean;
  onFullNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onOpenKvkk: () => void;
}

/** Bu mesafeden fazla aşağı çekilirse ya da bu hızla aşağı fırlatılırsa kapanır. */
const DISMISS_DISTANCE_PX = 90;
const DISMISS_VELOCITY_PX_PER_S = 600;

const FIELD_CLASSES =
  'w-full h-12 pl-11 pr-4 text-sm bg-slate-50 border border-slate-200 rounded-xl ' +
  'text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none ' +
  'focus:ring-2 focus:ring-[#191F61] focus:border-transparent transition-all';

const LABEL_CLASSES =
  'block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5';

/* İkon alanın tam ortasında: sabit bir `top` değeri yerine ortalama, alan
   yüksekliği değişse de kaymayan tek yol. */
const ICON_CLASSES =
  'w-[18px] h-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none';

export const MobileLeadSheet: React.FC<MobileLeadSheetProps> = ({
  fullName,
  phone,
  website,
  error,
  isSubmitting,
  onFullNameChange,
  onPhoneChange,
  onWebsiteChange,
  onSubmit,
  onClose,
  onOpenKvkk,
}) => {
  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > DISMISS_DISTANCE_PX || info.velocity.y > DISMISS_VELOCITY_PX_PER_S) {
      onClose();
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Ücretsiz deneme dersi formu"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      /* Spring her karede fizik simülasyonu koşturur. Süreli tween aynı hissi
         çok daha ucuza verir; drag davranışı bundan etkilenmez. */
      transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
      drag="y"
      dragDirectionLock
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      className="relative z-10 w-full bg-white text-slate-800 rounded-t-3xl border-t border-slate-200 shadow-[0_-8px_40px_rgba(16,20,66,0.18)] px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
    >
      {/* SÜRÜKLEME TUTAMACI */}
      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" aria-hidden="true" />

      {/* LOGO, ADIM VE KAPAT */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={logoWhite} alt="akademITU" className="h-9 w-auto object-contain shrink-0" />
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-[#191F61]" />
            Adım 1/2
          </span>
        </div>
        <Button variant="iconSoft" size="icon" onClick={onClose} aria-label="Kapat">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <h2 className="text-[22px] leading-tight font-extrabold text-[#191F61] tracking-tight mb-1.5">
        Ücretsiz Deneme Dersi
      </h2>
      {/* Eskiden iki rozet ve üç satırlık paragrafın söylediği şey — tek satırda. */}
      <p className="text-[13px] leading-snug text-slate-600 mb-5">
        İlk ders tamamen ücretsiz, hiçbir taahhüt yok.
      </p>

      <form onSubmit={onSubmit} noValidate>
        {error && (
          <div className="text-xs font-semibold text-rose-700 bg-rose-50 px-3 py-2.5 rounded-xl border border-rose-200 mb-3">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label htmlFor="sheet-fullname" className={LABEL_CLASSES}>
              Ad Soyad *
            </label>
            <div className="relative">
              <User className={ICON_CLASSES} />
              <input
                id="sheet-fullname"
                type="text"
                autoComplete="name"
                placeholder="Örn: Ahmet Yılmaz"
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                className={FIELD_CLASSES}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="sheet-phone" className={LABEL_CLASSES}>
              Telefon Numarası *
            </label>
            <div className="relative">
              <Phone className={ICON_CLASSES} />
              <input
                id="sheet-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="0 (5XX) XXX XX XX"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                maxLength={17}
                className={FIELD_CLASSES}
                required
              />
            </div>
          </div>
        </div>

        {/* BAL KÜPÜ (BOT TUZAĞI) */}
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <label htmlFor="website-sheet">Website</label>
          <input
            id="website-sheet"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => onWebsiteChange(e.target.value)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting} className="mt-5">
          <span>{isSubmitting ? 'Kaydediliyor...' : 'Gönder'}</span>
          <ArrowRight className="w-4 h-4 text-[#B6D6CC]" />
        </Button>
      </form>

      <p className="mt-3 text-center text-[11px] leading-snug text-slate-500">
        Bu formu doldurarak{' '}
        <Button variant="link" onClick={onOpenKvkk} className="inline text-[11px]">
          KVKK Aydınlatma Metni
        </Button>{' '}
        ve Gizlilik Politikasını onaylamış olursunuz.
      </p>
    </motion.div>
  );
};
