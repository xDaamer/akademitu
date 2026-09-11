import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { SITE_URL } from '../../config';

/*
 * PANEL BAŞLIĞI — ÜÇ PANELİN ORTAK ÜST ÇUBUĞU
 * ===========================================================================
 * Öğrenci, öğretmen ve yönetim panelleri ile alt sayfaları aynı çubuğu
 * paylaşıyor. Önceden her sayfa kendi kopyasını taşıyordu ve "hepsinde aynı
 * olsun" dört ayrı yerde elle korunmaya çalışılan bir şeydi; bir tanesini
 * güncelleyip diğerlerini unutmak an meselesiydi.
 *
 * ZEMİN LACİVERT (#191F61), pazarlama sayfalarındaki beyaz çubuktan farklı
 * olarak. Ayrım işlevsel: panel ürünün içi, pazarlama sayfası dışı. Aynı
 * görünen bir çubuk, kullanıcıya hangisinde olduğunu söylemezdi.
 *
 * SAYDAMLIK YOK (bg-white/95 + backdrop-blur değil): çubuk yapışkan ve
 * altından slate-50 içerik kayıyor. Yarı saydam bir lacivert, kayan içerikle
 * karışıp çamurlu bir ton üretirdi. Düz renk hem daha okunaklı hem daha ucuz.
 *
 * ÜZERİNDEKİ HER ŞEY ZEMİNE GÖRE SEÇİLDİ:
 *   marka yazısı  -> beyaz, hover'da mint
 *   rozet         -> yarı saydam renkli zemin + AÇIK yazı (koyu yazı
 *                    lacivert üzerinde okunmaz; eski altın rozetin
 *                    #7a5f2a yazısı tam olarak bu yüzden taşındı)
 *   çıkış düğmesi -> ghostInverse, zaten "lacivert zemin üzerinde sessiz
 *                    eylem" için tanımlı varyant
 */

const ROZET_TONU = {
  /* Mint ve altın, sitenin kendi ikincil renkleri. Lacivert üzerinde ikisi de
     açık tonda kullanılıyor — koyu hâlleri zeminle kaynaşırdı. */
  mint: 'bg-[#B6D6CC]/20 text-[#B6D6CC]',
  altin: 'bg-[#c5a059]/25 text-[#dcbc84]',
} as const;

interface PanelHeaderProps {
  /** Rol rozeti. Öğrenci panelinde yok: varsayılan panel zaten o. */
  rozet?: { metin: string; ton: keyof typeof ROZET_TONU };
  /**
   * Markanın yerine geçen geri bağlantısı — panelin alt sayfalarında.
   * Aynı host içinde olduğu için react-router Link yeterli.
   */
  geri?: { to: string; etiket: string };
  /** Çıkış düğmesi. Alt sayfalarda gereksiz: bir üstte zaten var. */
  cikis?: boolean;
  /** İçerik genişliği — sayfalar farklı ölçüde (3xl/5xl/6xl). */
  genislik?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  rozet,
  geri,
  cikis = true,
  genislik = 'max-w-5xl',
}) => {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#191F61]">
      <div className={`mx-auto flex h-20 ${genislik} items-center gap-3 px-4 sm:px-6`}>
        {geri ? (
          <Link
            to={geri.to}
            className="flex items-center gap-1.5 rounded text-sm font-bold text-white transition-colors hover:text-[#B6D6CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191F61]"
          >
            <ArrowLeft className="h-4 w-4" />
            {geri.etiket}
          </Link>
        ) : (
          /*
            Ana siteye dönüşün TEK yolu: panel host'unda Header/Footer hiç
            render edilmiyor. react-router Link DEĞİL — hedef başka bir host.
          */
          <a
            href={`${SITE_URL}/`}
            className="rounded text-lg font-extrabold tracking-tight text-white transition-colors hover:text-[#B6D6CC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2 focus-visible:ring-offset-[#191F61]"
          >
            akademITU
          </a>
        )}

        {rozet && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${ROZET_TONU[rozet.ton]}`}
          >
            {rozet.metin}
          </span>
        )}

        {cikis && (
          <Button variant="ghostInverse" size="sm" onClick={logout} className="ml-auto">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Çıkış yap</span>
          </Button>
        )}
      </div>
    </header>
  );
};
