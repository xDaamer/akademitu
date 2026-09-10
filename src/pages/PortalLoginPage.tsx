import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { PortalBrandPanel } from '../components/portal/PortalBrandPanel';
import { LoginForm } from '../components/portal/LoginForm';
import { buttonClasses } from '../components/ui/Button';
import { CrossHostRedirect } from '../components/CrossHostRedirect';
import { useAuth } from '../context/AuthContext';
import { panelHref } from '../lib/host';

/*
 * PORTAL GİRİŞ KAPISI (akademitu.com/login)
 * ===========================================================================
 * Sayfa sitenin Header/Footer'ını almaz (bkz. App.tsx): burası pazarlama
 * sayfası değil, ürünün ilk ekranı. Menü, WhatsApp düğmesi ve yapışkan CTA
 * çubuğu giriş yapmaya çalışan birinin işine yaramaz, dikkat dağıtır.
 *
 * GİRİŞ ANA SİTEDE KALIR, PANEL ALT ALAN ADINA TAŞINDI. Sebep: giriş sayfası
 * kullanıcının bildiği adresten (akademitu.com) ulaşılabilir olmalı; panelin
 * kendisi ise pazarlama sitesinden ayrı bir ürün yüzeyi. Başarılı girişten
 * sonra portal.akademitu.com'a tam sayfa geçiş yapılıyor (bkz. LoginForm).
 *
 * noIndex: panel girişi arama sonuçlarında görünmemeli. need.json'daki
 * seo.pages listesine de eklenmiyor — oraya eklenirse sitemap'e girer.
 * (Meta etiketin yanında vercel.json'da /login için X-Robots-Tag da var:
 * o, JS hiç çalışmasa bile geçerlidir.)
 *
 * KAYIT EKRANI YOK: hesaplar elle açılıyor (bkz. supabase-portal-auth.sql).
 * Kart tek biçimli olduğu için giriş<->kayıt geçişindeki yükseklik animasyonu
 * da kaldırıldı — animasyona konu olan bir durum değişimi kalmadı.
 */

export const PortalLoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();

  /*
   * Oturumu açık olan biri /login'e gelirse giriş formu göstermek anlamsız —
   * doğrudan panele. isLoading beklenir, aksi halde oturumu olan kullanıcı
   * her yenilemede bir an formu görürdü.
   */
  if (!isLoading && user) {
    return <CrossHostRedirect to={panelHref()} />;
  }

  return (
    <>
      <PageMeta
        title="Giriş Yap | akademITU Panel"
        description="akademITU öğrenci ve veli paneline telefon numaran ve şifrenle giriş yap."
        path="/login"
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

          <div className="mx-auto my-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
            {/*
              Logo görseli kaldırıldı; marka adı metin olarak kaldı.
              Mobilde sol panel gizlendiği için kartın üstündeki bu satır,
              kişinin hangi siteye giriş yaptığını gösteren tek yer — bu yüzden
              tamamen çıkarılmadı.
            */}
            <div className="mb-7 text-center">
              <span className="text-sm font-bold tracking-tight text-slate-500">
                akademITU
              </span>
            </div>

            <LoginForm />
          </div>

          {/* Alt boşluğu dengeler: kart my-auto ile ortalanırken üstteki
              "Siteye dön" bağlantısının yüksekliği kadar karşılık gerekiyor,
              yoksa kart optik olarak yukarı kayıyor. */}
          <div aria-hidden="true" className="h-8 shrink-0" />
        </div>
      </main>
    </>
  );
};
