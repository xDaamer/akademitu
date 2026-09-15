# UYGULANAN DÜZELTMELER

**Tarih:** 2026-09-07 · **Doğrulama:** `tsc --noEmit` temiz, `npm run build` başarılı, yerel build üzerinde Lighthouse + axe-core + tarayıcı DOM kontrolleri.

> Bu dosya, [00-ozet.md](00-ozet.md)'deki bulguların hangilerinin koda uygulandığını gösterir. Faz raporları denetim anındaki durumu belgeler ve **değiştirilmemiştir**.

---

## 1. Ölçülen sonuç

| Metrik (mobil) | Öncesi (canlı) | Sonrası (yerel build) |
|---|---|---|
| Performans skoru | 82 | **93** |
| SEO skoru | 100 | 100 |
| Erişilebilirlik | ölçülmedi | **100** |
| Best practices | ölçülmedi | 96 |
| **LCP** | 3.8 s | **2.9 s** |
| FCP | 2.6 s | 2.0 s |
| Speed Index | 4.8 s | 2.0 s |
| TBT | 80 ms | 2 ms |
| CLS | 0 | 0 |
| **Sayfa ağırlığı** | 936 KB | **464 KB** |
| axe-core ihlali | 1 | **0** (25 kural geçiyor) |
| 44px altı dokunma hedefi | 10 | **0** |

**LCP kırılımı:** resource load delay 884 ms → **11 ms** (preload çalıştı), TTFB 219 ms → 9 ms.

> ⚠️ **Ölçüm koşulu farkı:** Sonuçlar `vite preview` ile **yerel** build üzerinde alındı; TTFB burada ~10 ms, canlı Vercel'de ~219 ms'ti. Canlıda LCP'nin ~3.1 s civarında çıkması beklenir — hâlâ 2.5 s eşiğinin üstünde. Kalan gecikmenin tamamı "element render delay", yani CSR mimarisi (K-01). Deploy sonrası yeniden ölçüm şart.
>
> Skorlar üç tekrarın medyanıdır (93 / 2.9 s / 2 ms); tek koşuda 88–94 arası oynama görüldü.

---

## 2. Kapatılan bulgular

### KRİTİK

| # | Bulgu | Ne yapıldı |
|---|---|---|
| **K-01** | **Her route boş HTML döndürüyordu** — `<div id="root"></div>`, sıfır H1/H2/iç link/JSON-LD. Denetimin en yüksek etkili tek bulgusu ve K-02 ile K-03'ün de kök nedeni. | **2026-09-15 — prerender.** `vite build --ssr` + yeni [prerender.ts](../scripts/prerender.ts) rotaları statik HTML'e basıyor. Ana sayfa 6 391 B → 62 431 B; h1 0→1, h2 0→4, h3 0→16, iç link 0→15, JSON-LD 0→4. Ayrıntı: [faz-5](faz-5-taranabilirlik.md) K-01 çözüm notu. |
| **K-02** | Alt sayfalar ana sayfanın canonical'ını miras alıyordu | Yeni [PageMeta.tsx](../src/components/PageMeta.tsx): her route kendi canonical/description/robots/OG etiketlerini "upsert" ediyor. Doğrulandı: `/gizlilik-politikasi` → tek canonical, `.../gizlilik-politikasi` |
| **K-03** | Üç sayfa aynı meta description'ı paylaşıyordu | Aynı bileşen; `need.json`'daki sayfa açıklamaları artık gerçekten kullanılıyor |
| **K-04** | Canonical/sitemap www'suz, canlı site www'lu | `need.json.site.domain` → `https://www.akademitu.com`. Sitemap, robots.txt, canonical, OG, JSON-LD hepsi tek kaynaktan |
| **K-05** | `server.ts`'te ölü `/sitemap.xml` + `/robots.txt` ikizleri | Kaldırıldı. Tek kaynak: `need.json` → `scripts/generate-seo.ts` → `public/` |
| **K-06** | LCP'de 884 ms "resource load delay" | `index.html`'e `imagesrcset`'li preload. **884 ms → 11 ms** |
| **K-07 / K-08** | 7 fotoğraf 637 KB, modern format/srcset/lazy yok | Yeni [generate-images.ts](../scripts/generate-images.ts) `sharp` ile 400w/800w WebP üretiyor (`predev` + `prebuild`). `<picture>` + `srcset` + `sizes` + `loading`. Mobilde 637 KB → **193 KB** |
| **K-12** | `Service` üzerinde geçersiz `price`/`priceSpecification` | `offers: { @type: Offer }` sarmalayıcısına taşındı |
| **K-13** | İki hizmet aynı `@id`'yi paylaşıyordu | `#deneme-dersi` / `#ozel-ders-paketi` / `#kocluk-programi` |
| **K-14** | `SearchAction` var olmayan aramayı işaretliyordu | Silindi. `WebSite` şeması `@id` + `publisher` ile kaldı |
| **K-15** | `özel ders` baş terimi hedefteydi | `need.json` kelime listesi uzun kuyruğa çevrildi |

### ÖNEMLİ / İYİLEŞTİRME

| Konu | Ne yapıldı |
|---|---|
| Title 79 karakter | 56 karakter: `YKS ve LGS Koçluğu \| Derece Hocalarıyla Online Özel Ders` |
| Description'da tanımsız "başarı garantisi" | Somut ve doğrulanabilir metinle değiştirildi (fiyat + taahhütsüz deneme) |
| `og:image` 512×512 kare | 1200×630 [og-image.png](../public/og-image.png) üretildi + `width`/`height`/`alt` |
| `twitter:*` `property=` ile yazılmıştı | `name=` oldu, `twitter:site` eklendi |
| `meta name="title"` / `keywords` / `language` | Silindi (standart dışı veya Google'ın yok saydığı) |
| Vite `seo-html-transform` plugin'i ölü koddu | `index.html` artık `{{site.*}}` placeholder'larını kullanıyor — plugin canlandı, iki kaynak tekleşti |
| Font 6 ağırlık + render blokaj | 3 ağırlık (400/600/800) + `media="print"` asenkron yükleme + `noscript` yedeği. Blokaj 480 ms → 150 ms |
| Bundle'ın %58'i kullanılmıyordu | `PopUpForm` + `KvkkModal` `React.lazy` ile ayrı parçaya (33 KB) alındı |
| `@google/genai` hiç çağrılmıyordu | `package.json`'dan kaldırıldı |
| **Uydurma hoca profilleri** (`DEFAULT_TEACHERS`) | `config.ts`'ten ve `teacherLoader.ts` dosyasından tamamen silindi — gerekçe kodda yorumla belgelendi |
| `CAMPAIGN_DEADLINE`, `BRAND_COLORS`, `getTeacherList` ölü koddu | Silindi |
| H1'de hedef ifade yoktu | `Derece Hocalarıyla YKS ve LGS Koçluğu ve Birebir Özel Ders` |
| 4 H2'nin hiçbirinde hedef kelime yoktu | Dördü de güncellendi |
| `özel ders` ilk 100 kelimede yoktu | Hero maddesi `YKS & LGS Birebir Özel Ders` — doğrulandı ✅ |
| 6 SSS sorusu `<span>`'di | `<h3><button>` kalıbına alındı |
| Footer H4'leri seviye atlıyordu (H2→H4) | H3 oldu — sayfada artık `h4` yok |
| `TrustBar` başlıksız `<section>` | `sr-only` H2 + `aria-labelledby` |
| Header menüsü `<button>`, taranabilir değildi | `<a href="#...">` (masaüstü + mobil menü) |
| Footer bölüm bağlantıları yasal sayfalarda çalışmıyordu | `<Link to={{pathname:'/', hash:'#paketler'}} state={{scrollTo}}>` — hem her sayfadan çalışıyor hem `/#paketler` href'i üretiyor |
| "Programlarımız" listesi hiçbir yere bağlanmıyordu | Beşi de ilgili bölüme bağlandı |
| Yasal sayfalar birbirine bağlanmıyordu | Karşılıklı bağlantı + breadcrumb + `BreadcrumbList` şeması ([LegalPageChrome.tsx](../src/components/LegalPageChrome.tsx)) |
| "Son güncelleme" elle yazılmış ve eskiydi | `need.json.legal.lastUpdated`'dan okunuyor (git geçmişine göre 21.08.2026) |
| 404 → 200 + `index, follow` | `noindex, follow` + canonical yayınlanmıyor |
| Form input'ları 14px (iOS otomatik yakınlaştırma) | `text-base` (16px) — 5 alan |
| 10 adet 44px altı dokunma hedefi | **0** — doğrulandı ✅ |
| `v2.0.0` kontrastı 2.82:1 (tek axe ihlali) | `text-slate-400` — axe artık **0 ihlal** |
| `alt="akademITU Logo"` | `alt="akademITU"` + `width`/`height` |
| WhatsApp ikonu Google CDN'inden hotlink | Satır içi SVG ([WhatsAppIcon.tsx](../src/components/ui/WhatsAppIcon.tsx)) — sıfır ağ isteği |
| `favicon.png` `sizes="32x32"` yanlış beyan | `sizes="512x512"` (dosyanın gerçeği) |
| `robots.txt`'te var olmayan yollar + `Crawl-delay` | Sadeleştirildi; tek anlamlı kural `Disallow: /api/` |
| `Organization` eksik ve bağlantısızdı | `EducationalOrganization` + `@id` + `contactPoint` + `streetAddress` + Twitter `sameAs` + E.164 telefon |
| `ItemList` ögeleri `ListItem` değildi | `ListItem` + `position` |
| `unitCode: "H27"` doğrulanamıyordu | `unitText: "ders"` |
| `apple-mobile-web-app-capable` kullanımdan kalkmış | `mobile-web-app-capable` eklendi |
| Telefon numarası tıklanabilir değildi | `tel:+905303699539` |
| Yorumlar bölümü çapalanamıyordu | `id="yorumlar"` |

---

## 3. UYGULANMAYANLAR — ve neden

Bunlar rapordaki gerçek bulgular; **kasıtlı olarak bırakıldılar** çünkü ya sizin sahip olduğunuz veriyi gerektiriyorlar ya da mimari/ticari karar.

### Bende olmayan bilgi gerektirenler — **uydurmak zarar verirdi**

| # | Bulgu | Neden yapmadım | Sizin yapmanız gereken |
|---|---|---|---|
| **K-10** | Yorumlar bölümü canlıda hiç render olmuyor | Supabase `testimonials` tablosu boş. Yorum **uydurmak**, denetimde uydurma hoca profillerini riskli bulup sildiğim şeyin aynısı olurdu | Supabase'e gerçek yorumları girin (`is_published = true`). Kod hazır ve çalışıyor |
| **K-11** | "Derece hocalarımız" iddiasının kanıtı yok | 7 hocanın gerçek adını, bölümünü ve derecesini bilmiyorum. Uydurmak tam da sildiğim riskin kendisi | Her fotoğraf için ad + bölüm + derece verin; `types.ts`'teki `Teacher` arayüzü alanları zaten tanımlı. Sonra `alt` metinleri de içerik taşımalı |
| **K-09** | Ana sayfa 363 kelime — ince içerik | "Nasıl çalışıyor", ödeme/iptal/iade koşulları, hoca seçim süreci, platform detayı — hiçbirini bilmiyorum. Yazsaydım gerçek olmayan bilgi üretmiş olurdum | "Nasıl Çalışıyor?" bölümü + sınav odaklı SSS soruları. Hedef 900-1200 kelime |
| — | "Başarı garantisi" tanımsız | Garantinin kapsamı ticari bir karar | Kapsamı yazın ya da ifadeyi değiştirin. **Not:** description'dan çıkardım, ancak [PackagesSection.tsx](../src/components/PackagesSection.tsx)'te paket kartında hâlâ duruyor |
| — | Künye yok (ticaret unvanı, vergi no, e-posta) | Bu bilgiler bende yok | Footer'a ekleyin |

### Mimari / dış erişim gerektirenler

| # | Bulgu | Neden yapmadım |
|---|---|---|
| **K-01** | Her route boş HTML döndürüyor (CSR) | **En yüksek etkili kalan bulgu.** Prerender build hattı kurmak mimari bir karar ve tüm route davranışını etkiler; onayınız olmadan girmedim. Kalan LCP gecikmesinin tamamı burada |
| ~~**K-05 (2. yarı)**~~ | ~~`/api/health` 500 dönüyor~~ | ✅ **2026-09-08'de çözüldü** — Vercel logları paylaşıldıktan sonra. Bkz. § 6 |
| — | `http://akademitu.com` 2 atlamalı zincir | Vercel domain panelinden yapılır, kodda değil |
| — | Logo SVG'ye çevrilsin, 3 kopya tekilleşsin | Vektör kaynak dosyası bende yok |
| — | 32×32 gerçek favicon | 512×512'den küçültmek yerine ikon olarak tasarlanmış bir sürüm gerekir; `sizes` beyanını gerçeğe uydurdum |

---

## 4. Dikkat edilecek üç bakım noktası

1. **Preload ↔ config senkronu:** `index.html`'deki preload satırı `public/teachers/config.json` → `activeImagesLeft[0]` ile aynı dosyayı göstermeli. Listeyi değiştirirseniz o satırı da güncelleyin (ikisinde de yorum var).
2. **WebP varyantları build çıktısıdır:** `predev`/`prebuild` üretiyor, `.gitignore`'da. Yeni hoca fotoğrafı için sadece `.jpg` eklemeniz yeterli. **Varyant üretimi atlanırsa `<picture>` `<source>` 404 verir ve görsel `<img>`'e geri düşmez, tamamen kırılır.**
3. **`need.json` gerçekten tek kaynak oldu:** domain, başlık, açıklama, kelimeler, yasal tarih — hepsi oradan. Kod içinde `https://www.akademitu.com` yazmayın, `SITE_URL` kullanın.

---

## 5. Deploy sonrası yapılacaklar

- [ ] GSC → Sitemap'i yeniden gönder (artık www'lu)
- [ ] GSC → URL Denetimi → `/gizlilik-politikasi` → canonical'ın kendisini gösterdiğini doğrula
- [ ] Rich Results Test → `Service`/`Offer`, `FAQPage`, `BreadcrumbList` şemalarını doğrula
- [ ] Canlıda Lighthouse'u tekrar çalıştır (gerçek TTFB ile LCP'yi ölç)
- [ ] X Card Validator + WhatsApp ile yeni OG görselini test et
- [ ] Vercel → `http://akademitu.com` için tek atlamalı yönlendirme kur


---

## 6. `/api/*` 500 hatası — teşhis ve düzeltme (2026-09-08)

Vercel runtime logları paylaşıldıktan sonra sebep kesinleşti. **Faz 5 ve Faz 7'de öne sürdüğüm hipotezlerin hiçbiri doğru değildi** (tsconfig, `vite` bağımlılığı, bundle boyutu, cold-start istisnası). Gerçek sebep tek satırlık bir modül specifier hatasıydı.

### Bulunan hata

```
ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'
imported from /var/task/api/[...path].js
url: 'file:///var/task/server'          ← uzantı yok
```

[api/[...path].ts](../api/) `import app from "../server"` yazıyordu — **uzantısız**. `package.json`'da `"type": "module"` olduğu için Vercel bu dosyayı ESM olarak derleyip çalıştırıyor ve Node'un ESM çözümleyicisi, CommonJS'in aksine, uzantı tahmin etmez. Fonksiyon daha ilk satırda, hiçbir route'a girmeden çöküyordu — `GET /api/health`'in bile 500 dönmesinin sebebi buydu.

Bu, CLAUDE.md'de belgelenen "`vite`'ı import grafiğine sokma" tuzağından **bağımsız** bir hatadır; o kısıt hâlâ geçerli.

### Doğrulama yöntemi

Vercel'i yerelde taklit ettim: `server.ts` ve `api/[...path].ts` esbuild ile ESM `.js`'e derlendi, aynı göreli yerleşime kondu, `"type":"module"` verildi ve modül import edildi.

| Aşama | Sonuç |
|---|---|
| Düzeltme öncesi | `ERR_MODULE_NOT_FOUND: .../vercel-sim/server` — **canlıdaki hatanın birebir aynısı** |
| Düzeltme sonrası | `✅ modül yüklendi, handler tipi: function` |
| Handler çağrıldığında | `/api/health` **200**, `/api/config` **200**, `/api/testimonials` **200** |

### İkinci bulgu — doğrulama sırasında ortaya çıktı

İlk başarılı çalıştırmada `/api/config` **boş nesne** döndü:

```
[Server API] Failed to read need.json: ENOENT
/api/config → {"site":{},"contact":{},"social":{}}
```

`server.ts`, `need.json`'ı `readFileSync(process.cwd() + "/need.json")` ile okuyor. Vercel'in dosya izleyicisi (nft) yalnızca **statik import**'ları takip eder; çalışma anında kurulan bir yolu göremez, dolayısıyla `need.json` fonksiyon paketine hiç girmiyordu. Yani import hatası düzeltilse bile `/api/config` bozuk kalacaktı.

`vercel.json`'a eklendi:

```json
"functions": { "api/**": { "includeFiles": "need.json" } }
```

`need.json` pakete konduktan sonra `/api/config` gerçek veriyi döndürüyor. Gerekçe `server.ts` içinde okuma satırının başına yorum olarak da yazıldı — o satır silinirse burası sessizce boş nesneye düşer.

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| [api/[...path].ts](../api/) | `"../server"` → `"../server.js"` + gerekçe yorumu |
| [dev-server.ts](../dev-server.ts) | Aynı biçime hizalandı (tsx uzantısızı da çözerdi; amaç hatanın tekrar sessizce girmemesi) |
| [vercel.json](../vercel.json) | `functions.api/**.includeFiles` |
| [server.ts](../server.ts) | `readFileSync` satırına Vercel tracing notu |
| [CLAUDE.md](../CLAUDE.md) | "teşhis konulamadı" ifadeleri gerçek sebeple değiştirildi |

### ⚠️ Doğrulanmamış olan

Bunlar **yerelde** doğrulandı, **canlı deploy'da değil**. Deploy sonrası şunlar kontrol edilmeli:

- [ ] `curl https://www.akademitu.com/api/health` → `{"status":"ok","supabaseConfigured":true}` (`true` olmalı — Vercel'de env değişkenleri var)
- [ ] `curl https://www.akademitu.com/api/config` → dolu `site` nesnesi (boşsa `includeFiles` çalışmamıştır)
- [ ] Vercel Logs → `ERR_MODULE_NOT_FOUND` kaydı gelmiyor

### Not: `/api/*` hâlâ kullanılmıyor

Fonksiyon artık çalışıyor ama frontend ona bağlı değil — lead formu ve yorumlar Supabase'e doğrudan gidiyor, `robots.txt`/`sitemap.xml` statik. Yani bu düzeltme **SEO açısından bir şey değiştirmez**; kırık altyapıyı ve "çalışıyor sanılan ölü kod" durumunu ortadan kaldırır. `/api/*`'ı tamamen silme seçeneği hâlâ masada.

---

## 3. 2026-09-15 — dış denetim aracının bulguları

Bir dış SEO denetim aracı yedi bulgu raporladı. Altısı tek kök nedene, K-01'e
iniyordu: sunucudan gelen HTML boştu, dolayısıyla araç H1'i, başlık yapısını,
iç linkleri ve structured data'yı göremiyordu — hepsi React kaynağında vardı.

| Rapor edilen bulgu | Durum |
|---|---|
| H1 yok | ✅ K-01 (prerender) — ana sayfada 1 H1 |
| Başlık yapısı bozuk / H2–H6 red-flag | ✅ K-01 — ana sayfada 4 H2 + 16 H3 |
| Çok az iç link | ✅ K-01 — 0 → 15 |
| Title içerikle uyuşmuyor | ✅ K-01 — her rota kendi title/canonical'ını ilk byte'ta taşıyor |
| Structured data yok | ✅ JSON-LD `useEffect`'ten JSX'e taşındı — 4 blok statik HTML'de |
| Meta description çok uzun | ⚠️ Rapor yanılıyor: ana sayfa 139 karakter, pencere içinde. **Asıl sorun tersiydi** — gizlilik 55, kullanım koşulları 45 karakterle çok kısaydı; ikisi de yeniden yazıldı (142 / 145) |
| hreflang yok | ⚠️ Yanlış pozitif ama karşılandı. Tek dil, tek pazar; kendine referans veren `tr` + `x-default` çifti eklendi. Gerçek SEO değeri yok, gerekçe kodda yazılı |

**Blog başlık hiyerarşisi.** "Başlıklar aşırı kullanılmış, seviye atlanmış"
bulgusunun ikinci kaynağı bloğdu: 10 yazının hepsi düz bir H2 listesiydi,
H3 hiç yoktu (11–24 arası H2). Gerçekten alt başlık olan bölümler H3'e indirildi;
dört yazıda bir üst başlık eklendi.

| Yazı | Önce | Sonra |
|---|---|---|
| ozel-ders-mi-kurs-mu | 12 H2 | 7 H2 + 5 H3 |
| sinav-doneminde-veli-ne-yapmali | 11 H2 | 8 H2 + 3 H3 |
| sinav-kaygisi-nasil-yenilir | 13 H2 | 10 H2 + 4 H3 |
| konu-tekrari-nasil-yapilir | 14 H2 | 9 H2 + 5 H3 |
| deneme-analizi-nasil-yapilir | 14 H2 | 10 H2 + 5 H3 |
| haftalik-calisma-programi | 15 H2 | 8 H2 + 8 H3 |
| yks-hazirlik-rehberi | 19 H2 | 11 H2 + 8 H3 |
| egitim-koclugu-nedir | 23 H2 | 14 H2 + 9 H3 |
| verimli-ders-calisma-rehberi | 24 H2 | 15 H2 + 10 H3 |
| lgs-hazirlik-rehberi | 24 H2 | 18 H2 + 7 H3 |
| **toplam** | **169 H2** | **110 H2 + 64 H3** |

Üç not:

1. **Başlık metinleri değişmedi**, yalnızca seviyeleri. Çapa `id`'leri metinden
   türediği için hiçbir `#bölüm` adresi kırılmadı; yazıların içinde çapa linki
   de yok (kontrol edildi).
2. **Altyapı zaten hazırdı ve kullanılmıyordu.** `blog.css`'te `.toc-3` ve
   `.govde h3` stilleri, `markdown.ts`'te TOC'un H3'ü de alması — üçü de
   yazılmış ama hiç H3 üretilmediği için ölü duruyordu.
3. **İçerik sırası bilinçli olarak korundu**, tek istisna dışında:
   `deneme-analizi`de "Adım 5" diğer dört adımdan üç bölüm sonra duruyordu ve
   sıraya alındı. `lgs-hazirlik-rehberi` ve `egitim-koclugu-nedir` bu yüzden
   hâlâ başlık yoğun — daha fazla azaltmak bölümleri yeniden sıralamayı
   gerektirirdi, o da başlık düzeltmesi değil içerik revizyonu olurdu.
