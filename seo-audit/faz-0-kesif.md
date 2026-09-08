# FAZ 0 — KEŞİF

**Tarih:** 2026-09-07
**Depo:** `akademitu-v1.2` (branch `main`, son commit `267923d`)

---

## 1. Teknoloji tespiti

| Katman | Tespit |
|---|---|
| Framework | **React 19 + Vite 6** — SPA. Next.js / Nuxt / Astro / WordPress **yok**. |
| Router | `react-router-dom` 7 — **client-side routing** (`BrowserRouter`, [main.tsx:9](src/main.tsx#L9)) |
| Render modeli | **%100 CSR.** SSR yok, SSG yok, prerender yok. Tek bir `dist/index.html` üretiliyor; tüm route'lar aynı boş HTML iskeletini alıyor (`<div id="root">` + tek JS bundle). |
| Backend | Express (`server.ts`) — Vercel'de `api/[...path].ts` üzerinden serverless. CLAUDE.md'ye göre prod'da `/api/*` şu an **çalışmıyor** (`FUNCTION_INVOCATION_FAILED`). |
| Stil | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Analytics | `@vercel/analytics` + `@vercel/speed-insights` ([App.tsx:153-154](src/App.tsx#L153-L154)) |
| Deploy | Vercel (`vercel.json`, SPA rewrite `/((?!api/).*) -> /index.html`) |
| Ölü bağımlılık | `@google/genai` paket olarak kurulu ama `src/` veya `server.ts` içinde **hiç çağrılmıyor**. `metadata.json` hâlâ `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API` diyor — AI Studio scaffold kalıntısı. |

---

## 2. Sayfa / route envanteri

Route tanımları tek yerde: [App.tsx:162-167](src/App.tsx#L162-L167).

| # | Route | Bileşen | Satır | Tip |
|---|---|---|---|---|
| 1 | `/` | [HomePage.tsx](src/pages/HomePage.tsx) | 38 | Para sayfası (tek dönüşüm sayfası) |
| 2 | `/gizlilik-politikasi` | [PrivacyPolicyPage.tsx](src/pages/PrivacyPolicyPage.tsx) | 95 | Yasal |
| 3 | `/kullanim-kosullari` | [TermsPage.tsx](src/pages/TermsPage.tsx) | 95 | Yasal |
| 4 | `*` (catch-all) | [NotFoundPage.tsx](src/pages/NotFoundPage.tsx) | 67 | 404 |

**Toplam indekslenebilir sayfa: 3.** (sitemap.xml da 3 URL listeliyor.)

Ana sayfa şu bölümlerden oluşuyor (hepsi tek URL altında, anchor navigasyonlu):
`HeroSection` → `TrustBar` → `PackagesSection` → `WhyUsSection` → `TestimonialsSection` → `FAQSection`
Ek global chrome: `Header`, `Footer`, `PopUpForm`, `MobileLeadSheet`, `KvkkModal`, `TeacherTicker`, sabit WhatsApp/Arayalım butonları, mobil sticky CTA.

Anchor bölüm id'leri: `ana-sayfa`, `paketler`, `neden-biz`, `sss` ([App.tsx:87](src/App.tsx#L87)).

---

## 3. Meta yönetimi nerede?

Dört ayrı katman var ve **hiçbiri route bazında meta üretmiyor**:

1. **[index.html](index.html)** — statik, elle yazılmış. Title, description, keywords, canonical, OG, Twitter card, robots meta, google-site-verification. Tüm route'lara aynı şekilde servis ediliyor.
2. **[need.json](need.json)** — site config'in tek kaynağı; `seo.pages[]` içinde her sayfa için title/description/changefreq/priority var **ama bu veri hiçbir zaman `<head>`'e uygulanmıyor**, sadece sitemap üretiminde kullanılıyor.
3. **[vite.config.ts:16-30](vite.config.ts#L16-L30)** — `transformIndexHtml` ile `{{site.title}}` gibi placeholder'ları değiştiriyor. **Ancak `index.html` içinde tek bir placeholder bile yok** — tüm değerler hardcoded. Bu plugin şu an fiilen no-op.
4. **[scripts/generate-seo.ts](scripts/generate-seo.ts)** — build öncesi `public/sitemap.xml` + `public/robots.txt` yazıyor. `server.ts:130-186` da aynı çıktıyı runtime'da üretiyor (prod'da erişilemez).

**Sayfa başı title:** sadece `document.title = ...` ile, `useEffect` içinde — [PrivacyPolicyPage.tsx:8](src/pages/PrivacyPolicyPage.tsx#L8), [TermsPage.tsx:8](src/pages/TermsPage.tsx#L8), [NotFoundPage.tsx:9](src/pages/NotFoundPage.tsx#L9). Ana sayfa kendi title'ını hiç set etmiyor (index.html'inkini miras alıyor).

**react-helmet / benzeri bir head yöneticisi kurulu değil.** Dolayısıyla: description, canonical, OG etiketleri **her route'ta ana sayfanınkiyle aynı**.

**Structured data:** yalnızca [App.tsx:23-71](src/App.tsx#L23-L71) içinde, `useEffect` ile runtime'da `document.head`'e enjekte edilen 2 JSON-LD bloğu (Organization + WebSite/SearchAction). İlk HTML'de yok.

---

## 4. Erken göze çarpanlar (Faz 0 gözlemi — henüz tam denetim değil)

Bunlar sonraki fazlarda formatlı bulgu olarak işlenecek, şimdilik not:

- **CSR + boş ilk HTML.** `dist/index.html` içinde hiç içerik metni yok. Googlebot render eder ama diğer botlar (Bing, sosyal medya crawler'ları, LLM botları) etmez. Bu Faz 5'in ana konusu olacak.
- **Domain tutarsızlığı:** `index.html` ve `need.json` `https://akademitu.com` (www'suz), [App.tsx:28-50](src/App.tsx#L28-L50) JSON-LD `https://www.akademitu.com` (www'lu). Canonical ile schema çelişiyor.
- **WhatsApp ikonu Google'ın CDN'inden hotlink ediliyor** ([App.tsx:216](src/App.tsx#L216) — `encrypted-tbn0.gstatic.com`). Kırılgan + performans.
- `WebSite`/`SearchAction` şeması tanımlı ama sitede **arama fonksiyonu yok** — spam sinyali riski.
- `favicon.png` **124 KB** (32x32 için). `public/teachers/*.jpg` toplam ~650 KB, hepsi JPEG, WebP yok.
- `robots.txt` içinde `Crawl-delay: 1` var (Google yok sayar), ayrıca `Allow: /public/` gibi bu build'de var olmayan yollar listeleniyor.
- `package.json` adı hâlâ `"react-example"`.
- Blog / içerik sayfası **yok** — organik trafik yüzeyi 1 sayfayla sınırlı.

---

## 5. Ölçülemeyenler

| Ne | Neden | Gereken |
|---|---|---|
| Gerçek Core Web Vitals (saha verisi) | Canlı URL'e erişim ve izin yok | PSI/CrUX erişimi veya Lighthouse çalıştırma izni |
| Canlı `/api/*` durumu | Vercel log erişimi yok | Vercel dashboard |
| Search Console verisi (indekslenme, sorgular) | Erişim yok | GSC hesabı |
| Gerçek indeksleme durumu | Ağ erişimi izni yok | `site:akademitu.com` kontrolü |

---

## 6. Kullanıcı cevapları (2026-09-07)

| Soru | Cevap |
|---|---|
| Hedef anahtar kelimeler | `need.json`'daki liste doğru. Genişletme serbest. |
| Coğrafi hedef | **Yok.** Hizmet %100 online. `need.json`'daki İstanbul/Katar Caddesi adresi sadece işyeri adresi. → **LocalBusiness şeması önerilmeyecek**, yerel SEO kapsam dışı. |
| Canlı URL | **`https://www.akademitu.com`** (www'lu). www'suz adres 301 ile www'luya yönleniyor (kullanıcı doğruladı). |
| Search Console | Bağlı. |
| Onay akışı | Faz faz onay. |
| Öncelikli sayfa stratejisi | **Bekliyor** — Faz 1/6 bu cevaba bağlı. |

### Bu cevaplardan doğan bulgu

**[ÖNEMLİ]** | `need.json:5` → `public/sitemap.xml` (3 URL) + `index.html:20,24,25,35` | Kanonik host www'lu ama sitemap/canonical/og:url www'suz adresi gösteriyor; bu adresler 301'leniyor. GSC'de "Sayfa yönlendirmeli" uyarısı ve boşa tarama bütçesi. JSON-LD (`App.tsx:28-50`) ise www'lu — kod içinde iki farklı doğru var. | `need.json.site.domain` → `https://www.akademitu.com`; `index.html`'deki hardcoded canonical/og:url/twitter:url eşitlensin.
