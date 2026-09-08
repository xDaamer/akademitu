# FAZ 8 — MOBİL UYUMLULUK

**Tarih:** 2026-09-07
**Yöntem:** Canlı site, gerçek tarayıcı, 360×740 mobil görünüm (etkin genişlik 352 px). Ölçümler DOM üzerinden yapıldı.

---

## 1. Temel kontroller

| Kontrol | Sonuç |
|---|---|
| `viewport` meta etiketi | ✅ `width=device-width, initial-scale=1.0` — doğru ([index.html:7](index.html#L7)) |
| `maximum-scale` / `user-scalable=no` | ✅ Yok — yakınlaştırma engellenmemiş (erişilebilirlik açısından doğru) |
| `<html lang>` | ✅ `tr` |
| **Yatay taşma** | ✅ **Yok** — `scrollWidth` = `clientWidth` = 352 px |
| Sabit px genişlik | ✅ Yok — koddaki `640px`/`767px` değerleri medya sorgusu eşikleri, düzen genişliği değil |
| **AMP kalıntısı** | ✅ **Yok** — `amp-`, `amphtml`, `<amp` hiçbir yerde geçmiyor |

**Not:** İki dekoratif bulanık daire viewport'un dışına taşıyor ([HeroSection.tsx:16](src/components/HeroSection.tsx#L16), [Footer.tsx:19](src/components/Footer.tsx#L19)) ancak ikisi de `overflow-hidden` ebeveyn içinde ve `pointer-events-none` — **kaydırma çubuğu üretmiyorlar.** Sorun değil, kontrol kaydı olarak yazıldı.

---

## 2. BULGULAR

### ÖNEMLİ

**[ÖNEMLİ] | [PopUpForm.tsx](src/components/PopUpForm.tsx) | Form alanlarının yazı boyutu 14 px — iOS Safari odaklanınca sayfayı otomatik yakınlaştırıyor.**
Ölçüm (canlı, mobil görünüm):

| Alan | Yükseklik | Yazı boyutu |
|---|---|---|
| Ad Soyad (`autocomplete="name"`) | 48 px ✅ | **14 px** ❌ |
| Telefon (`type="tel"`, `inputmode="numeric"`) | 48 px ✅ | **14 px** ❌ |

iOS Safari, yazı boyutu 16 px'in altındaki bir alana odaklanıldığında sayfayı otomatik büyütür ve **geri küçültmez**. Kullanıcı adını yazdıktan sonra yakınlaşmış bir sayfada kalıyor; telefon alanını bulmak için yatay kaydırmak zorunda.
Bu, sitenin **tek dönüşüm yolunun tam ortasında** olan bir hata — iPhone kullanıcılarının form terk oranını doğrudan etkiler.
**Çözüm:** İki input'un yazı boyutunu `text-base` (16 px) yap. Yükseklik ve `autocomplete`/`inputmode` ayarları zaten doğru, sadece bu değişecek.

**[ÖNEMLİ] | Site geneli | 17 görselin **hiçbirinde** `srcset`/`sizes` yok — mobile masaüstü görselleri gönderiliyor.**
Hoca fotoğrafları kaynakta 800×1067 px. Mobilde çizildikleri alan bunun çok altında. 352 px genişlikte bir ekrana 800 px genişliğinde JPEG gönderiliyor.
Faz 4'te ölçülen 639 KB'lık görsel yükünün ve 681 KB'lık tasarruf potansiyelinin büyük kısmı buradan geliyor.
**Çözüm:** `sharp` ([package.json:24](package.json#L24), zaten kurulu ve kullanılmıyor) ile build sırasında 400w/800w varyantları üret, `srcset` + `sizes` ile sun. (Faz 10'da format tarafıyla birlikte.)

**[ÖNEMLİ] | Birden çok konum | 44×44 px altındaki dokunma hedefleri.**

| Öge | Ölçü | Konum |
|---|---|---|
| Footer: `Ana Sayfa` | 64×**17** | [Footer.tsx:48](src/components/Footer.tsx#L48) |
| Footer: `Paketler & Fiyatlar` | 117×**17** | [Footer.tsx:51](src/components/Footer.tsx#L51) |
| Footer: `Neden akademITU?` | 126×**17** | [Footer.tsx:54](src/components/Footer.tsx#L54) |
| Footer: `Sıkça Sorulan Sorular` | 137×**17** | [Footer.tsx:57](src/components/Footer.tsx#L57) |
| Footer: `Gizlilik Politikası` | 90×**16** | [Footer.tsx:103](src/components/Footer.tsx#L103) |
| Footer: `Kullanım Koşulları` | 99×**16** | [Footer.tsx:104](src/components/Footer.tsx#L104) |
| Footer CTA `Ücretsiz Deneme Dersi İste` | 198×**32** | [Footer.tsx:91](src/components/Footer.tsx#L91) |
| Menü aç düğmesi | **40×40** | [Header.tsx:141](src/components/Header.tsx#L141) |
| Pop-up kapat düğmesi | **36×36** | [MobileLeadSheet.tsx:106](src/components/MobileLeadSheet.tsx#L106) |
| KVKK Aydınlatma Metni bağlantısı | 131×**15** | PopUpForm |

Footer bağlantıları 17 px yüksekliğinde ve aralarında ~10 px boşluk var — parmakla isabetli tıklamak zor, yanlış bağlantıya basma olasılığı yüksek.
**Çözüm:** Metin bağlantılarına dikey iç boşluk ver (`py-2`, dokunma alanını ~37 px'e çıkarır) ya da `min-h-[44px] flex items-center`. Görsel tasarım değişmez, sadece tıklanabilir alan büyür. Menü ve kapat düğmeleri için `w-11 h-11` (44 px) yeterli.

### İYİLEŞTİRME

**[İYİLEŞTİRME] | Ana sayfa | 25 metin ögesi 14 px'in altında; 2 tanesi 11 px.**
Yazı boyutu dağılımı (mobil, ana sayfa):

| Boyut | Öge sayısı |
|---|---|
| **11 px** | 2 |
| **12 px** | 21 |
| 14 px | 56 |
| 16 px | 59 |
| 18+ px | 31 |

12 px'lik metinler arasında **satış mesajının kendisi** var: `YKS & LGS Birebir Ders`, `Kişiye Özel Koçluk`, `İlk Ders Ücretsiz`, `Derece Yapmış Koçlar`, `İlk Ders %100 Ücretsiz`, `YKS & LGS Özel Dersleri`. Bunlar hero ve güven şeridindeki en ikna edici ifadeler ve mobilde en küçük punto ile gösteriliyor.
11 px olanlar: `Birebir` rozeti, `KVKK Aydınlatma Metni` bağlantısı.
Denetim planındaki 16 px eşiği gövde metni için bir kılavuzdur; rozet ve etiketlerde 12-14 px kabul edilebilir. Yine de **hero avantaj maddelerinin 14 px'e çıkarılması** hem okunabilirlik hem dönüşüm açısından anlamlı.
**Çözüm:** [HeroSection.tsx:33](src/components/HeroSection.tsx#L33) ve [TrustBar.tsx:42](src/components/TrustBar.tsx#L42) `text-xs` → `text-sm`. 11 px'ler en az 12 px'e çıkarılsın.

---

## 3. Doğru yapılmış olanlar ✅

- **Yatay taşma yok** — Tailwind'in responsive grid'i ve `max-w-*` disiplini düzgün kurulmuş
- **`viewport` doğru**, yakınlaştırma engellenmemiş
- **AMP kalıntısı yok**
- Form alanlarının yüksekliği 48 px — dokunma açısından ideal
- `autocomplete="name"` ve `autocomplete="tel"` doğru ✅ — mobil klavyede otomatik doldurma çalışıyor
- `type="tel"` + `inputmode="numeric"` ✅ — telefon alanında sayısal klavye açılıyor
- Form alanlarının `<label>`'ları mevcut ✅
- **Honeypot doğru gizlenmiş** ([PopUpForm.tsx:647-650](src/components/PopUpForm.tsx#L647-L650)): `absolute -left-[10000px]` + `aria-hidden="true"` + `tabIndex={-1}` + `autoComplete="off"`. Ekran okuyucu ve klavye kullanıcısı bu alana düşmüyor — spam korumasının erişilebilirliği bozmadan yapılmış hâli. **Bu doğru kalıp, dokunulmamalı.**
- Mobil yapışkan CTA `env(safe-area-inset-bottom)` hesaba katıyor ([App.tsx:230](src/App.tsx#L230)) — çentikli cihazlarda doğru davranış
- Mobil menüde odak tuzağı, Escape ile kapatma, arka plan kaydırma kilidi mevcut ([Header.tsx:44-60](src/components/Header.tsx#L44-L60))
- Masaüstü CTA'sı mobilde gizlenmiş, yerine alttaki yapışkan çubuk konmuş — mobil öncelikli düşünülmüş

---

## 4. Ölçülemeyenler

| Ne | Neden | Gereken |
|---|---|---|
| Gerçek iOS Safari otomatik yakınlaştırma davranışı | Chromium ile ölçüldü, Safari motoru farklı | Gerçek iPhone testi |
| Dokunma isabet oranı / gerçek kullanıcı zorluğu | Davranış verisi yok | Hotjar / Clarity benzeri kayıt aracı |
| Çok küçük ekranlarda (320 px) düzen | 360 px'te test edildi | 320 px testi (iPhone SE 1. nesil) |
| Tablet aralığı (768-1024 px) | Test edilmedi | Ek ölçüm |
| Adım 2 form alanları | Adım 1'de kalındı, ikinci adım açılmadı | Formu tamamlayarak test |
