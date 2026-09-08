# FAZ 6 — İÇ LİNK MİMARİSİ

**Tarih:** 2026-09-07
**Strateji girdisi:** Tek landing page. Yeni sayfa açılmayacak.

> ⚠️ Bu faz normalde çok sayfalı siteler için tasarlanmıştır. 3 sayfalık düz bir yapıda "orphan sayfa", "3 tık derinlik", "pillar/cluster" gibi kontrollerin çoğu yapısal olarak zaten geçer. Bu raporda o kontroller dürüstçe "uygulanamaz/geçti" olarak işaretlendi; gerçek bulgular **bağlantıların nasıl işaretlendiği** tarafında.

---

## 1. Bağlantı envanteri (`/` ana sayfa)

**Taranabilir `<a href>` bağlantıları — toplam 7:**

| Anchor text | Hedef | Konum |
|---|---|---|
| akademITU (logo) | `#ana-sayfa` | [Header.tsx:87](src/components/Header.tsx#L87) |
| Ana Sayfa | `#ana-sayfa` | [Footer.tsx:48](src/components/Footer.tsx#L48) |
| Paketler & Fiyatlar | `#paketler` | [Footer.tsx:51](src/components/Footer.tsx#L51) |
| Neden akademITU? | `#neden-biz` | [Footer.tsx:54](src/components/Footer.tsx#L54) |
| Sıkça Sorulan Sorular | `#sss` | [Footer.tsx:57](src/components/Footer.tsx#L57) |
| Gizlilik Politikası | `/gizlilik-politikasi` | [Footer.tsx:103](src/components/Footer.tsx#L103) |
| Kullanım Koşulları | `/kullanim-kosullari` | [Footer.tsx:104](src/components/Footer.tsx#L104) |

**Dış bağlantı:** WhatsApp ([App.tsx:209-213](src/App.tsx#L209-L213)) — `rel="noopener noreferrer"` doğru konmuş ✅

**Taranabilir OLMAYAN gezinme:** Header ana menüsünün 4 ögesi (`Ana Sayfa`, `Paketler`, `Neden Biz`, `SSS`) `<button onClick>` olarak render ediliyor ([Header.tsx:99-116](src/components/Header.tsx#L99-L116)) — `href` yok.

---

## 2. BULGULAR

**[ÖNEMLİ] | [Footer.tsx:48-58](src/components/Footer.tsx#L48-L58) | Footer'daki bölüm bağlantıları yasal sayfalarda çalışmıyor.**
Footer her sayfada ortak ve `<a href="#paketler">` gibi düz fragment bağlantıları kullanıyor. `/gizlilik-politikasi` sayfasında `#paketler` diye bir element yok — kullanıcı "Paketler & Fiyatlar"a tıkladığında **hiçbir şey olmuyor**.
Header aynı problemi çözmüş: farklı sayfadaysa `navigate('/', { state: { scrollTo: id } })` yapıyor ([Header.tsx:29-33](src/components/Header.tsx#L29-L33)). Footer bu mantığı hiç almamış.
Etkisi hem UX hem iç link: yasal sayfalardan ana sayfanın bölümlerine giden dört bağlantı fiilen ölü.
**Çözüm:** Footer bağlantıları `<Link to="/" state={{ scrollTo: 'paketler' }}>` kalıbına geçsin — hem her sayfadan çalışır hem taranabilir `href` üretir. Header'daki `scrollToSection` mantığı doğrudan yeniden kullanılabilir.

**[ÖNEMLİ] | [Header.tsx:99-116](src/components/Header.tsx#L99-L116) | Ana menü `<button>`, `<a href>` değil — taranabilir gezinme yok.**
Dört menü ögesi de `onClick` ile `scrollIntoView` çağırıyor; DOM'da `href` üretmiyorlar. Sonuçları:
- Arama motoru sayfanın bölüm yapısını menüden okuyamıyor (Google ana sayfa için "bölüme atla" site linkleri üretebilir; bunun için `href` şart).
- Kullanıcı orta tuşla/yeni sekmede açamıyor, bağlantıyı kopyalayamıyor.
- URL güncellenmiyor: `#paketler` paylaşılabilir bir derin bağlantı değil.
Not: erişilebilirlik tarafı düzgün yapılmış (`aria-label="Ana menü"`, `aria-current`) ✅ — sorun yalnızca eleman tipi.
**Çözüm:** `Button` yerine `<a href="#paketler" onClick={...}>`. `onClick` yumuşak kaydırmayı korur, `href` hem taranabilirlik hem doğal tarayıcı davranışını geri verir.

**[ÖNEMLİ] | [Footer.tsx:67-73](src/components/Footer.tsx#L67-L73) | "Programlarımız" listesi sitenin en kelime zengini metni ve hiçbir yere bağlanmıyor.**
```
YKS Sayısal / Eşit Ağırlık Koçluğu
LGS Birebir Hazırlık & Mentörlük
Matematik & Geometri Özel Ders
Fizik, Kimya, Biyoloji Dersleri
Sınav Stresi & Zaman Yönetimi
```
Bunlar düz `<li>` — bağlantı değil. Üstelik hemen yanlarındaki "Hızlı Bağlantılar" sütunu bağlantı olduğu için kullanıcıya bağlantı gibi görünüyorlar ama tıklanmıyorlar.
Faz 1'de tespit edilen "TYT/AYT sayfada geçmiyor", Faz 3'te tespit edilen "H2'lerde hedef kelime yok" sorunlarının panzehiri tam olarak bu metinler — ama şu an hiçbir yapısal ağırlık taşımıyorlar.
**Çözüm (tek sayfa stratejisine uygun):** Her birini ilgili bölüme bağla — ilk ikisi `#paketler`, sonraki ikisi `#paketler`, sonuncusu `#neden-biz`. Anchor text zaten mükemmel; sadece `<a>` içine alınması gerekiyor.

**[İYİLEŞTİRME] | Site geneli | Breadcrumb yok.**
3 sayfalık düz bir yapıda kullanıcı için gerçek faydası düşük. Ancak yasal sayfalarda `Ana Sayfa › Gizlilik Politikası` gösterilmesi + `BreadcrumbList` şeması, Google'ın SERP'te URL yerine yol göstermesini sağlar. Düşük efor, düşük-orta getiri.
**Çözüm:** Yasal sayfalara basit bir breadcrumb + `BreadcrumbList` JSON-LD. (Faz 7'de şema tarafıyla birlikte ele alınacak.)

**[İYİLEŞTİRME] | [PrivacyPolicyPage.tsx:88](src/pages/PrivacyPolicyPage.tsx#L88), [TermsPage.tsx:88](src/pages/TermsPage.tsx#L88) | Yasal sayfalar tek bir bağlantıyla ana sayfaya dönüyor; birbirlerine bağlanmıyorlar.**
Her ikisinde de yalnızca "← Ana sayfaya dön" var. Gizlilik politikasını okuyan biri kullanım koşullarına footer dışından ulaşamıyor. Küçük bir bulgu ama iki sayfa da içerik olarak birbirinin doğal devamı.
**Çözüm:** Karşılıklı bağlantı ekle.

---

## 3. Denetim planındaki kontroller

| Kontrol | Sonuç |
|---|---|
| **Orphan sayfa** (hiçbir yerden link almayan) | ✅ **Yok.** Her iki yasal sayfa footer'dan link alıyor; footer her sayfada var. |
| **Ana sayfadan 3 tıktan uzak sayfa** | ✅ **Yok.** Tüm sayfalar 1 tık uzaklıkta. |
| **Anlamsız anchor text** ("tıklayın", "buraya", "devamı") | ✅ **Yok.** Tüm anchor text'ler açıklayıcı: "Gizlilik Politikası", "Paketler & Fiyatlar", "Ana sayfaya dön". Bu tarafta düzeltilecek bir şey yok. |
| **İç link yoğunluğu** (1000 kelimede 3-5) | ⚠️ Ana sayfada ~750 kelimeye karşılık **2 gerçek sayfa bağlantısı** (ikisi de yasal) + 5 fragment. Sayısal olarak düşük, ama **bağlanacak başka sayfa olmadığı için bu bir kusur değil, stratejinin doğal sonucu.** Aşırı link de yok. |
| **Pillar/cluster yapısı** | ➖ **Uygulanamaz.** Tek para sayfası varken pillar/cluster kurulamaz. Bkz. Bölüm 4. |
| **Breadcrumb** | ❌ Yok (yukarıda) |

---

## 4. Tek sayfa stratejisinde iç link mimarisi ne olmalı?

Pillar/cluster yerine geçerli olan yaklaşım **bölüm çapalama (section anchoring)**:

1. **Her ana bölümün stabil bir `id`'si olsun.** Zaten var: `#ana-sayfa`, `#paketler`, `#neden-biz`, `#sss` ([App.tsx:87](src/App.tsx#L87)). ✅
2. **Bu id'lere `<a href>` ile bağlan.** Şu an sadece footer bunu yapıyor; header yapmıyor (Ö-02), "Programlarımız" listesi yapmıyor (Ö-03).
3. **Sayfa içi metinden bölümlere doğal bağlantı ver.** Örneğin SSS cevabında "haftalık 2+ ders alımında koçluk hediye" derken `#paketler`'e bağlanabilir ([FAQSection.tsx:24](src/components/FAQSection.tsx#L24)). Şu an sayfa gövdesinde tek bir iç bağlantı yok.
4. **Yorumlar bölümüne `id` verilmemiş** ([TestimonialsSection.tsx:224](src/components/TestimonialsSection.tsx#L224)) — diğer dört bölümün aksine çapalanamıyor.

Bu üçü uygulanırsa Google'ın SERP'te bölüm bazlı site linkleri gösterme olasılığı artar; tek sayfalı bir sitede birden fazla SERP satırı kazanmanın pratikte tek yolu budur.

---

## 5. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Gerçek kelime sayısı (link yoğunluğu paydası) | Faz 9'da render edilmiş metinden ölçülecek |
| Google'ın hangi bölümleri site linki olarak gösterdiği | GSC / canlı SERP gözlemi |
| Dış siteden gelen bağlantılar (backlink profili) | Ahrefs / Majestic / GSC Bağlantılar raporu |
