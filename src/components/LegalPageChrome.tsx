import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import need from '../../need.json';
import { SITE_URL } from '../config';

/**
 * Yasal sayfaların ortak çerçevesi: breadcrumb + BreadcrumbList şeması +
 * karşılıklı bağlantılar + güncelleme tarihi.
 *
 * Neden ayrı bileşen: gizlilik ve kullanım koşulları sayfaları bu parçaların
 * hepsini birebir paylaşıyor. Eskiden ikisinde de yalnızca tek bir
 * "← Ana sayfaya dön" bağlantısı vardı; iki sayfa birbirine hiç bağlanmıyordu
 * ve "Son güncelleme" tarihi elle yazıldığı için gerçek düzenleme tarihinden
 * (git geçmişine göre 8 gün) eskiydi.
 */
interface LegalPageChromeProps {
  /** Bu sayfanın need.json'daki tanımı. */
  page: { path: string; title: string };
  /** Breadcrumb'da ve şemada görünecek kısa ad. */
  label: string;
  /** Diğer yasal sayfaya bağlantı. */
  sibling: { path: string; label: string };
}

/** Breadcrumb — görsel yol + BreadcrumbList şeması. */
export const LegalBreadcrumb: React.FC<
  Pick<LegalPageChromeProps, 'page' | 'label'>
> = ({ page, label }) => {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Ana Sayfa',
        item: `${SITE_URL}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: label,
        item: `${SITE_URL}${page.path}`,
      },
    ],
  };

  return (
    <>
      {/* React 19 <script>'i de head'e taşımaz ama sayfa içinde JSON-LD
          tamamen geçerlidir; Google gövdedeki ld+json bloklarını okur. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <nav aria-label="Site yolu" className="max-w-3xl mx-auto mb-4">
        <ol className="flex items-center gap-1 text-xs text-slate-500">
          <li>
            <Link
              to="/"
              className="hover:text-[#191F61] hover:underline py-1.5 inline-flex items-center"
            >
              Ana Sayfa
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="w-3.5 h-3.5" />
          </li>
          <li aria-current="page" className="font-semibold text-slate-700">
            {label}
          </li>
        </ol>
      </nav>
    </>
  );
};

/** Sayfa altı: güncelleme tarihi + kardeş sayfa + ana sayfa bağlantıları. */
export const LegalPageFooter: React.FC<
  Pick<LegalPageChromeProps, 'sibling'>
> = ({ sibling }) => (
  <>
    <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
      {/* Tarih need.json'dan geliyor: elle yazılan tarihler kaçınılmaz olarak
          eskiyor ve güven sayfalarında tarih doğruluğu bir güven sinyali. */}
      Son güncelleme: {need.legal.lastUpdated}
    </p>

    <div className="pt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <Link
        to="/"
        className="text-[#191F61] font-semibold hover:underline py-1.5 inline-flex items-center"
      >
        &larr; Ana sayfaya dön
      </Link>
      {/* İki yasal sayfa birbirinin doğal devamı; footer dışından da
          birbirlerine ulaşılabilmeli. */}
      <Link
        to={sibling.path}
        className="text-[#191F61] font-semibold hover:underline py-1.5 inline-flex items-center"
      >
        {sibling.label} &rarr;
      </Link>
    </div>
  </>
);
