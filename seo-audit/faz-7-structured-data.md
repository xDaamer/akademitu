# FAZ 7 — STRUCTURED DATA (SCHEMA)

**Tarih:** 2026-09-07
**Doğrulama:** Canlı sitede tarayıcı ile çalıştırıldı — 4 JSON-LD bloğunun tamamı `<head>`'e basılıyor, **hiçbirinde sözdizimi/parse hatası yok** ✅

---

## 1. Mevcut şema envanteri

| # | Tip | Kaynak | Enjeksiyon |
|---|---|---|---|
| 1 | `Organization` | [App.tsx:24-39](src/App.tsx#L24-L39) | `useEffect` → runtime |
| 2 | `WebSite` + `SearchAction` | [App.tsx:41-54](src/App.tsx#L41-L54) | `useEffect` → runtime |
| 3 | `ItemList` (3 × `Service`) | [PackagesSection.tsx:13-74](src/components/PackagesSection.tsx#L13-L74) | `useEffect` → runtime |
| 4 | `FAQPage` (6 soru) | [FAQSection.tsx:38-49](src/components/FAQSection.tsx#L38-L49) | `useEffect` → runtime |

Microdata / RDFa kullanımı yok — tamamı JSON-LD (Google'ın önerdiği format) ✅

---

## 2. BULGULAR

### KRİTİK

**[KRİTİK] | [PackagesSection.tsx:26-27,38-49,60-71](src/components/PackagesSection.tsx#L26-L27) | `Service` üzerinde `price` / `priceCurrency` / `priceSpecification` kullanılmış — bunlar `Service` tipinin özellikleri değil.**
Schema.org'da `Service` bir fiyat taşımaz; fiyat `offers` altında bir `Offer` nesnesine girer. Mevcut hâl:
```json
{ "@type": "Service", "name": "Özel Ders Paketi", "priceCurrency": "TRY", "price": "950", "priceSpecification": {...} }
```
Google bu alanları **yok sayar** — yani sayfanın en değerli ticari sinyali (şeffaf fiyatlandırma, Faz 1'de sitenin en güçlü varlığı olarak tespit edilmişti) yapılandırılmış veri olarak hiç iletilmiyor.
**Doğrusu:**
```json
{
  "@type": "Service",
  "name": "Özel Ders Paketi",
  "provider": { "@id": "https://www.akademitu.com/#organization" },
  "offers": {
    "@type": "Offer",
    "price": "950",
    "priceCurrency": "TRY",
    "url": "https://www.akademitu.com/#paketler",
    "availability": "https://schema.org/InStock"
  }
}
```

**[KRİTİK] | [PackagesSection.tsx:19](src/components/PackagesSection.tsx#L19) ve [PackagesSection.tsx:31](src/components/PackagesSection.tsx#L31) | İki farklı hizmet aynı `@id`'yi paylaşıyor.**
`Ücretsiz Deneme Dersi` ve `Özel Ders Paketi` — ikisi de `"@id": "https://www.akademitu.com/#ozel-ders"`.
`@id` bir düğümün benzersiz kimliğidir. İki farklı nesneye aynı kimliği vermek, ayrıştırıcının onları **tek bir varlık sanıp birleştirmesine** yol açar; hangi fiyatın hangi hizmete ait olduğu belirsizleşir. Ayrıca `#ozel-ders` diye bir çapa sayfada yok (bölüm id'leri: `ana-sayfa`, `paketler`, `neden-biz`, `sss`) — üçüncü hizmetteki `#kocluk` da öyle.
**Çözüm:** Her hizmete benzersiz ve sayfada gerçekten var olan bir `@id` ver: `#deneme-dersi`, `#ozel-ders-paketi`, `#kocluk-programi`.

**[KRİTİK] | [App.tsx:41-54](src/App.tsx#L41-L54) | `WebSite` + `SearchAction` şeması var olmayan bir arama fonksiyonunu tanımlıyor.**
```json
"potentialAction": { "@type":"SearchAction", "target":{"urlTemplate":"https://www.akademitu.com/?q={search_term_string}"} }
```
Sitede **arama kutusu yok**, `?q=` parametresini işleyen hiçbir kod yok — o URL'e gidildiğinde ana sayfa açılır, arama yapılmaz.
Google'ın Sitelinks Searchbox dokümantasyonu çalışan bir arama uç noktası şart koşar. Var olmayan işlevi işaretlemek, denetim planındaki **"görünmeyen/var olmayan içeriği işaretleyen şema"** kategorisine girer ve yapılandırılmış veri politikası ihlali riskidir.
**Çözüm:** `potentialAction` bloğunu sil. `WebSite` şeması `name` + `url` ile kalabilir (zararsız ve faydalı). Not: Google Sitelinks Searchbox'ı 2024'te büyük ölçüde kullanımdan kaldırdı — bu bloğun getirisi zaten sıfır.

### ÖNEMLİ

**[ÖNEMLİ] | 4 bloğun tamamı | Şemalar `useEffect` ile runtime'da enjekte ediliyor, ilk HTML'de yok.**
Faz 5'te doğrulandı: sunucudan gelen HTML'de `<div id="root"></div>` dışında hiçbir şey yok. Şemalar ancak React çalıştıktan sonra `<head>`'e giriyor.
Googlebot render eder ve büyük ihtimalle görür — ama render kuyruğu gecikmeli, yeni sitede haftalar sürebilir. Google dışındaki hiçbir tüketici (Bing, sosyal önizleme, LLM tarayıcıları) bu şemaları görmez.
**Çözüm:** Şemaları `index.html`'e statik `<script type="application/ld+json">` olarak yaz. `Organization`, `WebSite` ve `FAQPage` tamamen statik veridir — runtime'da üretilmelerinin hiçbir gerekçesi yok. (Faz 5'teki prerender çözümü uygulanırsa bu da kendiliğinden çözülür.)

**[ÖNEMLİ] | [App.tsx:28,29,45,50](src/App.tsx#L28) vs [index.html:20](index.html#L20) | Şemalar `www.akademitu.com`, canonical `akademitu.com` diyor.**
Yapılandırılmış veri kanonik URL ile çelişiyor. Şemalardaki www'lu hâl **doğru olan** (canlı host bu); düzeltilmesi gereken canonical tarafı. Faz 2'de K-02 olarak raporlandı, burada şema boyutuyla teyit ediliyor.

**[ÖNEMLİ] | [App.tsx:24-39](src/App.tsx#L24-L39) | `Organization` bloğu eksik ve bağlantısız.**

| Eksik | Etki |
|---|---|
| `@id` yok | Diğer şemalar Organization'a referans veremiyor; `Service.provider` sadece isimle bağlanıyor ([PackagesSection.tsx:22-25](src/components/PackagesSection.tsx#L22-L25)) — grafik parçalı kalıyor |
| `contactPoint` yok | Telefon var ama `ContactPoint` (`contactType: "customer service"`, `availableLanguage: "tr"`) yok |
| `address.streetAddress` yok | `need.json`'da "Katar Caddesi" var, şemaya girmemiş |
| `sameAs`'te Twitter yok | [need.json:26](need.json#L26)'da tanımlı, şemada atlanmış |
| `telephone` formatı | `+90-530-369-9539` — E.164 (`+905303699539`) tercih edilir |
| Tip seçimi | `Organization` yerine `EducationalOrganization` içeriğe daha uygun (schema.org'da geçerli bir alt tip) |

**[ÖNEMLİ] | Site geneli | `BreadcrumbList` şeması yok.**
Yasal sayfalarda `Ana Sayfa › Gizlilik Politikası` yolunu işaretlemek, Google'ın SERP'te ham URL yerine yol göstermesini sağlar. Faz 6'da görsel breadcrumb önerisiyle birlikte uygulanmalı.

### İYİLEŞTİRME

**[İYİLEŞTİRME] | [PackagesSection.tsx:16](src/components/PackagesSection.tsx#L16) | `ItemList` ögeleri `ListItem` sarmalayıcısı ve `position` olmadan verilmiş.**
`itemListElement` doğrudan `Service` nesneleri içeriyor. Schema.org bunu tolere eder ama Google'ın beklediği kalıp `{"@type":"ListItem","position":1,"item":{...}}`. Sıralama bilgisi (hangisi öne çıkan paket) şu an iletilmiyor.

**[İYİLEŞTİRME] | [PackagesSection.tsx:46,68](src/components/PackagesSection.tsx#L46) | `unitCode` değerleri doğrulanmalı.**
`MON` (ay) UN/CEFACT Rec 20'de geçerli bir koddur ✅. `H27` için o listede bir karşılık **doğrulanamadı** — "ders başına" anlamı kastediliyorsa bunun standart bir birim kodu yoktur.
**Çözüm:** `unitCode: "H27"` yerine `unitText: "ders"` kullan (schema.org serbest metin birimi için bunu önerir).

**[İYİLEŞTİRME] | [FAQSection.tsx:38-49](src/components/FAQSection.tsx#L38-L49) | `FAQPage` şeması teknik olarak doğru, ama pratik getirisi bugün neredeyse sıfır.**
Şema geçerli ✅ ve işaretlenen cevaplar sayfada gerçekten görünür (akordeon açıldığında) — **görünmeyen içerik işaretleme ihlali yok** ✅.
Ancak Google Ağustos 2023'te FAQ zengin sonuçlarını neredeyse tamamen kaldırdı; artık yalnızca resmî kurum ve sağlık otoritesi sitelerinde gösteriliyor. Yani bu blok muhtemelen SERP'te hiç görünmeyecek.
**Aksiyon: kaldırmayın** — zararı yok, maliyeti yok, politika değişirse hazır. Sadece beklenti buna göre olsun.

**[İYİLEŞTİRME] | Fırsat: `Course` şeması yok.**
Google'ın `Course` zengin sonucu bu içerik tipine (YKS/LGS hazırlık programı) doğrudan uyuyor ve FAQ'nun aksine **hâlâ aktif olarak gösteriliyor**. `Course` + `hasCourseInstance` (`courseMode: "online"`, `courseWorkload`) ile "YKS Hazırlık Koçluğu" ve "LGS Hazırlık Koçluğu" işaretlenebilir. Tek sayfalı yapıda da uygulanabilir.
Bu, mevcut şemalar arasında **en yüksek getirili eklemedir**.

---

## 3. ⚠️ Yapılmaması gereken: yorumlar için `AggregateRating`

Sayfada yıldızlı yorum kartları var ([TestimonialsSection.tsx:230-240](src/components/TestimonialsSection.tsx#L230-L240)) ve ilk bakışta `AggregateRating` eklemek cazip görünüyor. **Eklemeyin.**

Google'ın yapılandırılmış veri politikası, bir işletmenin **kendi sitesinde topladığı, kendisi hakkındaki** yorumları zengin sonuç için uygun saymaz ("self-serving reviews"). `Organization` veya `LocalBusiness` üzerinde bu şekilde `AggregateRating` kullanmak manuel işlem (manual action) riskidir.

Yıldızları SERP'e taşımanın meşru yolu Google Business Profile veya bağımsız bir yorum platformudur — kendi veritabanınızdaki yorumlar değil.

---

## 4. Doğru yapılmış olanlar ✅

- Format JSON-LD (Google'ın önerdiği) — microdata karmaşası yok
- 4 bloğun tamamı canlıda parse ediliyor, sözdizimi hatası yok (tarayıcıda doğrulandı)
- `FAQPage`'de işaretlenen içerik sayfada gerçekten görünür — gizli içerik işaretleme ihlali yok
- Şemadaki fiyatlar sayfadaki fiyatlarla **birebir uyumlu** (0 / 950 / 3.150 TL) — tutarsızlık yok
- Bileşen unmount olduğunda script'ler temizleniyor ([App.tsx:67-70](src/App.tsx#L67-L70)) — çift enjeksiyon yok
- `LocalBusiness` şeması **yok** ve olmaması doğru — hizmet %100 online, coğrafi hedef yok

---

## 5. Şema tipinin sayfa içeriğiyle tutarlılığı

| Şema | Sayfada karşılığı | Tutarlı mı? |
|---|---|---|
| `Organization` | Marka, iletişim, sosyal hesaplar | ✅ (tip `EducationalOrganization` daha isabetli olurdu) |
| `WebSite` | Site kendisi | ✅ |
| `SearchAction` | **Yok — arama fonksiyonu mevcut değil** | ❌ K-03 |
| `ItemList`/`Service` ×3 | 3 paket kartı | ✅ İsim, açıklama ve fiyatlar eşleşiyor |
| `FAQPage` | 6 SSS akordeonu | ✅ |
| — | Yorumlar bölümü | ➖ Şema yok (ve **olmamalı**, Bölüm 3) |
| — | Hoca kadrosu | ➖ Şema yok (düşük öncelik) |

---

## 6. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Google'ın şemaları gerçekten okuyup okumadığı | GSC → Zengin sonuçlar raporu / URL Denetimi |
| Rich Results Test'in resmî çıktısı | search.google.com/test/rich-results (canlı URL ile) |
| Şema hatalarının GSC'de raporlanıp raporlanmadığı | GSC → Geliştirmeler |
