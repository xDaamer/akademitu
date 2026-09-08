# FAZ 3 — BAŞLIK HİYERARŞİSİ

**Tarih:** 2026-09-07
**Yöntem:** Kaynak koddaki tüm `<h1>`–`<h6>` etiketleri DOM sırasına göre çıkarıldı. Modal/pop-up içindeki başlıklar (`PopUpForm`, `KvkkModal`, `MobileLeadSheet`) yalnızca açıkken DOM'a girdiği için ana taslağın dışında değerlendirildi.

---

## 1. `/` — Ana sayfa başlık taslağı

```
H1  YKS ve LGS için Derece Hocaları ile Hazırlan        HeroSection.tsx:26
    (TrustBar — başlıksız bölüm)                        TrustBar.tsx:16
H2  Şeffaf ve Esnek Paket Seçenekleri                   PackagesSection.tsx:95
  H3  Ücretsiz Deneme Dersi                             PackagesSection.tsx:117
  H3  Özel Ders Paketi                                  PackagesSection.tsx:197
  H3  Koçluk Programı                                   PackagesSection.tsx:285
H2  Neden akademITU?                                    WhyUsSection.tsx:43
  H3  Derece Eğitmenleri                                WhyUsSection.tsx:67
  H3  Kişiye Özel İlerleme Analizi                      (aynı map)
  H3  Esnek Saatler                                     (aynı map)
  H3  Şeffaf Veli Bilgilendirmesi                       (aynı map)
H2  Velilerimizin Görüşleri                             TestimonialsSection.tsx:226
      ⚠️ koşullu — yorum yoksa bu H2 hiç basılmıyor
H2  Aklınıza Takılan Sorular                            FAQSection.tsx:75
      ⚠️ 6 SSS sorusunun hiçbiri başlık etiketi değil
────────── <footer> ──────────
H4  Hızlı Bağlantılar                                   Footer.tsx:43   ← H3 atlandı
H4  Programlarımız                                      Footer.tsx:64   ← H3 atlandı
H4  İletişim & Destek                                   Footer.tsx:78   ← H3 atlandı
```

**H1 sayısı: 1** ✅ · **Atlanan seviye: var** (H2 → H4) · **H5/H6 kullanımı: yok** ✅

## 2. `/gizlilik-politikasi` ve `/kullanim-kosullari`

```
H1  Gizlilik Politikası & KVKK Aydınlatma Metni   /  Kullanım Koşulları
H2  1. … 7.  (yedişer madde, düzgün sıralı)
────────── <footer> ──────────
H4  ×3                                            ← H3 atlandı
```
İki sayfanın kendi içindeki hiyerarşisi **doğru** ✅ — tek sorun ortak footer'dan gelen H2→H4 sıçraması.

## 3. `*` — 404
```
H1  Aradığınız sayfa bulunamadı                   NotFoundPage.tsx:22
```
Sayfadaki dev "404" metni `<p>` olarak yazılmış ([NotFoundPage.tsx:21](src/pages/NotFoundPage.tsx#L21)) — **doğru tercih**, görsel olarak en büyük öge olmasına rağmen başlık etiketi verilmemiş. ✅

---

## 4. BULGULAR

**[ÖNEMLİ] | [PackagesSection.tsx:95](src/components/PackagesSection.tsx#L95), [WhyUsSection.tsx:43](src/components/WhyUsSection.tsx#L43), [TestimonialsSection.tsx:226](src/components/TestimonialsSection.tsx#L226), [FAQSection.tsx:75](src/components/FAQSection.tsx#L75) | Dört H2'nin hiçbirinde hedef kelime yok.**

| H2 | YKS | LGS | koçluk | özel ders |
|---|---|---|---|---|
| Şeffaf ve Esnek Paket Seçenekleri | – | – | – | – |
| Neden akademITU? | – | – | – | – |
| Velilerimizin Görüşleri | – | – | – | – |
| Aklınıza Takılan Sorular | – | – | – | – |

Denetim planındaki "hedef kelime en az bir H2'de geçmeli" kriteri **karşılanmıyor**. H2'ler sayfanın ikinci en güçlü alaka sinyalidir ve dördü de tamamen jenerik. Bu, aşırı optimizasyonun tersi bir problem: sayfa hedef sorgularına yeterince "bu sayfa bu konuda" demiyor.
**Çözüm (tek landing page stratejisine uygun, yeni sayfa gerektirmez):**
- `Şeffaf ve Esnek Paket Seçenekleri` → `YKS ve LGS Özel Ders ve Koçluk Paketleri`
- `Neden akademITU?` → `Neden akademITU ile YKS-LGS Koçluğu?`
- `Velilerimizin Görüşleri` → `Öğrenci ve Veli Yorumları` *(bu H2 kelime taşımak zorunda değil, sosyal kanıt başlığı olarak doğal kalması daha iyi)*
- `Aklınıza Takılan Sorular` → `YKS ve LGS Koçluğu Hakkında Sıkça Sorulan Sorular`

**[ÖNEMLİ] | [HeroSection.tsx:26](src/components/HeroSection.tsx#L26) | H1 hedef ifadelerin ikisini de içermiyor.**
`YKS ve LGS için Derece Hocaları ile Hazırlan` — "YKS" ve "LGS" var, ancak **"koçluk" ve "özel ders" yok**. Title bu iki ifadeyi vadediyor ([index.html:15](index.html#L15)), H1 doğrulamıyor. Faz 2'de title tarafından, burada H1 tarafından aynı kopukluk.
**Çözüm:** `Derece Hocalarıyla YKS ve LGS Koçluğu ve Birebir Özel Ders` — hedef ifadelerin ikisini de doğal biçimde taşıyor, mevcut mesajı bozmuyor.

**[ÖNEMLİ] | [FAQSection.tsx:101-103](src/components/FAQSection.tsx#L101-L103) | 6 SSS sorusu görsel olarak başlık, semantik olarak `<span>`.**
Sorular `<button>` içinde `<span className="font-bold text-base sm:text-lg">` olarak yazılmış. Görünüm başlık, yapı değil. Sonuçları: (a) sayfanın başlık taslağında SSS bölümü tek bir H2'den ibaret görünüyor, altındaki 6 soru yapıya hiç girmiyor; (b) ekran okuyucu kullanıcısı başlık listesiyle sorular arasında gezinemiyor; (c) sayfadaki en fazla bilgisel-sorgu potansiyeli taşıyan metinler ([FAQSection.tsx:9-34](src/components/FAQSection.tsx#L9-L34)) yapısal ağırlık almıyor.
Not: FAQPage şeması ayrıca basılıyor ([FAQSection.tsx:37-59](src/components/FAQSection.tsx#L37-L59)) ve o taraf doğru çalışıyor — bu bulgu şemayı değil HTML yapısını ilgilendiriyor.
**Çözüm:** Soru metnini `<h3>` içine al, `<button>` h3'ün içinde veya dışında kalabilir (`<h3><button …>{soru}</button></h3>` erişilebilirlik açısından tercih edilen kalıptır).

**[İYİLEŞTİRME] | [Footer.tsx:43,64,78](src/components/Footer.tsx#L43) | Footer sütun başlıkları H4 — H3 atlanmış.**
Footer her üç sayfada da ortak olduğu için sıçrama üç sayfada birden oluşuyor. Ana sayfada son başlık H2 (`Aklınıza Takılan Sorular`), hemen ardından H4 geliyor. Yasal sayfalarda da H2 → H4.
Bu, kritik bir sıralama sorunu değil (Google atlanan seviyeleri yıllardır tolere ediyor) ama erişilebilirlik denetimlerinde (WCAG 1.3.1) uyarı üretir ve taslağı bozar.
**Çözüm:** Üç `<h4>` → `<h3>`. Alternatif olarak footer başlıkları hiç heading olmak zorunda değil; `<p class="font-bold">` de meşru bir tercih olurdu — ama seçilecekse tutarlı olmalı.

**[İYİLEŞTİRME] | [TrustBar.tsx:16](src/components/TrustBar.tsx#L16) | `<section>` hiç başlık içermiyor.**
Üç güven maddesi (`Derece Yapmış Koçlar`, `İlk Ders %100 Ücretsiz`, `Esnek Online Ders Saatleri`) başlıksız bir `<section>` içinde. Başlıksız `section` erişilebilirlik açısından "adsız bölge" yaratır.
**Çözüm:** Ya `<section>` → `<div>` (en basit, içerik zaten Hero'nun devamı niteliğinde), ya da görsel olarak gizli bir başlık ekle (`<h2 className="sr-only">Neden bizi tercih etmelisiniz</h2>`).

**[İYİLEŞTİRME] | [TestimonialsSection.tsx:157-159](src/components/TestimonialsSection.tsx#L157-L159) | Bir H2 koşullu — Supabase boşsa taslaktan tamamen çıkıyor.**
Yorum yoksa `return null` çalışıyor ve `Velilerimizin Görüşleri` H2'si hiç basılmıyor. Yani sayfanın başlık yapısı veritabanı durumuna göre değişiyor. Faz 1'de sosyal kanıt açısından raporlanmıştı; burada yapısal tutarsızlık boyutu.

---

## 5. Aşırı optimizasyon / keyword stuffing kontrolü

**Bulgu yok — problem ters yönde.**

Hedef kelimelerin başlıklardaki dağılımı:

| Kelime | H1 | H2 (4 adet) | H3 (7 adet) |
|---|---|---|---|
| YKS | ✅ | 0 | 0 |
| LGS | ✅ | 0 | 0 |
| koçluk | ✗ | 0 | 1 (`Koçluk Programı`) |
| özel ders | ✗ | 0 | 1 (`Özel Ders Paketi`) |

Doldurma, tekrar, doğal olmayan kelime yığma, gizli metin, aşırı vurgu — **hiçbiri yok**. Başlıklar temiz ve okunabilir Türkçe. Bu bir güçlü yön; düzeltme yapılırken kelime tıkıştırmaya kaçmadan yukarıdaki önerilerdeki gibi doğal ifadeler korunmalı.

---

## 6. "İlk 100 kelime" kontrolü

Ana sayfanın metin akışı: H1 → 4 avantaj maddesi → CTA → TrustBar → Paketler başlığı → 1. kart.

| Kelime | İlk 100 kelimede? | Nerede |
|---|---|---|
| YKS | ✅ ~1. kelime | H1 |
| LGS | ✅ ~3. kelime | H1 |
| koçluk | ✅ ~30. kelime | `Kişiye Özel Koçluk` ([HeroSection.tsx:43](src/components/HeroSection.tsx#L43)) |
| özel ders | ❌ ~110-130. kelime | `Özel Ders Paketi` ([PackagesSection.tsx:197](src/components/PackagesSection.tsx#L197)) |

**[İYİLEŞTİRME]** `özel ders` ifadesi ilk 100 kelimenin **hemen dışında** kalıyor. Hero'daki avantaj maddesi `YKS & LGS Birebir Ders` diyor ([HeroSection.tsx:36](src/components/HeroSection.tsx#L36)) — "özel ders" demiyor.
**Çözüm:** O maddeyi `YKS & LGS Birebir Özel Ders` yap. Tek kelimelik değişiklik, hem ilk 100 kelime kriterini karşılıyor hem H1 önerisiyle tutarlı.

> ⚠️ Kelime sayıları kaynak koddan manuel sayımla tahmin edildi; canlı sayfadan render edilmiş metin üzerinden ölçülmedi. Kesin sayım Faz 9'da tarayıcı erişimi ile yapılacak. `özel ders` sınırın hemen dışında olduğu için bu tahminin hata payı sonucu değiştirebilir.

---

## 7. Modal içi başlıklar (bilgi amaçlı — SEO etkisi yok)

`PopUpForm` (H2:572, H3:751, H3:830, H4:1035), `KvkkModal` (H3:39, H4 ×8), `MobileLeadSheet` (H2:111) yalnızca açıldıklarında DOM'a giriyor. Arama motoru bunları görmüyor, sayfa taslağını etkilemiyorlar. `PopUpForm` içindeki H2→H3→H4 sıralaması kendi içinde tutarlı; `KvkkModal`'da H3→H4 geçişi de doğru. **Düzeltme gerekmiyor.**

---

## 8. Özet

| Kontrol | Sonuç |
|---|---|
| H1 yok / birden fazla H1 | ✅ Her sayfada tam olarak 1 |
| Atlanmış seviye | ❌ H2 → H4 (footer, 3 sayfada da) |
| Sadece stil için başlık etiketi | ✅ Yok |
| Başlık olması gerekip olmayan içerik | ❌ 6 SSS sorusu |
| Hedef kelime ilk 100 kelimede | ⚠️ 3/4 (`özel ders` eksik) |
| Hedef kelime en az bir H2'de | ❌ Hiçbir H2'de yok |
| Keyword stuffing | ✅ Yok |

Bu fazda **KRİTİK bulgu yok.** İki ÖNEMLİ bulgu (H2'lerde kelime yokluğu, H1-title kopukluğu) tek seferlik metin düzenlemesiyle kapanır ve tek landing page stratejisiyle tamamen uyumludur — yeni sayfa gerektirmez.
