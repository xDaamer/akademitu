import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import App from './App';
import { AuthProvider } from './context/AuthContext';

/**
 * PRERENDER GİRİŞ NOKTASI — yalnızca build sırasında, Node içinde çalışır.
 * ============================================================================
 * `vite build --ssr` bu dosyayı dist-ssr/entry-server.js'e derliyor,
 * `scripts/prerender.ts` de onu import edip her rota için HTML üretiyor.
 * Tarayıcıya ASLA gönderilmiyor; istemcinin girişi src/main.tsx.
 *
 * Neden düz `tsx` ile değil de Vite ile derleniyor: src/lib/host.ts
 * `import.meta.env.VITE_*` okuyor (Node'da TypeError) ve Header/Footer
 * `../assets/logo-white.png` gibi Vite asset import'ları yapıyor. Prerender
 * edilen <img src>'in istemci build'iyle AYNI content-hash'e düşmesi şart,
 * yoksa sayfada var olmayan bir dosyaya işaret eden görseller kalır.
 *
 * ÜÇ BİLİNÇLİ TERCİH:
 *
 * 1) `renderToStaticMarkup`, `renderToString` DEĞİL. Hydrate etmiyoruz
 *    (gerekçesi src/main.tsx'te), dolayısıyla React'in hydration defteri —
 *    Suspense işaretleyicileri, <template> düğümleri — ölü ağırlık olurdu.
 *    Ayrıca bu satır kararı kendi kendine belgeliyor: ileride biri main.tsx'i
 *    hydrateRoot'a çevirmek isterse burayı da değiştirmek zorunda kalır ve
 *    kararı yeniden düşünür.
 *
 * 2) `StaticRouter` `react-router`'dan alınıyor, `react-router-dom`'dan
 *    DEĞİL. v7 ikisinden de dışa aktarıyor ama react-router-dom'un girişi
 *    `react-router/dom`'u (HydratedRouter) da çekiyor — o tarayıcıya ait
 *    yarısı. SSR için belgelenen giriş `react-router`.
 *
 * 3) `StrictMode` ve `./index.css` BURAYA ALINMIYOR; ikisi de main.tsx'in
 *    işi. CSS <link>'i istemci build'inin ürettiği dist/index.html
 *    kabuğundan geliyor — yani prerender edilmiş sayfa biçimlendirilmiş
 *    geliyor, JS beklemeden.
 *
 * AuthProvider, bu dört rotada kimse tüketmese de main.tsx'le yapısal
 * eşitlik için duruyor: header'a yarın bir "hesabım" bağlantısı eklenirse
 * prerender sessizce patlamasın.
 *
 * NOT: routingMode() sunucuda 'main' dönüyor (host.ts'teki window guard'ı),
 * yani burada üretilen ağaç canlı ANA HOST'un ağacı — prerender etmek
 * istediğimiz ağacın tam olarak kendisi.
 */
export function render(url: string): string {
  return renderToStaticMarkup(
    <StaticRouter location={url}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StaticRouter>,
  );
}
