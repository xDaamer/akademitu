import React, { useEffect } from 'react';
import need from '../../need.json';
import { SITE_URL } from '../config';

/**
 * SAYFA BAZLI <head> YÖNETİMİ
 * ============================================================================
 * Neden gerekli: uygulama bir SPA ve sunucu HER route için aynı `index.html`
 * dosyasını döndürüyor. O dosyada ana sayfanın canonical'ı ve açıklaması
 * yazılı olduğu için:
 *
 *   - /gizlilik-politikasi ve /kullanim-kosullari Google'a "ben aslında ana
 *     sayfayım" diyordu ve sitemap'te listeli olmalarına rağmen indeksten
 *     düşüyorlardı;
 *   - üç sayfa da aynı meta description'ı paylaşıyordu;
 *   - var olmayan bir URL 200 + `index, follow` dönüyordu (soft 404).
 *
 * NEDEN JSX DEĞİL, DOM?
 * ---------------------------------------------------------------------------
 * React 19 `<title>`/`<meta>`/`<link>` etiketlerini `<head>`'e taşıyor, ancak
 * `index.html` içinde ZATEN VAR OLAN aynı isimli etiketlerle birleştirmiyor:
 * ikinci bir etiket ekliyor. Ölçüldü — yasal sayfada iki `canonical`, iki
 * `description`, iki `robots` oluşuyordu. Çakışan iki canonical, tek yanlış
 * canonical'dan daha kötüdür (Google ikisini birden yok sayar).
 *
 * Bu yüzden etiketler "upsert" ediliyor: varsa güncellenir, yoksa oluşturulur.
 * `index.html`'deki statik değerler JS çalışmayan tarayıcılar için yerinde
 * kalır; JS çalışınca doğru değerle üzerine yazılır.
 *
 * İŞ BÖLÜMÜ — PRERENDER'DAN SONRA (2026-09-15)
 * ---------------------------------------------------------------------------
 * Buradaki eski not "sunucudan gelen ilk HTML hâlâ ana sayfanın etiketlerini
 * taşır, kalıcı çözüm prerender'dır" diyordu. O çözüm uygulandı
 * (scripts/prerender.ts), dolayısıyla iş ikiye ayrıldı:
 *
 *   - STATİK <head>  -> scripts/prerender.ts. Her rotanın title/description/
 *     canonical/robots/og/twitter/hreflang etiketleri build sırasında kendi
 *     HTML dosyasına yazılıyor. İkisi de need.json'daki AYNI seo.pages dizisini
 *     okuduğu için metinler ayrışamaz.
 *   - SPA GEÇİŞLERİ  -> bu bileşen, değişmeden. İlk mount'ta doğru değerin
 *     üzerine aynı doğru değeri yazıyor (etkisiz); asıl işini istemci tarafı
 *     gezinmede yapıyor.
 *
 * Bu bileşeni React 19'un hoistable etiketlerine ÇEVİRMEYİN. Yukarıdaki
 * ölçüm (çift canonical) hâlâ geçerli ve prerender sonrası daha da kötü:
 * artık her prerender edilmiş dosya da o etiketleri taşıyor.
 */
interface PageMetaProps {
  /** Sekmede ve SERP'te görünen başlık. */
  title: string;
  /** SERP açıklaması. */
  description: string;
  /** Kök için "/", diğerleri için "/gizlilik-politikasi" gibi. */
  path: string;
  /** 404 gibi indekslenmemesi gereken sayfalar için. */
  noIndex?: boolean;
  /**
   * Adresin ait olduğu host. Varsayılan ana site (SITE_URL); panel
   * portal.akademitu.com'da yaşadığı için oradaki sayfalar kendi origin'ini
   * verir. Verilmezse panelin og:url'i ana sayfayı gösterirdi.
   */
  origin?: string;
}

const INDEXABLE_ROBOTS =
  'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

/** `<meta name="...">` veya `<meta property="...">` — varsa günceller, yoksa ekler. */
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`
  );

  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute('content', content);
}

/** `<link rel="...">` — varsa günceller, yoksa ekler. */
function upsertLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  tag.setAttribute('href', href);
}

export const PageMeta: React.FC<PageMetaProps> = ({
  title,
  description,
  path,
  noIndex = false,
  origin = SITE_URL,
}) => {
  useEffect(() => {
    const canonical = `${origin}${path === '/' ? '/' : path}`;

    document.title = title;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noIndex ? 'noindex, follow' : INDEXABLE_ROBOTS);

    /*
     * noindex sayfada canonical YAYINLANMAZ. 404 gerçek bir URL'e karşılık
     * gelmediği için ona canonical vermek ("bu sayfanın aslı şurası") ile
     * noindex ("bunu dizine alma") çelişen iki sinyal olurdu. index.html'den
     * miras kalan etiket de kaldırılıyor, aksi halde ana sayfayı gösterirdi.
     */
    if (noIndex) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      upsertLink('canonical', canonical);
    }

    /* Sosyal paylaşım etiketleri de sayfaya özel olmalı; aksi halde her
       bağlantı ana sayfanın başlığıyla paylaşılıyor. */
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:site_name', need.site.name);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:url', canonical);

    /*
     * Temizlik yok: bir sonraki sayfa mount olduğunda aynı etiketleri kendi
     * değerleriyle ezecek. Unmount'ta silmek, iki sayfa arasındaki geçişte
     * <head>'in bir an boş kalmasına yol açardı.
     */
  }, [title, description, path, noIndex, origin]);

  return null;
};

/** `need.json`'daki sayfa tanımını id ile getirir — metinler tek kaynakta. */
export function seoPage(id: string) {
  const page = need.seo.pages.find((entry) => entry.id === id);

  if (!page) {
    throw new Error(
      `need.json içinde "${id}" id'li sayfa yok. seo.pages listesini kontrol edin.`
    );
  }

  return page;
}
