import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { PageMeta } from '../components/PageMeta';
import { PortalBrandPanel } from '../components/portal/PortalBrandPanel';
import { LoginForm } from '../components/portal/LoginForm';
import { SignUpForm } from '../components/portal/SignUpForm';
import { buttonClasses } from '../components/ui/Button';
import logoBlue from '../assets/logo-blue.png';

/*
 * PORTAL GİRİŞ KAPISI (/portal ve /portal/kayit)
 * ===========================================================================
 * Sayfa sitenin Header/Footer'ını almaz (bkz. App.tsx): burası pazarlama
 * sayfası değil, ürünün ilk ekranı. Menü, WhatsApp düğmesi ve yapışkan CTA
 * çubuğu giriş yapmaya çalışan birinin işine yaramaz, dikkat dağıtır.
 *
 * noIndex: panel girişi arama sonuçlarında görünmemeli. need.json'daki
 * seo.pages listesine de eklenmiyor — oraya eklenirse sitemap'e girer.
 *
 * Sayfadaki tek animasyon kartın giriş<->kayıt geçişindeki yükseklik
 * değişimi; kullanıcının kendi eylemine verilen cevap. layout prop'u
 * prefers-reduced-motion'a motion kütüphanesi tarafından zaten saygı
 * gösterilerek uygulanır.
 */

interface PortalLoginPageProps {
  mode: 'login' | 'signup';
}

const META = {
  login: {
    title: 'Giriş Yap | akademITU Panel',
    description:
      'akademITU öğrenci ve veli paneline telefon numaran ve şifrenle giriş yap.',
    path: '/portal',
  },
  signup: {
    title: 'Kayıt Ol | akademITU Panel',
    description:
      'akademITU panelinde e-posta adresinle hesap aç, ders programını ve gelişimini takip et.',
    path: '/portal/kayit',
  },
} as const;

export const PortalLoginPage: React.FC<PortalLoginPageProps> = ({ mode }) => {
  const meta = META[mode];

  return (
    <>
      <PageMeta
        title={meta.title}
        description={meta.description}
        path={meta.path}
        noIndex
      />

      <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <PortalBrandPanel />

        <div className="relative flex flex-col bg-slate-50 px-4 py-10 sm:px-8 lg:py-14">
          {/* Siteye dönüş: kapıdan geri çıkmanın tek yolu bu, çünkü sayfada
              header yok. Sol üstte, okuma yönünün başladığı yerde. */}
          <Link
            to="/"
            className={buttonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'self-start',
            })}
          >
            <ArrowLeft className="h-4 w-4" />
            Siteye dön
          </Link>

          <motion.div
            layout
            transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
            className="mx-auto my-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="mb-7 flex flex-col items-center text-center">
              <img
                src={logoBlue}
                alt=""
                width={512}
                height={512}
                className="h-14 w-14 rounded-2xl object-contain"
              />
              <span className="mt-2 text-sm font-bold tracking-tight text-slate-500">
                akademITU
              </span>
            </div>

            {mode === 'login' ? <LoginForm /> : <SignUpForm />}
          </motion.div>

          {/* Alt boşluğu dengeler: kart my-auto ile ortalanırken üstteki
              "Siteye dön" bağlantısının yüksekliği kadar karşılık gerekiyor,
              yoksa kart optik olarak yukarı kayıyor. */}
          <div aria-hidden="true" className="h-8 shrink-0" />
        </div>
      </main>
    </>
  );
};
