# FAZ 2 — TITLE, META DESCRIPTION, URL

**Tarih:** 2026-09-07
**Strateji girdisi:** Tek landing page (`/`) — yeni sayfa açılmayacak. Yasal sayfalar organik hedef değil ama **indekslenebilir olmalı**.
**Kanonik host:** `https://www.akademitu.com` (www'suz 301 ile yönleniyor)

---

## 1. Ölçüm tablosu

| Etiket | Uzunluk | Sınır | Durum |
|---|---|---|---|
| `<title>` | **79 krk** | ~60 | ❌ Kesilecek |
| `og:title` | 67 krk | ~60-70 | ⚠️ Sınırda |
| `meta description` | 142 krk | ~155 | ✅ |
| `og:description` | 142 krk | ~200 | ✅ |
| `need.json` `/` title | 67 krk | ~60 | ⚠️ (zaten kullanılmıyor) |
| `need.json` `/` description | 125 krk | ~155 | ✅ (zaten kullanılmıyor) |

**Görsel varlıklar:**

| Dosya | Boyut | Ölçü | Not |
|---|---|---|---|
| `public/logo.png` (og:image) | 28 KB | **512×512 kare** | `summary_large_image` 1.91:1 bekler |
| `public/favicon.png` | **122 KB** | **512×512** | `sizes="32x32"` diye beyan edilmiş |
| `public/favicon.ico` | 3 KB | — | ✅ |

---

## 2. BULGULAR

### KRİTİK

**[KRİTİK] | [index.html:20](index.html#L20) | Tüm route'lar ana sayfanın canonical'ını miras alıyor.**
SPA olduğu için `/gizlilik-politikasi` ve `/kullanim-kosullari` istendiğinde sunucu **aynı `index.html`'i** döndürüyor ([vercel.json:6-9](vercel.json#L6-L9)). O dosyada `<link rel="canonical" href="https://akademitu.com/">` yazıyor. Yani her iki yasal sayfa Google'a "ben aslında ana sayfayım" diyor. Sonuç: sitemap'te listelenmiş olmalarına rağmen **ikisi de indeksten düşer**, GSC'de "Alternatif sayfa (uygun kanonik etiketi var)" olarak raporlanır. Aynı şey her 404 URL'i için de geçerli — `/rastgele-bir-sey` de 200 + ana sayfa canonical'ı döndürüyor.
**Çözüm:** Route bazlı canonical. Tek landing page stratejisinde bile şart; `need.json.seo.pages` verisi zaten mevcut, sadece `<head>`'e bağlanmıyor.

**[KRİTİK] | [index.html:20,25,35](index.html#L20) + [need.json:5](need.json#L5) | Kanonik host www'suz, canlı site www'lu.**
`canonical`, `og:url`, `twitter:url` ve `sitemap.xml`'in 3 URL'inin tamamı `https://akademitu.com` (www'suz). Canlı adres `https://www.akademitu.com`. Bu adresler 301'leniyor, dolayısıyla felaket değil — ama: canonical bir yönlendirmeyi işaret ediyor (zayıf/çelişkili sinyal), sitemap tamamen yönlendirilen URL'lerden oluşuyor (GSC "Sayfa yönlendirmeli" uyarısı + boşa tarama bütçesi), ve JSON-LD ([App.tsx:28,45](src/App.tsx#L28)) www'lu — kod içinde **iki farklı doğru** var.
**Çözüm:** `need.json.site.domain` → `https://www.akademitu.com`. `index.html`'deki hardcoded canonical/og:url/twitter:url eşitlensin.

**[KRİTİK] | [index.html:17](index.html#L17) | Üç sayfanın üçü de aynı meta description'ı paylaşıyor.**
Yasal sayfalar SERP'te "YKS ve LGS hazırlık için... Başarı garantili çalışma programı" açıklamasıyla görünüyor — içerikle hiç ilgisi yok. GSC bunu "Yinelenen meta açıklamalar" olarak raporlar. `need.json` bu sayfalar için doğru açıklamaları zaten tutuyor ([need.json:47,55](need.json#L47)), sadece hiçbir zaman kullanılmıyor.
**Çözüm:** K-01'le aynı düzeltme — route bazlı `<head>` yönetimi.

### ÖNEMLİ

**[ÖNEMLİ] | [index.html:15](index.html#L15) | Title 79 karakter — SERP'te kesilecek ve marka adı kaybolacak.**
`YKS Koçluk & LGS Özel Ders | Derece Öğrencileri ile Koçluk Programı | akademITU`
Google başlıkları ~600 piksel / kabaca 60 karakterde keser; Türkçe karakterler biraz daha geniş. Kesilen kısım tam olarak `| akademITU` — yeni bir sitede marka adının SERP'te hiç görünmemesi demek. Ayrıca **"Koçluk" kelimesi başlıkta iki kez** geçiyor ("YKS Koçluk" + "Koçluk Programı"); bu ek sıralama getirmez, sadece yer kaplar.
**Önerilen (56 krk):** `YKS ve LGS Koçluğu | Derece Hocalarıyla Online Özel Ders`
Alternatif, marka öne çıksın isterseniz (49 krk): `Online YKS & LGS Koçluğu ve Özel Ders | akademITU`

**[ÖNEMLİ] | [index.html:26,36](index.html#L26) | `og:image` 512×512 kare, ama `twitter:card` `summary_large_image`.**
`summary_large_image` 1.91:1 (ideali 1200×630) bekler. Kare bir logo verildiğinde WhatsApp/X/Facebook ya kenarlarından kırpar ya küçük kare karta düşer. Yeni bir markada paylaşım görünümü ilk izlenim; şu an logo dışında hiçbir mesaj taşımıyor.
Ayrıca eksik: `og:image:width`, `og:image:height`, `og:image:alt`, `og:site_name`.
**Çözüm:** 1200×630 bir OG görseli üret (logo + "YKS & LGS Koçluğu · İlk Ders Ücretsiz" gibi bir mesaj), boyut/alt etiketlerini ekle.

**[ÖNEMLİ] | [vite.config.ts:16-30](vite.config.ts#L16-L30) | `seo-html-transform` plugin'i ölü kod — `index.html`'de tek bir placeholder yok.**
Plugin `{{site.title}}`, `{{site.description}}` vb. arıyor; `index.html`'de bunlardan **sıfır tane** var (doğrulandı). Yani "need.json tek kaynaktır" mimarisi metin tarafında fiilen kopuk ve iki kaynak birbirinden **şu an bile farklı**:
- `index.html` description: 142 krk ("...ve takip sistemi." ile biter)
- `need.json` `/` description: 125 krk (o cümle yok)
Sitemap bir metni, gerçek sayfa başka bir metni kullanıyor.
**Çözüm:** Ya `index.html`'i placeholder'lara çevirip plugin'i canlandır, ya plugin'i sil ve `need.json`'un metin alanlarının sadece sitemap için olduğunu belgele. İkisi arasında karar sizin — ama mevcut hâl "iki kaynak, ikisi de yarım".

**[ÖNEMLİ] | [vercel.json:6-9](vercel.json#L6-L9) + [index.html:19](index.html#L19) | Var olmayan URL'ler HTTP 200 + `index, follow` dönüyor (soft 404).**
Rewrite kuralı `/api` dışındaki her şeyi `index.html`'e veriyor. `/asdf` isteği: 200 OK, `robots: index, follow`, ana sayfa canonical'ı. Google bunu "soft 404" olarak işaretler; çok sayıda uydurma URL'e link verilirse tarama bütçesi boşa gider.
**Çözüm:** Faz 5'te detaylanacak — bilinmeyen route'ta `<meta name="robots" content="noindex">` bas (canonical zaten `/`'e işaret ettiği için hasar sınırlı, ama durum kodu düzeltilemez: statik hosting'de SPA 404'ü 200'dür).

### İYİLEŞTİRME

**[İYİLEŞTİRME] | [index.html:16](index.html#L16) | `<meta name="title">` standart dışı.**
Böyle bir etiket spesifikasyonda yok; hiçbir arama motoru okumuyor. `<title>` zaten var. Zararsız ama gereksiz ve iki yerde senkron tutulması gereken ikinci bir metin yaratıyor. **Sil.**

**[İYİLEŞTİRME] | [index.html:18](index.html#L18) | `<meta name="keywords">` — Google 2009'dan beri yok sayıyor.**
Sıralamaya etkisi sıfır. Tek gerçek etkisi: hedef kelime stratejinizi rakiplere açık ediyor. Ayrıca Faz 1'de tespit edilen hatalı kelimeleri (`özel ders`, `TYT koçu`) barındırıyor. **Sil** — kelime stratejisi `need.json`'da kalabilir, HTML'de bulunmasının faydası yok.

**[İYİLEŞTİRME] | [index.html:20](index.html#L20) | `<meta name="language" content="Turkish">` standart dışı.**
Dil bilgisi `<html lang="tr">` ([index.html:2](index.html#L2)) ile zaten doğru veriliyor. Bu etiket yok sayılıyor. **Sil.**

**[İYİLEŞTİRME] | [index.html:33-37](index.html#L33-L37) | Twitter etiketleri `property=` ile yazılmış, spesifikasyon `name=` diyor.**
Çoğu ayrıştırıcı ikisini de kabul eder, ama X'in kendi doğrulayıcısı `name` bekler. Ayrıca `twitter:site` (marka hesabı) eksik.
**Çözüm:** `property="twitter:*"` → `name="twitter:*"`, `<meta name="twitter:site" content="@akademitu">` ekle.

**[İYİLEŞTİRME] | [index.html:10](index.html#L10) | `favicon.png` 512×512 ve 122 KB, ama `sizes="32x32"` beyan edilmiş.**
Tarayıcı 32×32 sanıp 512×512'lik 122 KB'lık dosyayı indiriyor. Beyan yanlış, dosya gereksiz büyük. (Performans etkisi Faz 4'te, dosya boyutu Faz 10'da tekrar ele alınacak.)
**Çözüm:** Gerçek 32×32 bir PNG üret ya da `sizes="512x512"` yaz; 512'lik sürüm zaten `apple-touch-icon` için gerekli.

**[İYİLEŞTİRME] | [index.html:17](index.html#L17) | Description "Başarı garantili" diyor — Faz 1'deki tanımsız garanti iddiasının SERP'e yansıması.**
Meta description'da verilen söz sayfada karşılanmıyor (garantinin kapsamı hiçbir yerde yazılı değil). Tıklayan kullanıcı aradığını bulamayınca geri dönüyor.
**Önerilen (139 krk):** `Derece yapmış hocalarla YKS ve LGS için birebir online özel ders ve koçluk. İlk ders ücretsiz, taahhüt yok. Ders başı 950 TL, şeffaf fiyat.`
Bu sürüm somut, doğrulanabilir ve sayfanın gerçek gücünü (şeffaf fiyat, taahhütsüz deneme) SERP'e taşıyor.

---

## 3. URL / Slug yapısı — **temiz**

| Kontrol | Durum |
|---|---|
| Query string kullanımı | ✅ Yok |
| URL'de tarih | ✅ Yok |
| Rastgele ID | ✅ Yok |
| Türkçe karakter (ı, ş, ğ, ü, ö, ç) | ✅ Yok — `gizlilik-politikasi`, `kullanim-kosullari` doğru şekilde ASCII'ye çevrilmiş |
| Alt çizgi (`_`) | ✅ Yok, tire kullanılmış |
| Gereksiz derinlik | ✅ Hepsi 1. seviye |
| Büyük harf | ✅ Yok |
| Trailing slash tutarlılığı | ✅ Sitemap tutarlı |

Bu bölümde düzeltilecek bir şey yok. Slug'lar Türkçe SEO açısından doğru kurulmuş.

---

## 4. Özet: kaç şey nereden düzeltilir

Bu fazın **beş bulgusu tek bir mimari eksikten** doğuyor: **route bazlı `<head>` yönetimi yok.**
K-01 (canonical), K-03 (yinelenen description), Ö-04'ün noindex kısmı ve Faz 1'deki title/H1 kopukluğunun bir kısmı — hepsi aynı çözümle kapanır.

Tek landing page stratejisinde bile bu gerekli, çünkü yasal sayfalar ve 404 hâlâ ayrı `<head>` istiyor. React 19 `<title>`/`<meta>` etiketlerini bileşen içinde doğal olarak destekliyor (ek kütüphane gerekmez) — projede React 19.0.1 kurulu.

---

## 5. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Google'ın başlığı gerçekte nasıl kestiği / yeniden yazdığı | GSC Performans verisi (site yeni, veri yok) |
| Sosyal paylaşım kartının gerçek görünümü | X Card Validator / Facebook Sharing Debugger (ağ erişimi izni gerekli) |
| Yasal sayfaların şu an indekste olup olmadığı | `site:akademitu.com` sorgusu veya GSC URL Denetimi |
