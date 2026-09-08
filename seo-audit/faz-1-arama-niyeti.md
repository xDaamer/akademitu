# FAZ 1 — ARAMA NİYETİ UYUMU

**Tarih:** 2026-09-07
**Kapsam:** 3 indekslenebilir sayfa (`/`, `/gizlilik-politikasi`, `/kullanim-kosullari`) + 404
**Girdi:** Hizmet %100 online, coğrafi hedef yok, kanonik host `https://www.akademitu.com`, içerik stratejisi henüz kararlaştırılmadı.

---

## 1. Mevcut hedef kelimelerin niyet sınıflandırması

`need.json:8` / `index.html:18` içindeki `keywords` listesi:

| Hedef kelime | Gerçek arama niyeti | `/` bunu karşılıyor mu? |
|---|---|---|
| `YKS koçluk` | **Ticari araştırma** — kullanıcı sağlayıcı karşılaştırıyor | Kısmen — fiyat ve kapsam var, karşılaştırma/kanıt yok |
| `LGS koçluk` | **Ticari araştırma** | Kısmen — aynı sayfada YKS ile karışık |
| `YKS özel ders` | **Ticari araştırma / işlemsel** | Evet — paket + fiyat + CTA var |
| `LGS özel ders` | **Ticari araştırma / işlemsel** | Evet, ama YKS'den ayrışmıyor |
| `özel ders` | **Belirsiz baş terim** — piyano, İngilizce, sürücü kursu hepsi bu sorguda | **Hayır** (aşağıda K-01) |
| `TYT koçu` | Ticari araştırma | **Hayır** (K-02) |
| `AYT koçu` | Ticari araştırma | **Hayır** (K-02) |
| `koçluk programı` | **Belirsiz** — yaşam koçluğu / kurumsal koçluk sorgularıyla çakışır | Hayır |

**Hiç hedeflenmemiş niyet tipi: BİLGİSEL.** Bu nişteki arama hacminin ezici çoğunluğu bilgisel sorgulardadır ("YKS ne zaman", "LGS konuları", "TYT netleri nasıl artar", "AYT matematik konuları", "çalışma programı"). Sitede bu niyeti karşılayan **tek bir sayfa yok**.

---

## 2. Sayfa bazlı niyet–içerik uyumu

### `/` (ana sayfa)

| Bölüm | Dosya | Karşıladığı niyet | Uyum |
|---|---|---|---|
| Hero | [HeroSection.tsx:26-63](src/components/HeroSection.tsx#L26-L63) | İşlemsel (CTA) | ✅ Net CTA, "İlk Ders Ücretsiz" |
| TrustBar | [TrustBar.tsx:8-12](src/components/TrustBar.tsx#L8-L12) | Ticari (güven) | ✅ Uydurma istatistik yok, dürüst |
| Paketler | [PackagesSection.tsx:104-346](src/components/PackagesSection.tsx#L104-L346) | Ticari araştırma | ✅ **Sitenin en güçlü SEO varlığı** — fiyatlar açıkça yazılı (0 / 950 / 3.150 TL) |
| Neden Biz | [WhyUsSection.tsx:10-31](src/components/WhyUsSection.tsx#L10-L31) | Ticari (farklılaşma) | ⚠️ Genel ifadeler, doğrulanabilir kanıt yok |
| Yorumlar | [TestimonialsSection.tsx](src/components/TestimonialsSection.tsx) | Ticari (sosyal kanıt) | ⚠️ Supabase'den geliyor; boşsa bölüm tamamen kayboluyor (`return null`, satır 158) |
| SSS | [FAQSection.tsx:9-34](src/components/FAQSection.tsx#L9-L34) | Bilgisel (marka içi) | ✅ İyi yazılmış, ama tamamı **şirket hakkında** — sınav hakkında tek soru yok |

**Sonuç:** `/` ticari + işlemsel niyeti makul karşılıyor. Bilgisel niyeti hiç karşılamıyor.

### `/gizlilik-politikasi` ve `/kullanim-kosullari`
Niyet: gezinme/yasal. İçerik tipi doğru, uyumsuzluk yok. Organik hedef değiller (sitemap'te `priority: 0.3` — doğru karar).

### `*` (404)
[NotFoundPage.tsx](src/pages/NotFoundPage.tsx) doğru davranıyor (ana sayfaya dönüş + WhatsApp). **Ancak SPA olduğu için HTTP durum kodu 200 dönüyor** — soft 404. Faz 5'te işlenecek.

---

## 3. BULGULAR

**[KRİTİK] | `need.json:8` + `index.html:18` | `özel ders` baş terimi hedef kelime olarak listelenmiş.**
Bu sorgu; İngilizce, matematik, piyano, gitar, sürücü kursu dahil onlarca dikeyi kapsar ve Türkiye'de yıllardır kurumsal siteler (dershane zincirleri, ders platformları) tarafından tutulur. 3 sayfalık, geri linki neredeyse olmayan bir site bu terimde sıralanamaz; hedefte tutmak ölçüm ve önceliklendirmeyi bozar.
**Çözüm:** Listeden çıkar. Yerine niyeti net uzun kuyruk: `online yks özel ders`, `online lgs özel ders`, `birebir tyt matematik dersi`.

**[KRİTİK] | [PopUpForm.tsx:37-60](src/components/PopUpForm.tsx#L37-L60) | `TYT koçu` / `AYT koçu` hedefleniyor ama "TYT" ve "AYT" kelimeleri taranabilir sayfa metninde hiç geçmiyor.**
Bu iki kısaltma yalnızca pop-up formun ders seçme listesinde var. Pop-up ise kapalıyken DOM'a hiç basılmıyor ([PopUpForm.tsx:493](src/components/PopUpForm.tsx#L493), [782](src/components/PopUpForm.tsx#L782) — `{isOpen && ...}`). Yani arama motoru bu kelimeleri sayfada göremez. Meta `keywords`'te bir kelimeyi hedefleyip sayfada hiç kullanmamak, o sorgu için sıfır alaka sinyali demektir.
**Çözüm:** Ya TYT/AYT'yi görünür metne taşı (Paketler kartına "TYT & AYT birebir ders", SSS'ye TYT/AYT'ye özel soru), ya da hedeften düşür. Not: `<meta name="keywords">` etiketinin kendisini Google 2009'dan beri yok sayıyor — asıl mesele sayfa metni.

**[ÖNEMLİ] | Site geneli | Bilgisel niyet için tek bir sayfa yok; huninin tepesi tamamen kapalı.**
Bu nişte kullanıcı yolculuğu neredeyse her zaman bilgisel sorguyla başlar ("LGS konuları", "YKS çalışma programı") ve haftalar sonra ticari sorguya döner. Sadece ticari sorguları hedeflemek, en pahalı ve en rekabetçi %10'luk dilimde yarışmak demektir; hem trafik hem de marka bilinirliği tarafı boş kalıyor.
**Çözüm:** Bölüm 5'teki kelime haritasındaki bilgisel kümeden başlayarak içerik üretimi. Karar 3. sorunuza bağlı — Bölüm 6'da veriyle öneriyorum.

**[ÖNEMLİ] | Site geneli | "Hakkımızda" ve "İletişim" sayfası yok.**
Marka gezinme niyeti (`akademitu`, `akademitu iletişim`, `akademitu yorumlar`) için iniş sayfası yok. Eğitim, veli için güven hassasiyeti yüksek bir satın alma; iletişim ve kimlik sayfasının olmaması hem dönüşümü hem E-E-A-T sinyalini düşürür. İletişim bilgisi şu an yalnızca footer'da ve yasal sayfaların 7. maddesinde.
**Çözüm:** `/hakkimizda` ve `/iletisim` sayfaları. (E-E-A-T tarafı Faz 9'da detaylanacak.)

**[ÖNEMLİ] | [index.html:15](index.html#L15) vs. [HeroSection.tsx:27](src/components/HeroSection.tsx#L27) | Title ile H1 arasında niyet köprüsü kopuk.**
Title: "YKS Koçluk & LGS Özel Ders | Derece Öğrencileri ile Koçluk Programı"
H1: "YKS ve LGS için Derece Hocaları ile Hazırlan"
"YKS koçluk" arayan kullanıcı SERP'te aradığı ifadeyi görüp tıklıyor, sayfada onu doğrulayan başlığı bulamıyor. H1'de ne "koçluk" ne "özel ders" geçiyor. Bu hem tıklama sonrası güven kaybı hem zayıf alaka sinyali.
**Çözüm:** H1 hedef ifadeyi doğal biçimde içersin, örn. "YKS ve LGS Koçluğu: Derece Yapmış Hocalarla Birebir Online Özel Ders". (Faz 3'te başlık hiyerarşisiyle birlikte ele alınacak.)

**[ÖNEMLİ] | Tek URL, üç ayrı ticari niyet | `/` aynı anda "YKS koçluk", "LGS koçluk", "YKS özel ders", "LGS özel ders" sorgularını hedefliyor.**
YKS (lise → üniversite, 17-19 yaş) ve LGS (ortaokul → lise, 13-14 yaş) **farklı kullanıcı, farklı karar verici, farklı içerik ihtiyacı**. Tek sayfada birleştirmek her iki sorgu için de içeriği sulandırıyor: LGS arayan veli, sayfanın yarısında kendisiyle ilgisiz YKS içeriği görüyor.
**Çözüm:** Ayrı sayfa açılacaksa ilk bölünme burası: `/yks-kocluk` ve `/lgs-kocluk`.

**[İYİLEŞTİRME] | [index.html:17](index.html#L17) + [PackagesSection.tsx:227](src/components/PackagesSection.tsx#L227) | "Başarı garantili" / "başarı garantisi" iddiası hiçbir kanıtla desteklenmiyor.**
Meta description'da "Başarı garantili çalışma programı" yazıyor, paket kartında "Kişiye özel analiz ile başarı garantisi" geçiyor. Sitede bu garantinin kapsamı, koşulu veya iade şartı hiçbir yerde tanımlı değil — kullanım koşullarında da yok. Bu hem tüketici mevzuatı açısından riskli hem de niyet uyumsuzluğu: "garanti" kelimesiyle gelen kullanıcı garantinin ne olduğunu bulamıyor.
**Çözüm:** Ya garantinin kapsamını açıkça yazan bir bölüm/sayfa ekle, ya ifadeyi "kanıtlanmış yöntem" gibi savunulabilir bir söze çevir.

**[İYİLEŞTİRME] | [FAQSection.tsx:9-34](src/components/FAQSection.tsx#L9-L34) | SSS'nin 6 sorusunun 6'sı da şirket hakkında; sınav hakkında hiç soru yok.**
Mevcut sorular iyi yazılmış ve ticari niyeti destekliyor, sorun değil. Ama SSS bölümü bilgisel sorguları yakalamak için en ucuz araç ve hiç kullanılmıyor.
**Çözüm:** "LGS'de kaç net kaç puan getirir?", "YKS'ye kaç ay kala özel ders başlamalı?" gibi 3-4 sınav odaklı soru ekle. Bunlar FAQPage şemasına da otomatik dahil olur ([FAQSection.tsx:37-59](src/components/FAQSection.tsx#L37-L59)).

**[İYİLEŞTİRME] | [TestimonialsSection.tsx:157-159](src/components/TestimonialsSection.tsx#L157-L159) | Yorum yoksa bölüm tamamen kayboluyor (`return null`).**
Veritabanı boşsa veya Supabase isteği başarısız olursa sosyal kanıt bölümü sessizce yok oluyor — ticari niyetin en kritik sinyali kayboluyor ve sayfa uzunluğu düşüyor. Ayrıca bu içerik istemci tarafında çekildiği için ilk HTML'de asla yok (Faz 5).
**Çözüm:** En azından statik bir yedek (fallback) yorum seti.

---

## 4. Doğru çalışan şeyler (korunmalı)

- Fiyatların açıkça yazılması — Türk eğitim sektöründe fiyat gizlemek standart; şeffaflık gerçek bir ayrışma ve ticari sorgular için güçlü sinyal.
- SSS cevaplarının uzun ve gerçek bilgi içermesi (ortalama ~45 kelime) — snippet potansiyeli var.
- TrustBar'da uydurma istatistik olmaması ([TrustBar.tsx:5-7](src/components/TrustBar.tsx#L5-L7) yorumunda bilinçli tercih olarak belgelenmiş) — E-E-A-T açısından doğru.
- "Online" vurgusunun net olması (SSS 2. soru) — hizmet modeli belirsizliği yok.

---

## 5. Önerilen anahtar kelime haritası

> ⚠️ **Arama hacmi ölçülemedi.** Elimde Keyword Planner / Ahrefs / Semrush erişimi yok. Aşağıdaki sıralama niyet netliği ve rekabet edilebilirlik muhakemesine dayanır, hacim verisine değil. Kesinleştirmek için Search Console'dan son 6 ayın sorgu raporunu (Performans → Sorgular → CSV dışa aktar) paylaşmanız gerekir.

### A. Ticari / işlemsel — ana gelir sorguları
| Kelime | Niyet | Hedef sayfa |
|---|---|---|
| yks koçluk / online yks koçluk | Ticari | `/` veya `/yks-kocluk` |
| lgs koçluk / online lgs koçluk | Ticari | `/` veya `/lgs-kocluk` |
| online yks özel ders | Ticari | aynı |
| online lgs özel ders | Ticari | aynı |
| yks koçluk fiyatları | Ticari — **satın almaya en yakın** | Paketler |
| lgs özel ders ücretleri | Ticari — satın almaya en yakın | Paketler |
| birebir tyt matematik dersi | Ticari, uzun kuyruk | ders sayfası |
| ayt matematik özel ders | Ticari, uzun kuyruk | ders sayfası |
| lgs matematik özel ders | Ticari, uzun kuyruk | ders sayfası |
| üniversite hazırlık koçluğu | Ticari, eşanlamlı | `/yks-kocluk` |

### B. Bilgisel — huni tepesi (şu an %0 kapsanıyor)
`yks çalışma programı` · `lgs çalışma programı` · `tyt netleri nasıl artar` · `ayt matematik konuları` · `lgs konuları ve soru dağılımı` · `yks 2027 ne zaman` · `lgs kaç net kaç puan getirir` · `yks'ye kaç ay kala hazırlanmalı` · `özel ders mi dershane mi`

### C. Marka / gezinme
`akademitu` · `akademitu yorumlar` · `akademitu fiyat` · `akademitu iletişim`
→ Şu an `akademitu iletişim` ve `akademitu yorumlar` için iniş sayfası yok.

### D. Hedeften çıkarılması önerilenler
`özel ders` (baş terim, K-01) · `koçluk programı` (yaşam koçluğuyla çakışıyor) · `TYT koçu` / `AYT koçu` (sayfada karşılığı yok — ya içerik eklenmeli ya düşülmeli)

---

## 6. İçerik stratejisi önerisi (3. sorunun cevabı için)

Denetim bulgularına dayanan önerim: **B seçeneği ile başlayın (ayrı hizmet sayfaları), blogu ikinci aşamaya bırakın.**

Gerekçe:
1. **En büyük tek kazanç YKS/LGS ayrımı.** Bu iki kitle birbiriyle ilgisiz; tek sayfada tutmak her iki ticari sorguda da alaka sinyalini böler. `/yks-kocluk` ve `/lgs-kocluk` açmak, mevcut içeriği yeniden yazmadan ikiye ayırmakla başlayabilir — düşük efor, doğrudan etki.
2. **Blog en pahalı ve en yavaş kanal.** Sürekli içerik üretimi taahhüdü gerektirir; 3 ay yazılıp bırakılan blog, güncellenmemiş içerik olarak Faz 9'da aleyhe döner. Kapasite belli olmadan başlatmak riskli.
3. **`/hakkimizda` + `/iletisim` blogdan önce gelir.** Düşük efor, marka sorgularını yakalar, E-E-A-T ve dönüşüm etkisi doğrudan.

Yani sıra: `/iletisim` + `/hakkimizda` → `/yks-kocluk` + `/lgs-kocluk` → (kapasite varsa) blog.
Bu bir öneridir; nihai karar sizin — Faz 6'da iç link mimarisini seçtiğiniz yola göre kuracağım.

---

## 7. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Gerçek arama hacmi ve rekabet zorluğu | Keyword Planner / Ahrefs / Semrush erişimi |
| Sitenin şu an hangi sorgulardan trafik aldığı | **Search Console → Performans → Sorgular CSV** (sizde var, paylaşırsanız bu bölümü veriye dayandırırım) |
| Rakiplerin bu sorgulardaki konumu | Sıralama takip aracı |
| Sayfa başına gerçek kelime sayısı | Faz 9'da canlı siteden ölçülecek (tarayıcı erişimi izni gerekiyor) |
