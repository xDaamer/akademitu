# FAZ 9 — İÇERİK KALİTESİ VE E-E-A-T

**Tarih:** 2026-09-07
**Yöntem:** Kelime sayıları canlı sitede, render edilmiş metinden ölçüldü (Faz 3'teki tahminlerin yerini alır).

---

## 1. Kelime sayısı — ölçülmüş değerler

| Sayfa | `<main>` içi | `<body>` toplam |
|---|---|---|
| `/` (ana sayfa) | **363 kelime** | 456 |
| `/gizlilik-politikasi` | **177 kelime** | 263 |
| `/kullanim-kosullari` | ~180 kelime | ~265 |

> Faz 3'te ana sayfa için ~750 kelime tahmin etmiştim; gerçek değer **363**. Tahmin iki kat yüksekti — sebebi yorumlar bölümünün canlıda hiç render olmaması (aşağıda K-02) ve pop-up içeriğinin sayılmaması.

---

## 2. BULGULAR

### KRİTİK

**[KRİTİK] | `/` | Ana sayfanın gövde içeriği 363 kelime — ticari bir sorguda yarışmak için fazlasıyla ince.**
Bu sayı yalnızca "az" değil; sayfanın hedeflediği işi yapmasına yetmiyor. 363 kelimenin içinde başlıklar, buton metinleri, fiyat etiketleri ve footer bağlantıları da var. Gerçek anlatı metni bunun yarısından az.

Sayfada **hiç yer almayan**, oysa "YKS koçluk" arayan birinin beklediği bilgiler:
- Koçluk süreci nasıl işliyor? (ilk görüşme → plan → takip → revizyon)
- Bir ders/koçluk seansı somut olarak neye benziyor?
- Hangi platform/araçlar kullanılıyor? (SSS'de "interaktif dijital tahta" deniyor, detaylandırılmıyor)
- Ödeme, iptal, iade koşulları
- "Derece yapmış hoca" ne demek, nasıl seçiliyorlar? (K-03)
- Başarı garantisinin kapsamı (Faz 1'de raporlandı, hâlâ tanımsız)

**Çözüm (tek sayfa stratejisine uygun):** Yeni sayfa açmadan mevcut sayfaya "Nasıl Çalışıyor?" (süreç adımları) ve genişletilmiş SSS bölümleri eklemek, sayfayı 900-1200 kelime bandına çıkarır. Bu, Faz 1'deki bilgisel niyet boşluğunu ve Faz 3'teki H2 kelime eksikliğini de aynı anda kapatır.

**[KRİTİK] | [TestimonialsSection.tsx:157-159](src/components/TestimonialsSection.tsx#L157-L159) | Yorumlar bölümü canlı sitede hiç render olmuyor — sosyal kanıt tamamen yok.**
Canlı sitede doğrulandı: ana sayfada yalnızca **3 H2** var (`Şeffaf ve Esnek Paket Seçenekleri`, `Neden akademITU?`, `Aklınıza Takılan Sorular`). `Velilerimizin Görüşleri` H2'si **DOM'da yok**. "Yorumlar yükleniyor..." metni de yok — yani istek tamamlanmış ve boş dönmüş.

Sebebi ya Supabase `testimonials` tablosunun boş olması ya `is_published = true` kaydı bulunmaması. Kod `testimonials.length === 0` durumunda `return null` yapıyor, bölüm sessizce kayboluyor.

Etkisi: eğitim gibi güven hassasiyeti yüksek bir satın almada **tek sosyal kanıt mekanizması devre dışı**. Faz 1'de "yorum yoksa bölüm kaybolur" diye bir risk olarak yazmıştım; **bu risk şu anda gerçekleşmiş durumda.**
**Çözüm:** (a) Supabase'e gerçek yorumları gir (asıl çözüm); (b) veri gelmediğinde bölümün sessizce kaybolmaması için statik yedek içerik ya da en azından bir hata sinyali.

**[KRİTİK] | [TeacherTicker.tsx:547](src/components/TeacherTicker.tsx#L547) | Sitenin tüm değer önerisi "derece yapmış hocalar" ama sayfada bunu doğrulayan tek bir bilgi yok.**
Ana sayfa 7 hoca fotoğrafı gösteriyor. Bu fotoğrafların:
- İsmi yok
- Sıralaması/derecesi yok
- Üniversitesi/bölümü yok
- Branşı yok
- `alt` metni boş (`alt=""`, dekoratif işaretlenmiş)

Yani kullanıcı da arama motoru da 7 anonim yüz görüyor. H1 "Derece Hocaları ile Hazırlan" diyor, `Neden akademITU?` bölümü "YKS ve LGS sınavlarında derece yapmış... mühendislik ve bilim öğrencileri" diyor ([WhyUsSection.tsx:14](src/components/WhyUsSection.tsx#L14)) — ama **hiçbiri kanıtlanmıyor**.

E-E-A-T'nin dört harfinden üçü (Experience, Expertise, Authoritativeness) tam olarak bu bilgiye dayanır. Şu an sıfır sinyal var.
**Çözüm:** Her fotoğrafın altına en azından ad + bölüm + derece bilgisi. `types.ts`'deki `Teacher` arayüzü ([types.ts](src/types.ts)) `name`, `department`, `rank`, `branch` alanlarını **zaten tanımlıyor** — veri modeli hazır, sadece gösterilmiyor.

### ÖNEMLİ

**[ÖNEMLİ] | Site geneli | Kurumsal kimlik bilgisi (künye) yok.**
Sitede şunların hiçbiri yok: ticaret unvanı, vergi dairesi/numarası, MERSİS numarası, e-posta adresi, kurucu/ekip bilgisi, kuruluş yılı.

Mevcut tek iletişim bilgisi bir cep telefonu numarası ve "Katar Caddesi Maslak/İstanbul" ([Footer.tsx:83-87](src/components/Footer.tsx#L83-L87)) — sokak adı var, bina/kapı numarası yok.

Bu hem **E-E-A-T** (kim olduğu belli olmayan bir satıcıya güven düşük) hem **mevzuat** (mesafeli satış ve e-ticaret düzenlemeleri kimlik bilgisi ister) hem **dönüşüm** (veli, çocuğunu emanet edeceği yeri araştırır) açısından eksik.
**Çözüm:** Tek sayfa stratejisini bozmadan footer'a genişletilmiş künye bloğu + e-posta adresi. Ayrı sayfa istemiyorsanız bu minimum.

**[ÖNEMLİ] | [config.ts:46-87](src/config.ts#L46-L87) | Uydurma hoca profilleri kodda duruyor: sahte isimler + Unsplash stok fotoğrafları + spesifik derece iddiaları.**
```
Mert Yılmaz   — İTÜ Bilgisayar Müh.  — "YKS Sayısal 42.si"     — unsplash.com/...
Zeynep Kaya   — İTÜ Endüstri Müh.    — "YKS Sayısal 118.si"    — unsplash.com/...
Kaan Çelik    — İTÜ Makina Müh.      — "LGS Türkiye 1.si..."   — unsplash.com/...
```
**Şu anda gösterilmiyor** — bu bir yedek (fallback) listesi ve `public/teachers/` klasöründe fotoğraf olduğu için devreye girmiyor. Dahası, `getTeacherList()` fonksiyonu **hiçbir bileşen tarafından çağrılmıyor** (kullanım sayısı: 0), yani tamamen ölü kod.

Ama tehlike şurada: bu liste "fotoğraf bulunamazsa devreye gir" mantığıyla yazılmış. Klasör bir gün boşalırsa site, stok fotoğraflarla birlikte **"LGS Türkiye 1.si"** gibi doğrulanamaz iddialar yayınlar. Eğitim sektöründe bu, güven kaybının ötesinde reklam mevzuatı sorunudur.
**Çözüm:** `DEFAULT_TEACHERS`, `getTeacherList()` ve `teacherLoader.ts` tamamen silinsin. Kullanılmıyorlar ve taşıdıkları risk sıfır faydaya karşılık geliyor.

**[ÖNEMLİ] | Site geneli | Yazar bilgisi, yayın tarihi ve güncelleme tarihi yok.**
Ana sayfada içeriğin kim tarafından, ne zaman yazıldığına dair hiçbir işaret yok. Yasal sayfalarda "Son güncelleme" var ama ana sayfada yok. Pazarlama sayfası için yazar zorunlu değil; ancak **"en son ne zaman güncellendi"** bilgisi (özellikle fiyatlar ve kampanya için) hem kullanıcı hem Google açısından tazelik sinyalidir.

**[ÖNEMLİ] | [index.html:17](index.html#L17) + [PackagesSection.tsx:227](src/components/PackagesSection.tsx#L227) | "Başarı garantisi" iddiası hâlâ tanımsız.**
Faz 1'de İYİLEŞTİRME olarak raporlanmıştı; E-E-A-T bağlamında ağırlığı artıyor. Meta description'da ve paket kartında geçen "garanti", sitenin hiçbir yerinde — kullanım koşullarında bile — tanımlanmamış. Doğrulanamayan bir garanti vaadi güven sinyali değil, güven riskidir.

### İYİLEŞTİRME

**[İYİLEŞTİRME] | [PrivacyPolicyPage.tsx:83](src/pages/PrivacyPolicyPage.tsx#L83), [TermsPage.tsx:83](src/pages/TermsPage.tsx#L83) | "Son güncelleme: 13.08.2026" elle yazılmış ve gerçek düzenleme tarihinden eski.**
İki dosya da git geçmişine göre **2026-08-21**'de değiştirilmiş, ama sayfada 13.08.2026 yazıyor. Sekiz günlük fark küçük, fakat elle yazılmış tarihler kaçınılmaz olarak eskir. Tarih doğruluğu, güven sayfalarında doğrudan bir güven sinyali.
**Çözüm:** Tarihi `need.json`'a taşı ya da build sırasında otomatik doldur.

**[İYİLEŞTİRME] | [config.ts](src/config.ts), [utils/teacherLoader.ts](src/utils/teacherLoader.ts) | Ölü kod.**

| Sembol | Kullanım |
|---|---|
| `getTeacherList()` | **0** |
| `DEFAULT_TEACHERS` | **0** |
| `CAMPAIGN_DEADLINE` | **0** (üstelik 13.09.2026'da doluyor — 6 gün sonra) |
| `BRAND_COLORS` | **0** |
| `TEACHER_TICKER_PIXELS_PER_SECOND` | 2 ✅ |

`@google/genai` bağımlılığı da ([package.json:12](package.json#L12)) hiçbir yerde çağrılmıyor (Faz 0/4). Doğrudan SEO etkisi yok; bundle boyutu ve bakım yükü açısından temizlenmeli.

---

## 3. Denetim planındaki kontroller

| Kontrol | Sonuç |
|---|---|
| **İnce (thin) içerikli sayfa** | ❌ Ana sayfa 363 kelime — ince |
| **Yazar bilgisi** | ❌ Yok |
| **Yayın / güncelleme tarihi** | ⚠️ Yalnızca yasal sayfalarda, o da elle ve eski |
| **Kaynak gösterimi** | ➖ Uygulanamaz — sayfada iddia edilen istatistik/veri yok (bu iyi: uydurma veri de yok) |
| **Hakkımızda sayfası** | ❌ Yok |
| **İletişim sayfası** | ❌ Yok (telefon footer'da var) |
| **Künye** | ❌ Yok |
| **YMYL içerik** | ⚠️ Eğitim + ücretli hizmet = güven hassasiyeti yüksek. Güven sinyalleri **yetersiz** (K-03, Ö-01) |
| **Şablon/kopya içerik** | ✅ **Yok.** İki yasal sayfa birbirinden içerik olarak farklı; ana sayfa özgün yazılmış |
| **Güncellenmemiş içerik** | ✅ **Yok.** Depo 2026-08-12'de açılmış, 118 commit, tüm içerik dosyaları son 2 hafta içinde düzenlenmiş |

---

## 4. Doğru yapılmış olanlar ✅

- **Uydurma istatistik yok.** TrustBar'da "10.000 öğrenci", "%98 başarı" tarzı doğrulanamaz sayılar bilinçli olarak kullanılmamış ([TrustBar.tsx:5-7](src/components/TrustBar.tsx#L5-L7) yorumunda gerekçesi yazılı). Bu sektörde nadir ve doğru bir tercih.
- **Fiyatlar açık.** 0 / 950 / 3.150 TL sayfada net yazıyor, "bilgi alın" arkasına saklanmıyor. Şeffaflık güçlü bir güven sinyali.
- **SSS cevapları gerçek bilgi içeriyor** — ortalama ~45 kelime, geçiştirme yok.
- **İçerik taze** — tüm metin dosyaları son iki haftada düzenlenmiş.
- **KVKK aydınlatma metni mevcut** ve form akışına entegre ([KvkkModal.tsx](src/components/KvkkModal.tsx)) — veri toplama şeffaflığı doğru kurulmuş.
- **Gizlilik politikası dürüst**: "Google Analytics, Meta Pixel veya benzeri üçüncü taraf reklam takip sistemleri kullanılmamaktadır" ([PrivacyPolicyPage.tsx:60-61](src/pages/PrivacyPolicyPage.tsx#L60-L61)) — doğrulanabilir ve doğru bir beyan.

---

## 5. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Rakip sayfaların kelime sayısı / içerik derinliği | Rakip analizi (manuel veya araçla) |
| Gerçek kullanıcı davranışı (kalma süresi, geri dönüş oranı) | Analytics davranış verisi |
| Supabase `testimonials` tablosunda kayıt olup olmadığı | Supabase panel erişimi |
| İçeriğin Google tarafından "helpful content" olarak değerlendirilip değerlendirilmediği | GSC performans verisi (site yeni) |
