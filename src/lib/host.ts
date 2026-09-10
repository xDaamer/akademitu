import need from '../../need.json';

/**
 * İKİ ALAN ADI, TEK BUNDLE
 * ============================================================================
 * Site iki host'tan servis ediliyor ve ikisi de AYNI Vercel projesinden,
 * aynı `dist/` çıktısıyla geliyor:
 *
 *   akademitu.com          -> pazarlama sayfaları + /login (giriş ekranı)
 *   portal.akademitu.com   -> panelin kendisi, kökte (/)
 *
 * Yani "hangi sayfa var" sorusunun cevabını yol değil HOST veriyor. Bu dosya
 * o kararın tek yeri; başka hiçbir bileşen `window.location.hostname`
 * okumamalı, aksi halde alan adı değiştiğinde düzeltilecek yer sayısı artar.
 *
 * ADRESLER need.json'DAN GELİR. Kodun içine "https://portal.akademitu.com"
 * yazmayın — SITE_URL için geçerli olan gerekçenin (bkz. src/config.ts) aynısı.
 *
 * BU BİR GÜVENLİK SINIRI DEĞİL. Bundle tek olduğu için panel bileşenlerinin
 * kodu iki host'ta da indirilebilir; burada yapılan iş yalnızca doğru host'ta
 * doğru ekranı göstermek. Gerçek sınır sunucuda (çerezdeki jeton) ve
 * veritabanında (RLS). Panelin JS'ini "gizlemek" hiçbir veriyi korumaz.
 */

/*
 * Yerel geliştirme ve Vercel önizlemeleri için kaçış kapısı. Tanımlıysa
 * need.json'daki canlı adreslerin yerine geçer; örneğin /etc/hosts'a
 * akademitu.local + portal.akademitu.local ekleyip iki host'lu kurulumu
 * birebir denemek için (bkz. .env.example, COOKIE_DOMAIN).
 */
const MAIN_ORIGIN: string =
  import.meta.env.VITE_MAIN_ORIGIN || need.site.domain;
const PORTAL_ORIGIN: string =
  import.meta.env.VITE_PORTAL_ORIGIN || need.portal.domain;

function hostOf(origin: string): string {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return '';
  }
}

const MAIN_HOST = hostOf(MAIN_ORIGIN);
const PORTAL_HOST = hostOf(PORTAL_ORIGIN);

/** Giriş ekranının tam adresi — panelden ana siteye dönerken kullanılır. */
export const LOGIN_URL = `${MAIN_ORIGIN}${need.portal.loginPath}`;

/** Panelin tam adresi — giriş sonrası buraya gidiliyor. */
export const PANEL_URL = `${PORTAL_ORIGIN}/`;

/**
 * UYGULAMANIN HANGİ ROUTE AĞACINI KURACAĞI
 * ---------------------------------------------------------------------------
 * 'portal' : yalnızca panel (portal.akademitu.com)
 * 'main'   : yalnızca pazarlama + giriş (akademitu.com / www.akademitu.com)
 * 'both'   : ikisi birden — localhost ve *.vercel.app önizlemeleri
 *
 * 'both' BİLEREK var: tek host'lu bir ortamda ("npm run dev") panel adresi
 * hiç açılamazsa panel yerelde denenemez hâle gelir. Önizlemede iki ağacın
 * birden görünmesi bir açık değil (yukarıdaki "güvenlik sınırı değil" notu):
 * canlıda ayrım zaten Vercel kenarındaki yönlendirmelerle de uygulanıyor
 * (bkz. vercel.json).
 */
export type RoutingMode = 'portal' | 'main' | 'both';

export function routingMode(): RoutingMode {
  if (typeof window === 'undefined') return 'main';

  const host = window.location.host.toLowerCase();
  const hostname = window.location.hostname.toLowerCase();

  /* İlk etiketi "portal" olan her host panel sayılır: canlı adresin yanı sıra
     portal.akademitu.local gibi yerel kurulumları da kapsar. */
  if (host === PORTAL_HOST || hostname.split('.')[0] === 'portal') return 'portal';

  /* Ana site: www'lu ve www'suz hâl aynı şey. */
  const bare = MAIN_HOST.replace(/^www\./, '');
  if (host === MAIN_HOST || host === bare || host === `www.${bare}`) return 'main';

  return 'both';
}

export function isPortalHost(): boolean {
  return routingMode() === 'portal';
}

/**
 * Panelin bu ortamdaki adresi. 'both' modunda (yerel/önizleme) host
 * değişmediği için tam URL yerine yol döner — aksi halde "npm run dev"
 * sırasında giriş yapan kişi canlı portala fırlatılırdı.
 */
export function panelHref(): string {
  return routingMode() === 'both' ? '/panel' : PANEL_URL;
}

/** Giriş ekranının bu ortamdaki adresi. Aynı gerekçe. */
export function loginHref(): string {
  return routingMode() === 'both' ? need.portal.loginPath : LOGIN_URL;
}

/** Verilen hedef başka bir host'ta mı — yani react-router değil, tam sayfa mı? */
export function isCrossHost(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
