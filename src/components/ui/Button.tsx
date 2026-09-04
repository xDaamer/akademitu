import React from 'react';

/*
 * ORTAK BUTON
 * ---------------------------------------------------------------------------
 * Sitedeki butonlar aynı görünmeye çalışıyordu ama her dosyada elle yazıldığı
 * için köşe yarıçapı, dikey boşluk, yazı kalınlığı ve gölge birbirini tutmuyordu
 * (tek başına navy buton 10 yerde, 4 farklı biçimde). Varyantlar burada tek
 * yerde tanımlı; çağıran taraf hangi işi yaptığını söylüyor, nasıl görüneceğini
 * değil.
 *
 * Bilinçli olarak class-variance-authority / clsx / tailwind-merge kullanılmadı:
 * proje shadcn tabanlı değil ve bu üç paket sadece bu dosya için gelecekti.
 */

export type ButtonVariant =
  /** Ana eylem: lacivert zemin, beyaz yazı. Açık zeminlerde kullanılır. */
  | 'primary'
  /** Lacivert zemin ÜZERİNDE ana eylem: beyaz zemin, lacivert yazı. */
  | 'inverse'
  /** Lacivert zemin üzerinde ikincil eylem: mint zemin. */
  | 'mint'
  /** Lacivert zemin üzerinde sessiz eylem: yarı saydam beyaz. */
  | 'ghostInverse'
  /** Açık zeminde ikincil eylem: gri zemin, hover'da laciverte döner. */
  | 'soft'
  /** Koçluk paketinin kendi yeşil vurgusu — sitede tek yerde kullanılan
   *  ikincil semantik renk. `soft` ile aynı davranış, farklı ton. */
  | 'softEmerald'
  /** Çerçevesiz, menü sekmeleri gibi. */
  | 'ghost'
  /** Metin bağlantısı görünümü. */
  | 'link'
  /** Yuvarlak ikon butonu, gri zeminli. */
  | 'iconSoft'
  /** Yuvarlak ikon butonu, zeminsiz. */
  | 'iconGhost';

/**
 * `none`, kendi biçimi olan butonlar için kaçış kapısıdır (ör. sayfanın
 * kenarına yapışan, tek tarafı yuvarlatılmış dikey "Sizi Arayalım" sekmesi).
 * Renk, hover ve odak davranışı varyanttan gelir; ölçü ve köşe tamamen
 * çağırana bırakılır — böylece className ile varyantın sınıflarını ezme
 * ihtiyacı doğmaz (projede tailwind-merge yok, ezme güvenilir değil).
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'none';

/* gap ölçüye ait: size="none" kullanan özel biçimli butonlar kendi
   aralığını verebilsin diye BASE'te tutulmuyor (çakışan utility'lerde
   kazananı stylesheet sırası belirlerdi). */
const BASE =
  'inline-flex items-center justify-center transition-all duration-200 cursor-pointer ' +
  // Sitede hiçbir butonun görünür odak halkası yoktu; marka altınıyla ekleniyor.
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 ' +
  'disabled:opacity-60 disabled:pointer-events-none disabled:cursor-not-allowed';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-[#191F61] hover:bg-[#101442] text-white font-bold shadow-md hover:shadow-lg active:scale-[0.98]',
  inverse:
    'bg-white hover:bg-[#B6D6CC] text-[#191F61] font-bold shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0',
  mint: 'bg-[#B6D6CC] hover:bg-white text-[#191F61] font-extrabold shadow-md hover:shadow-lg active:scale-[0.98]',
  ghostInverse:
    'bg-white/10 hover:bg-white/20 text-white font-bold border border-white/15 active:scale-[0.98]',
  soft: 'bg-slate-100 hover:bg-[#191F61] text-[#191F61] hover:text-white font-bold shadow-sm hover:shadow-md active:scale-[0.98]',
  softEmerald:
    'bg-emerald-100 hover:bg-[#191F61] text-emerald-700 hover:text-white font-bold shadow-sm hover:shadow-md active:scale-[0.98]',
  ghost:
    'text-slate-600 hover:text-[#191F61] hover:bg-slate-100 font-semibold',
  link: 'text-[#191F61] hover:text-[#101442] font-bold underline underline-offset-4 decoration-[#c5a059]/60 hover:decoration-[#c5a059]',
  iconSoft:
    'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-[#191F61]',
  iconGhost: 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'gap-2 px-4 py-2 text-xs rounded-xl',
  md: 'gap-2 px-6 py-2.5 text-sm rounded-xl',
  lg: 'gap-2 px-6 sm:px-8 py-3.5 sm:py-4 text-sm sm:text-base rounded-2xl',
  icon: 'p-2 rounded-full',
  none: '',
};

/** link varyantı bir metin parçası gibi davranmalı: kendi boşluğu olmaz. */
const UNSTYLED_SIZE_VARIANTS: ButtonVariant[] = ['link'];

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

type ButtonAsButton = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof CommonProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
}: CommonProps): string {
  const sizeClasses = UNSTYLED_SIZE_VARIANTS.includes(variant)
    ? ''
    : SIZES[size];

  return [
    BASE,
    VARIANTS[variant],
    sizeClasses,
    fullWidth ? 'w-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export const Button = React.forwardRef<
  HTMLButtonElement & HTMLAnchorElement,
  ButtonProps
>(function Button(props, ref) {
  /*
   * Birleşim (union) tipli props parametrede doğrudan destructure edilirse
   * TS `variant`/`size` alanlarını `string`e genişletiyor. Ortak alanlar bu
   * yüzden tek tek, açık tiple okunuyor.
   */
  const variant: ButtonVariant = props.variant ?? 'primary';
  const size: ButtonSize = props.size ?? 'md';
  const fullWidth = props.fullWidth ?? false;
  const className = props.className ?? '';
  const children = props.children;

  const {
    variant: _variant,
    size: _size,
    fullWidth: _fullWidth,
    className: _className,
    children: _children,
    ...rest
  } = props;

  const classes = buttonClasses({ variant, size, fullWidth, className });

  if (typeof (rest as ButtonAsAnchor).href === 'string') {
    const anchorProps = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a {...anchorProps} ref={ref} className={classes}>
        {children}
      </a>
    );
  }

  const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      ref={ref}
      // Form içindeki butonların kazara submit etmesini engeller.
      type={buttonProps.type ?? 'button'}
      className={classes}
    >
      {children}
    </button>
  );
});
