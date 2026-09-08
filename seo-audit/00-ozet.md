# akademITU — SEO DENETİMİ ÖZET RAPORU

**Tarih:** 2026-09-07 · **Site:** https://www.akademitu.com · **Denetlenen:** 3 sayfa + 404
**Strateji:** Tek landing page (kullanıcı kararı) · Hizmet %100 online, coğrafi hedef yok
**Durum:** Denetim tamamlandı. **Hiçbir dosya değiştirilmedi.**

| Faz | Rapor | KRİTİK | ÖNEMLİ | İYİLEŞTİRME |
|---|---|---|---|---|
| 0 | [Keşif](faz-0-kesif.md) | — | 1 | — |
| 1 | [Arama niyeti](faz-1-arama-niyeti.md) | 2 | 4 | 3 |
| 2 | [Title / meta / URL](faz-2-title-meta-url.md) | 3 | 4 | 6 |
| 3 | [Başlık hiyerarşisi](faz-3-baslik-hiyerarsisi.md) | 0 | 3 | 4 |
| 4 | [Core Web Vitals](faz-4-core-web-vitals.md) | 2 | 3 | 3 |
| 5 | [Taranabilirlik](faz-5-taranabilirlik.md) | 2 | 3 | 3 |
| 6 | [İç link mimarisi](faz-6-ic-link-mimarisi.md) | 0 | 3 | 2 |
| 7 | [Structured data](faz-7-structured-data.md) | 3 | 4 | 4 |
| 8 | [Mobil uyumluluk](faz-8-mobil-uyumluluk.md) | 0 | 3 | 1 |
| 9 | [İçerik & E-E-A-T](faz-9-icerik-kalitesi-eeat.md) | 3 | 4 | 2 |
| 10 | [Görsel & erişilebilirlik](faz-10-gorsel-erisilebilirlik.md) | 1 | 2 | 5 |
| | **TOPLAM** | **16** | **34** | **33** |

---

> ✅ **Bu bulguların çoğu 2026-09-07'de koda uygulandı.**
> Neyin yapıldığını, neyin bilerek bırakıldığını ve ölçülen sonucu
> [01-uygulanan-duzeltmeler.md](01-uygulanan-duzeltmeler.md) gösterir.
> Aşağıdaki rapor **denetim anındaki** durumu belgeler, güncellenmemiştir.

## 1. Genel değerlendirme

Bu, teknik kalitesi beklenenin **üzerinde** ama arama motorlarına neredeyse hiçbir şey anlatamayan bir site.

**Güçlü yanlar (korunmalı):** CLS = 0 · masaüstü performansı 97 · axe-core 24/25 erişilebilirlik kuralı geçiyor · fiyatlar açıkça yazılı · uydurma istatistik yok · URL yapısı kusursuz · `prefers-reduced-motion`, odak halkaları, honeypot gizleme gibi detaylar doğru yapılmış.

**Temel sorun tek cümlede:** Sunucu her URL için **birebir aynı, içeriği boş HTML** döndürüyor. Bu tek gerçek, 16 KRİTİK bulgunun 6'sının doğrudan kök nedeni.

**İkinci sorun:** Sitede yeterli içerik yok. Ana sayfa **363 kelime** ve değer önerisinin ("derece yapmış hocalar") tek bir kanıtı bulunmuyor.

---

## 2. TÜM KRİTİK BULGULAR

### A. Mimari — "sunucu içerik döndürmüyor"

**K-01 · Her route birebir aynı boş HTML'i döndürüyor** — [main.tsx:7](src/main.tsx#L7), [vercel.json](vercel.json)
Canlıda doğrulandı: `/` ve `/gizlilik-politikasi` **byte-byte aynı** (3581 byte), `<body>` içinde `<div id="root"></div>` dışında hiçbir şey yok. Googlebot render eder ama gecikmeli; Bing, Yandex, sosyal önizleme ve LLM tarayıcıları için site **tamamen boş**. → *Faz 5*

**K-02 · Alt sayfalar ana sayfanın canonical'ını miras alıyor** — [index.html:20](index.html#L20)
Canlıda doğrulandı: `/gizlilik-politikasi` sayfasının canonical'ı `https://akademitu.com/`. Yani her iki yasal sayfa Google'a "ben ana sayfayım" diyor; sitemap'te listeli olmalarına rağmen indeksten düşerler. → *Faz 2*

**K-03 · Üç sayfa da aynı meta description'ı paylaşıyor** — [index.html:17](index.html#L17)
Canlıda doğrulandı: yasal sayfa SERP'te "YKS ve LGS hazırlık... Başarı garantili çalışma programı" açıklamasıyla görünüyor. → *Faz 2*

**K-04 · Kanonik host çelişkisi: canonical/sitemap/robots www'suz, canlı site www'lu** — [need.json:5](need.json#L5)
Sitemap'in **3 URL'inin 3'ü de** 308 ile yönlenen adresler. JSON-LD ise www'lu — kodda iki farklı doğru var. → *Faz 2, 5*

**K-05 · `/api/health` canlıda 500 dönüyor — sunucu tarafının tamamı kırık** — [api/](api/), [server.ts](server.ts)
`server.ts`'teki dinamik `/sitemap.xml` ve `/robots.txt` route'ları hiç çalışmıyor; aynı işi yapan iki kod yolu var, biri ölü. → *Faz 5*

### B. Performans ve görseller

**K-06 · Mobil LCP 3.8 s; gecikmenin ~1.9 saniyesi doğrudan CSR'dan** — [TeacherTicker.tsx:541](src/components/TeacherTicker.tsx#L541)
LCP elementi H1 değil, `/teachers/dila.jpg`. Kırılım: resource load delay 884 ms + element render delay 1041 ms. Preload scanner görseli bulamıyor çünkü `<img>` etiketi 202 KB'lık bundle çalışana kadar yok. → *Faz 4*

**K-07 · 7 hoca fotoğrafı 639 KB — sayfa ağırlığının %73'ü israf** — [public/teachers/](public/teachers/)
Lighthouse **681 KB tasarruf** hesaplıyor. → *Faz 4*

**K-08 · Görsellerde modern format, `srcset` ve `lazy` — üçü de yok**
17 görselin 0'ında `srcset`, 0'ında `loading="lazy"`. WebP/AVIF/SVG: sıfır dosya. `sharp` **zaten kurulu ve hiç kullanılmıyor**. → *Faz 10*

### C. İçerik ve güven

**K-09 · Ana sayfa 363 kelime — ticari sorguda yarışmak için fazlasıyla ince**
Canlıda ölçüldü (`<main>` içi). Koçluk süreci, ders akışı, ödeme/iptal koşulları, hoca seçimi — hiçbiri sayfada yok. → *Faz 9*

**K-10 · Yorumlar bölümü canlıda hiç render olmuyor — sosyal kanıt tamamen yok** — [TestimonialsSection.tsx:157](src/components/TestimonialsSection.tsx#L157)
Canlıda doğrulandı: ana sayfada 4 değil **3 H2** var; `Velilerimizin Görüşleri` DOM'da yok. Supabase boş dönüyor, kod `return null` yapıp bölümü sessizce yok ediyor. → *Faz 9*

**K-11 · "Derece yapmış hocalar" iddiasının tek bir kanıtı yok** — [TeacherTicker.tsx:547](src/components/TeacherTicker.tsx#L547)
7 anonim fotoğraf: isim yok, derece yok, üniversite yok, `alt=""`. E-E-A-T'nin üç harfi tam olarak bu bilgiye dayanıyor. `types.ts`'deki `Teacher` arayüzü bu alanları **zaten tanımlıyor**, sadece gösterilmiyor. → *Faz 9*

### D. Yapılandırılmış veri

**K-12 · `Service` üzerinde `price`/`priceSpecification` kullanılmış — geçersiz** — [PackagesSection.tsx:26](src/components/PackagesSection.tsx#L26)
Fiyat `offers: {@type:"Offer"}` içine girmeli. Google mevcut alanları **yok sayıyor** — sitenin en güçlü ticari sinyali yapılandırılmış veri olarak hiç iletilmiyor. → *Faz 7*

**K-13 · İki farklı hizmet aynı `@id`'yi paylaşıyor** — [PackagesSection.tsx:19,31](src/components/PackagesSection.tsx#L19)
`#ozel-ders` iki kez kullanılmış; ayrıştırıcı ikisini tek varlık sanar. Üstelik `#ozel-ders` ve `#kocluk` çapaları sayfada mevcut değil. → *Faz 7*

**K-14 · `SearchAction` şeması var olmayan bir arama fonksiyonunu tanımlıyor** — [App.tsx:46-53](src/App.tsx#L46-L53)
Sitede arama kutusu yok, `?q=` işleyen kod yok. "Var olmayan işlevi işaretleme" politika ihlali riski. → *Faz 7*

### E. Anahtar kelime hedefleme

**K-15 · `özel ders` baş terimi hedef listede** — [need.json:8](need.json#L8)
Piyano, İngilizce, sürücü kursu dahil onlarca dikeyi kapsayan, kurumsal sitelerin tuttuğu terim. 3 sayfalık site burada sıralanamaz. → *Faz 1*

**K-16 · `TYT koçu` / `AYT koçu` hedefleniyor ama bu kelimeler taranabilir metinde hiç geçmiyor** — [PopUpForm.tsx:37-60](src/components/PopUpForm.tsx#L37-L60)
Yalnızca kapalı pop-up'ın ders listesinde varlar; pop-up kapalıyken DOM'a hiç basılmıyor. → *Faz 1*

---

## 3. Etki / efor matrisi

### 🟢 HEMEN YAP — Yüksek etki, düşük efor

| # | Aksiyon | Etki | Efor |
|---|---|---|---|
| 1 | `need.json.site.domain` → `https://www.akademitu.com` | K-04 tamamen çözülür (sitemap + robots birlikte) | **1 satır** |
| 2 | `index.html`'e LCP görseli için `<link rel="preload" as="image">` | LCP'de ~800 ms | **1 satır** |
| 3 | Supabase `testimonials` tablosuna gerçek yorumları gir | K-10 çözülür, sosyal kanıt geri gelir | Kod yok, veri girişi |
| 4 | `<title>` 79 → 56 karakter, description'ı yeniden yaz | Marka SERP'te görünür olur | Metin |
| 5 | `loading={priority ? 'eager' : 'lazy'}` | ~200 ms + bant genişliği | **1 satır** |
| 6 | Şema düzeltmeleri: `offers` sarmalayıcısı, benzersiz `@id`, `SearchAction` sil | K-12/13/14 | ~30 satır |
| 7 | `meta name="title"`, `keywords`, `language` sil | Gürültü + strateji ifşası | Silme |
| 8 | Form input'larını 16 px yap (iOS otomatik yakınlaştırma) | Dönüşüm yolundaki hata | 1 sınıf |
| 9 | `robots.txt` sadeleştir, `Crawl-delay` sil | Okunabilirlik | Metin |
| 10 | Ölü kod sil: `DEFAULT_TEACHERS`, `getTeacherList`, `@google/genai` | Uydurma hoca profili riski + bundle | Silme |

### 🟡 SONRAKİ ADIM — Yüksek etki, orta efor

| # | Aksiyon | Etki |
|---|---|---|
| 11 | **Route bazlı `<head>` yönetimi** (React 19 yerel destek, ek paket yok) | **K-02 + K-03 + 404 `noindex`** tek seferde |
| 12 | **Görsel pipeline: WebP + `srcset` (`sharp` zaten kurulu)** | **K-07 + K-08**, ~400 ms LCP, 681 KB |
| 13 | **İçeriği 900-1200 kelimeye çıkar** ("Nasıl Çalışıyor?" + genişletilmiş SSS) | **K-09 + K-16**, bilgisel niyet boşluğu |
| 14 | **Hoca kartlarına isim/derece/bölüm ekle** | **K-11**, E-E-A-T'nin tek kaynağı |
| 15 | H1 ve 4 H2'ye hedef kelimeleri doğal biçimde yerleştir | Alaka sinyali |
| 16 | Footer künye: e-posta, ticaret unvanı, tam adres | Güven + mevzuat |

### 🔵 MİMARİ KARAR — En yüksek etki, en yüksek efor

| # | Aksiyon | Etki |
|---|---|---|
| 17 | **Prerender** (build sırasında 3 route'u statik HTML'e bas) | **K-01**, ve K-06'nın kalan yarısı. 11 ve şemaların statikleşmesi de kendiliğinden çözülür. |
| 18 | Vercel fonksiyonunu onar **veya** `/api/*`'ı tamamen kaldır | K-05 |

### ⚪ DÜŞÜK ÖNCELİK
Footer H4→H3 · breadcrumb + `BreadcrumbList` · header nav `<button>`→`<a href>` · footer "Programlarımız" listesini bağla · favicon 32×32 · logo SVG'ye · WhatsApp ikonunu yerelleştir · dokunma hedeflerini 44 px'e çıkar · `v2.0.0` kontrastı · `alt="akademITU Logo"` → `alt="akademITU"` · skip link

---

## 4. İlk 2 hafta — somut aksiyon planı

### Hafta 1

**Gün 1 — Tek oturumda bitecek düzeltmeler (~2 saat)**
- [ ] `need.json` domain'i www'lu yap → `npm run build` → sitemap ve robots.txt'i doğrula
- [ ] `index.html`: title'ı kısalt, description'ı yeniden yaz, canonical/og:url/twitter:url'i www'lu yap
- [ ] `index.html`: `meta name="title"`, `keywords`, `language` sil; `twitter:*` `property=` → `name=`; `og:site_name` + `og:image:alt` ekle
- [ ] `index.html`: LCP görseli için `preload` ekle
- [ ] `robots.txt` şablonunu sadeleştir (`Crawl-delay` ve var olmayan yolları çıkar)
- [ ] Vercel: `http://akademitu.com` için tek atlamalı yönlendirme kur

**Gün 2 — Şema ve ölü kod (~2 saat)**
- [ ] `PackagesSection.tsx`: fiyatları `offers` içine al, `@id`'leri benzersizleştir, `unitCode:"H27"` → `unitText:"ders"`
- [ ] `App.tsx`: `SearchAction` bloğunu sil; `Organization`'a `@id`, `contactPoint`, `streetAddress`, Twitter `sameAs` ekle; tipi `EducationalOrganization` yap
- [ ] `config.ts` / `teacherLoader.ts`: `DEFAULT_TEACHERS` + `getTeacherList` sil (uydurma derece iddiaları riski)
- [ ] `package.json`: `@google/genai` kaldır

**Gün 3 — Veri ve mobil (~2 saat)**
- [ ] **Supabase `testimonials` tablosuna gerçek yorumları gir** (K-10 — kod değişikliği gerektirmez, en yüksek etki/efor oranı)
- [ ] Form input'larını `text-base` (16 px) yap
- [ ] `loading={priority ? 'eager' : 'lazy'}` bağla

**Gün 4-5 — Route bazlı `<head>` (~1 gün)**
- [ ] React 19'un yerel `<title>`/`<meta>`/`<link>` desteğiyle her sayfaya kendi canonical + description'ı ver
- [ ] `NotFoundPage`'e `<meta name="robots" content="noindex">` ekle
- [ ] Canlıda doğrula: `/gizlilik-politikasi` kendi canonical'ını gösteriyor mu?

### Hafta 2

**Gün 6-7 — Görsel pipeline (~1 gün)**
- [ ] `sharp` ile build script'i: her hoca fotoğrafı → 400w + 800w WebP (JPEG yedekli)
- [ ] `TeacherTicker`'a `srcset` + `sizes`
- [ ] `favicon.png`'nin gerçek 32×32 sürümünü üret
- [ ] WhatsApp ikonunu yerelleştir
- [ ] **Lighthouse'u yeniden çalıştır** — LCP 2.5 s altına indi mi?

**Gün 8-10 — İçerik (~2-3 gün)**
- [ ] Hoca kartlarına isim + bölüm + derece bilgisi (K-11) ve içerikli `alt` metinleri
- [ ] "Nasıl Çalışıyor?" bölümü: 4-5 adımlı süreç anlatımı
- [ ] SSS'ye 3-4 sınav odaklı soru ekle (bilgisel niyet)
- [ ] "Başarı garantisi"nin kapsamını yaz **veya** ifadeyi savunulabilir bir sözle değiştir
- [ ] H1'i ve 4 H2'yi hedef kelimeleri taşıyacak şekilde güncelle
- [ ] Hero'daki "Birebir Ders" → "Birebir Özel Ders" (ilk 100 kelime kriteri)
- [ ] Footer künyesini genişlet (e-posta, ticaret unvanı, tam adres)
- [ ] Hedef: `<main>` 363 → 900+ kelime

**Gün 10 — Doğrulama**
- [ ] GSC → URL Denetimi → "Canlı URL'yi test et" → Oluşturulan HTML'de içerik görünüyor mu?
- [ ] GSC → Sitemap'i yeniden gönder (www'lu)
- [ ] Rich Results Test ile şemaları doğrula
- [ ] Lighthouse mobil: LCP < 2.5 s?

### Sonraki karar noktası
**Prerender (K-01)** 2. haftaya sığmaz ve mimari bir karardır. Yukarıdaki 2 hafta tamamlandıktan sonra GSC'de indekslenme durumuna bakıp değerlendirilmeli: sayfalar indeksleniyorsa aciliyeti düşer, indekslenmiyorsa öncelik 1 olur.

---

## 5. Ölçülemeyen / eksik kalanlar

| Ne | Neden | Nasıl kapanır |
|---|---|---|
| **Saha (CrUX) Core Web Vitals** | Site 3.5 haftalık, veri eşiği dolmamış olabilir | GSC → Core Web Vitals |
| **Arama sorgusu verisi** | Site yeni, GSC'de veri yok | 1-2 ay bekle |
| **Arama hacmi / rekabet zorluğu** | Keyword Planner erişimi yok | Google Ads hesabı |
| **İndekslenme durumu** | Ölçülmedi | GSC → Dizin → Sayfalar |
| **Vercel fonksiyonunun 500 sebebi** | Log erişimi yok | Vercel → Functions → Logs |
| **Supabase `testimonials` içeriği** | Panel erişimi yok | Supabase paneli |
| **Rakip içerik derinliği** | Rakip analizi yapılmadı | Manuel/araçla |
| **Ekran okuyucu deneyimi** | Otomatik araçlar sorunların ~%30-40'ını yakalar | NVDA / VoiceOver ile elle test |
| **Gerçek iOS Safari davranışı** | Chromium ile ölçüldü | Fiziksel iPhone |
| **Hero gradient kontrast oranları** | axe gradient hesaplayamıyor | Elle ölçüm |

---

## 6. Ölçüm notları (şeffaflık)

- **Lighthouse:** 12.x, canlı site, simüle throttling, mobil + masaüstü — *laboratuvar* verisi, saha verisi değil.
- **Erişilebilirlik:** axe-core 4.10.2, WCAG 2.0/2.1 A+AA.
- **DOM ölçümleri:** Gerçek tarayıcıda (Chromium), 360×740 mobil ve masaüstü görünümde.
- **HTTP kontrolleri:** `curl` ile canlı sunucudan.
- **Düzeltilen ölçümler:** Faz 3'te ana sayfa için tahmin ettiğim ~750 kelime yanlıştı; canlı ölçüm **363** çıktı (Faz 9). Faz 10'da kendi yazdığım kontrast ve odak testleri hatalı sonuç verdi; raporlanan bulgular axe-core'un çıktısıdır.
