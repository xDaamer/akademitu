# FAZ 10 — GÖRSEL OPTİMİZASYONU VE ERİŞİLEBİLİRLİK

**Tarih:** 2026-09-07
**Yöntem:** Erişilebilirlik denetimi canlı sitede **axe-core 4.10.2** ile (WCAG 2.0/2.1 A + AA). Görsel envanteri dosya sisteminden.

> **Ölçüm düzeltmesi:** Bu fazda önce kendi yazdığım kontrast ve odak testlerini çalıştırdım; ikisi de yanlış sonuç verdi (kontrast testi gradient arka planları okuyamıyor, odak testi programatik `focus()` kullandığı için `:focus-visible` tetiklenmiyordu). Aşağıdaki bulgular **axe-core'un çıktısıdır**, kendi ölçümlerimin değil.

---

## 1. Görsel varlık envanteri

| Dosya | Boyut | Ölçü | Format |
|---|---|---|---|
| `public/teachers/bora.jpg` | **145.2 KB** | 800×1067 | JPEG |
| `public/favicon.png` | **121.6 KB** | 512×512 | PNG |
| `public/teachers/celal.jpg` | 108.0 KB | 800×1067 | JPEG |
| `public/teachers/onat.jpg` | 95.5 KB | 800×1067 | JPEG |
| `public/teachers/emre.jpg` | 93.1 KB | 800×1000 | JPEG |
| `public/teachers/nehir.jpg` | 81.6 KB | 800×1067 | JPEG |
| `public/teachers/dila.jpg` | 71.4 KB | 800×1067 | JPEG |
| `public/logo-white.png` | 53.5 KB | 512×512 | PNG |
| `public/teachers/dorukhan.jpg` | 42.6 KB | 800×1067 | JPEG |
| `src/assets/logo-white.png` | 36.5 KB | — | PNG |
| `public/logo.png` | 28.1 KB | 512×512 | PNG |
| `public/logo-blue.png` | 28.1 KB | 512×512 | PNG |
| `src/assets/logo-blue.png` | 20.0 KB | — | PNG |
| `public/favicon.ico` | 3.4 KB | — | ICO |
| **TOPLAM** | **925 KB** | | |

**Format dağılımı: 7 JPEG + 6 PNG + 1 ICO. WebP: 0. AVIF: 0. SVG: 0.**

---

## 2. BULGULAR — Görsel optimizasyonu

**[KRİTİK] | `public/teachers/` | 7 fotoğraf 637 KB; hiçbiri modern formatta değil, hiçbirinde `srcset` yok, hiçbirinde `loading="lazy"` yok.**
Bu bulgu Faz 4 ve Faz 8'de farklı açılardan görüldü; burada görsel katmanının tamamı olarak toplanıyor. Lighthouse'un hesabı: **681 KB tasarruf** = sayfa ağırlığının %73'ü.

Üç eksik ayrı ayrı çarpıyor:
1. **Format:** JPEG → WebP tek başına ~%30 tasarruf
2. **Boyut:** 800 px genişlik mobilde ~%50 fazla → `srcset` ile 400w varyantı
3. **Yükleme:** 7'sinin de `loading="auto"` (canlıda doğrulandı) → görünmeyen 5'i için `lazy`

**Çözüm:** `sharp` **zaten bağımlılıklarda kurulu** ([package.json:24](package.json#L24)) ve **hiçbir yerde kullanılmıyor**. Build adımına bir dönüştürme scripti eklemek için yeni paket gerekmiyor:
```
public/teachers/bora.jpg  →  bora-400.webp, bora-800.webp (+ .jpg yedek)
```
sonra `<picture>` veya `srcset`/`sizes`.

**[ÖNEMLİ] | [TeacherTicker.tsx:552](src/components/TeacherTicker.tsx#L552) | `loading` özniteliği hiç kullanılmamış; LCP görseline lazy verilmemesi kritik.**
Canlıda 17 görselin **17'si de** `loading="auto"`. Şeritte aynı anda 2-3 kart görünürken 7'si birden iniyor; footer logosu ve WhatsApp ikonu da ilk ekranın çok altında olmalarına rağmen hemen yükleniyor.
**Dikkat:** Bileşende zaten bir `priority` bayrağı var ve `fetchPriority="high"` bunun üzerinden veriliyor. `loading` de aynı bayrağa bağlanmalı:
```jsx
loading={priority ? 'eager' : 'lazy'}
```
LCP görseline yanlışlıkla `lazy` konursa Faz 4'teki 3.8 s daha da kötüleşir — bu ayrım korunmalı.

**[ÖNEMLİ] | [public/favicon.png](public/) | 512×512'lik 121.6 KB'lık PNG, `sizes="32x32"` olarak beyan edilmiş.**
[index.html:10](index.html#L10) tarayıcıya 32×32 olduğunu söylüyor, dosya 512×512. Tarayıcı sekme ikonu için 122 KB indiriyor. Aynı dosya `apple-touch-icon` olarak da kullanılıyor ([index.html:12](index.html#L12)) — orada 512×512 doğru, ama tek dosyayla iki işi görmek 32×32 tarafına pahalıya mal oluyor.
**Çözüm:** Gerçek bir 32×32 PNG üret (≈1-2 KB), 512'lik sürüm yalnızca `apple-touch-icon` için kalsın.

**[İYİLEŞTİRME] | `public/logo.png`, `public/logo-blue.png`, `src/assets/logo-blue.png` | Aynı logo üç kopya hâlinde.**
`public/logo.png` ve `public/logo-blue.png` **birebir aynı boyutta** (28.1 KB) — muhtemelen aynı dosyanın iki adı. Ayrıca `src/assets/` altında 20.0 KB'lık üçüncü bir sürüm var. Logo bir SVG olsaydı üçü de ~3 KB tek dosyaya inerdi.
**Çözüm:** Logoyu SVG'ye çevir, kopyaları tekilleştir.

**[İYİLEŞTİRME] | [App.tsx:216](src/App.tsx#L216) | WhatsApp ikonu Google Görseller önbelleğinden geliyor.**
Faz 4'te raporlandı, görsel katmanı bağlamında tekrar: `encrypted-tbn0.gstatic.com/images?q=tbn:...` kalıcı bir CDN değil. `lucide-react` zaten kurulu — SVG ikon bileşeni sıfır ek istekle aynı işi görür.

---

## 3. BULGULAR — Erişilebilirlik (axe-core)

### axe-core sonucu: **24 kural geçti, 1 ihlal, 5 belirsiz**

Bu, denetim gördüğüm siteler arasında iyi bir sonuç. Ayrıntı:

**[İYİLEŞTİRME] | [Footer.tsx:105](src/components/Footer.tsx#L105) | Tek gerçek kontrast ihlali: footer'daki sürüm numarası.**
```
<p class="text-slate-500">v2.0.0</p>
```
Ön plan `#62748e`, arka plan `#212866`, 12 px → **kontrast 2.82:1**, gereken 4.5:1.
Bilgi değeri düşük bir öge (sürüm numarası) ama düzeltmesi tek sınıf: `text-slate-500` → `text-slate-400`.

**[İYİLEŞTİRME] | 5 öge için kontrast **belirlenemedi** (ihlal değil, "incomplete").**
Hero'daki H1 ve dört avantaj maddesi (`YKS & LGS Birebir Ders`, `Kişiye Özel Koçluk`, `Takip & Veli Raporu`, `İlk Ders Ücretsiz`). Sebep: arka plan düz renk değil, `bg-gradient-to-br` ([HeroSection.tsx:14](src/components/HeroSection.tsx#L14)) — axe gradient üzerinde oran hesaplayamıyor.
Manuel değerlendirme: beyaz/açık gri metin `#101442`–`#2a3080` aralığında bir gradient üzerinde; bu kombinasyon **büyük olasılıkla AA'yı geçer**. Ancak `text-slate-200` kullanılan maddeler gradient'in en açık ucunda (`#2a3080`) sınıra yaklaşabilir.
**Çözüm:** Kesinlik isteniyorsa gradient'in en açık noktasında elle ölçüm yapın. Aksiyon zorunlu değil; kayıt için yazıldı.

---

## 4. `alt` metni denetimi

| Durum | Adet |
|---|---|
| `alt` özniteliği **olmayan** görsel | **0** ✅ |
| `alt=""` (dekoratif) | 14 |
| Dolu `alt` | 3 (`akademITU Logo` ×2, `WhatsApp` ×1) |
| Dosya adının `alt` olarak kullanıldığı | **0** ✅ |

**Hoca fotoğrafları `alt=""` — teknik olarak doğru, stratejik olarak tartışmalı.**
14 fotoğrafın hepsi `alt=""`. Bu **kasıtlı ve doğru uygulanmış** bir kalıp: şeridin tamamı `role="img"` + `aria-label="Derece hocalarımızdan kareler"` ile tek bir görsel bölge olarak sunuluyor ([TeacherTicker.tsx:287-288](src/components/TeacherTicker.tsx#L287-L288)), gerekçesi de kodda yazılı ([TeacherTicker.tsx:545-546](src/components/TeacherTicker.tsx#L545-L546)). axe `role-img-alt` ve `image-alt` kurallarını geçiyor ✅.

**Ancak** Faz 9'daki K-03 ile doğrudan çelişiyor: bu fotoğraflar sitenin tek E-E-A-T kanıtı olması gereken içerik. "Dekoratif" ilan edilmeleri, hem ekran okuyucu kullanıcısının hem arama motorunun hoca kadrosu hakkında hiçbir şey öğrenememesi demek.
**Çözüm:** Fotoğraflara isim/derece bilgisi eklenirse (Faz 9 K-03), `alt` da içerik taşımalı: `alt="Dila — İTÜ Endüstri Mühendisliği, YKS Sayısal derecesi"`. O zaman `role="img"` sarmalayıcısı kaldırılıp her kart kendi başına anlamlı hâle gelir.

**[İYİLEŞTİRME] | [Footer.tsx:29](src/components/Footer.tsx#L29) ve Header | `alt="akademITU Logo"` — "Logo" kelimesi gereksiz.**
Ekran okuyucular `<img>`'i zaten "görsel/image" diye duyuruyor; `alt` içinde "Logo" demek "görsel akademITU Logo" gibi bir tekrar üretir. Logo aynı zamanda bir bağlantının içinde olduğu için `alt` bağlantının erişilebilir adı oluyor.
**Çözüm:** `alt="akademITU"` (ya da bağlantı hedefini yansıtan `alt="akademITU ana sayfa"`).

---

## 5. Geçen erişilebilirlik kuralları ✅

axe-core'un doğruladığı 24 kural arasında dikkate değer olanlar:

| Kural | Anlamı |
|---|---|
| `button-name` | Tüm butonların erişilebilir adı var |
| `link-name` | Tüm bağlantıların erişilebilir adı var |
| `image-alt` / `role-img-alt` | Tüm görsellerde `alt`, `role="img"` ögelerinde ad var |
| `html-has-lang` / `html-lang-valid` | `lang="tr"` doğru |
| `meta-viewport` | Yakınlaştırma engellenmemiş |
| `nested-interactive` | İç içe tıklanabilir öge yok |
| `aria-*` (10 kural) | ARIA kullanımı geçerli — yanlış rol, geçersiz öznitelik, `aria-hidden` altında odaklanabilir öge yok |
| `list` / `listitem` | Liste yapısı doğru |
| `bypass` | Tekrarlayan içeriği atlama yolu mevcut |

**Ayrıca kod incelemesinde doğrulananlar:**
- **Odak halkası mevcut ve marka rengiyle tanımlı** — `focus-visible:ring-2 ring-[#c5a059] ring-offset-2` ([Button.tsx:54](src/components/ui/Button.tsx#L54)). Kod yorumu bunun bilinçli olarak eklendiğini söylüyor. *(Kendi ilk testim "4 butonda odak halkası yok" demişti — o test programatik `focus()` kullandığı için `:focus-visible` tetiklenmemişti; hatalıydı.)*
- **SSS akordeonu** `aria-expanded` + görünür odak halkası ile ([FAQSection.tsx:96-99](src/components/FAQSection.tsx#L96-L99))
- **Mobil menü**: Escape ile kapanma, odak paneline geçiş, kapanınca tetikleyiciye dönüş, arka plan kaydırma kilidi ([Header.tsx:44-60](src/components/Header.tsx#L44-L60))
- **Form etiketleri** mevcut, `autocomplete` ve `inputmode` doğru (Faz 8)
- **Honeypot** `aria-hidden` + `tabIndex={-1}` ile ekran okuyucudan ve klavyeden gizli (Faz 8)
- **Yıldız derecelendirmesi** `aria-label={rating}/5 yıldız` ile ([TestimonialsSection.tsx:231](src/components/TestimonialsSection.tsx#L231))
- **`prefers-reduced-motion`** destekleniyor ([TestimonialsSection.tsx:41-43](src/components/TestimonialsSection.tsx#L41-L43))
- **Landmark yapısı** doğru: 1 `<main>`, 1 `<nav>`, 1 `<header>`, 1 `<footer>`

**[İYİLEŞTİRME] | Site geneli | "İçeriğe atla" (skip link) yok.**
axe `bypass` kuralı `<main>` landmark'ı sayesinde geçiyor, yani teknik ihlal değil. Yine de klavye kullanıcısı için header'ı atlayan görünür bir skip link, sabit header + mobil menü olan sitelerde faydalıdır. Düşük öncelik.

---

## 6. Ölçülemeyenler

| Ne | Neden | Gereken |
|---|---|---|
| Hero gradient üzerindeki gerçek kontrast oranları | axe gradient hesaplayamıyor | Gradient'in en açık noktasında elle ölçüm |
| Ekran okuyucu ile gerçek kullanım deneyimi | Otomatik araçlar sorunların ~%30-40'ını yakalar | NVDA / VoiceOver ile elle test |
| Pop-up formunun tam erişilebilirlik denetimi | axe form kapalıyken çalıştırıldı | Form açıkken ayrı axe çalıştırması |
| Yorumlar bölümünün erişilebilirliği | Canlıda hiç render olmuyor (Faz 9 K-02) | Veri girildikten sonra |
| Klavyeyle uçtan uca gezinme akışı | Otomatik test yeterli değil | Elle Tab tuşu testi |
