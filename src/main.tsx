import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

/*
 * AuthProvider BrowserRouter'ın İÇİNDE: sağladığı fonksiyonlar (giriş sonrası
 * yönlendirme gibi) router bağlamına ihtiyaç duyabiliyor.
 *
 * Kök seviyede duruyor çünkü açılışta bir kez /api/auth/me çağrılıyor ve
 * yalnızca portal route'larında sağlanırsa, portala geçişte oturum durumu
 * sıfırdan sorulmak zorunda kalırdı. Anonim ziyaretçi için maliyeti tek bir
 * 401; karşılığında oturum bilgisi tüm uygulamada hazır (header'a "hesabım"
 * eklemek gibi bir sonraki adımlar için de gerekli).
 */
/*
 * NEDEN `createRoot`, `hydrateRoot` DEĞİL?
 * ============================================================================
 * Sayfalar artık prerender ediliyor (scripts/prerender.ts), yani #root sunucudan
 * dolu geliyor. Normalde bunun karşılığı hydrateRoot'tur. Burada bilerek
 * kullanılmıyor:
 *
 * 1) SUNUCU VE İSTEMCİ AĞAÇLARI İKİ ORTAMDA KANITLI OLARAK FARKLI. Sunucu her
 *    zaman 'main' modunda render ediyor (host.ts'teki window guard'ı). Ama
 *    localhost'ta ve HER *.vercel.app önizlemesinde istemcinin routingMode()'u
 *    'both' dönüyor ve maddi olarak farklı bir <Routes> ağacı kuruyor: /panel,
 *    /panel/ogretmen, /panel/yorumlar, /panel/yonetim ekleniyor, host'lar arası
 *    yönlendirme route'ları çıkıyor. hydrateRoot ile bu, her önizleme
 *    dağıtımında garantili bir mismatch demek — yani sorunu ilk fark edeceğiniz
 *    ortam kalıcı olarak bozuk olurdu.
 *
 * 2) KAZANÇ KÜÇÜK, KAYIP DEĞİL. Tek bir pazarlama sayfası; JS zaten form,
 *    ticker ve akordeon için yüklenmek zorunda. Hydration bir re-render
 *    kazandırır, ağ turu değil. Buna karşılık React 19'da mismatch zaten tam
 *    istemci render'ına düşüyor (faydayı tam ihtiyaç anında kaybediyorsunuz),
 *    kötü durumda sayfayı düşürüyor. Canlı ve gelir üreten bir sitede çift
 *    boyama ucuz, beyaz ekran değil.
 *
 * 3) SEO HEDEFİ İKİ DURUMDA DA KARŞILANIYOR. Tarayıcı byte'ları okur; sayfanın
 *    hydrate mi edildiğini yoksa yeniden mi render edildiğini görmez. Bu işin
 *    tamamı zaten o byte'lar için yapıldı.
 *
 * createRoot mount ederken kabın mevcut çocuklarını temizliyor, yani prerender
 * edilmiş DOM atılıyor. Gerçek üretim kullanıcıları için iki taraf aynı markup'ı
 * ürettiğinden bu görsel olarak fark edilmiyor.
 *
 * Bunu değiştirmeden önce entry-server.tsx'teki renderToStaticMarkup notunu da
 * okuyun: ikisi tek bir karar.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
