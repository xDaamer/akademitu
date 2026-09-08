# FAZ 5 — TARANABİLİRLİK VE İNDEKSLENEBİLİRLİK

**Tarih:** 2026-09-07 · Canlı site üzerinde doğrulandı (`curl`).

---

## 1. HTTP durum kodu haritası

| URL | Durum | Beklenen | Değerlendirme |
|---|---|---|---|
| `/` | 200 | 200 | ✅ |
| `/gizlilik-politikasi` | 200 | 200 | ✅ |
| `/kullanim-kosullari` | 200 | 200 | ✅ |
| `/bu-sayfa-yok-12345` | **200** | **404** | ❌ Soft 404 |
| `/sitemap.xml` | 200 | 200 | ✅ |
| `/robots.txt` | 200 | 200 | ✅ |
| `/api/health` | **500** | 200 | ❌ Sunucu tarafı tamamen kırık |

## 2. Yönlendirme zinciri

```
http://akademitu.com/       308 →  https://akademitu.com/       308 →  https://www.akademitu.com/
                                    ^^^^^^^^^^^^^^^^^^^^^^^^ iki atlamalı zincir
```

---

## 3. BULGULAR

### KRİTİK

**[KRİTİK] | [main.tsx:7](src/main.tsx#L7) + [vercel.json](vercel.json) | Her route birebir aynı, içeriği boş HTML döndürüyor.**

Canlı sitede doğrulandı:
```html
<body class="...">
  <div id="root"></div>
</body>
```
`/` ve `/gizlilik-politikasi` **byte-byte aynı** (ikisi de 3581 byte). Sitedeki hiçbir metin — H1, paketler, fiyatlar, SSS cevapları — ilk HTML'de yok.

Sonuçları:
- **Googlebot** JS render eder, ama render kuyruğu ayrı ve gecikmelidir; yeni bir sitede indekslenme haftalarca gecikebilir.
- **Bingbot, Yandex, sosyal medya crawler'ları (WhatsApp, X, LinkedIn önizlemesi), LLM tarayıcıları (GPTBot, ClaudeBot, PerplexityBot)** JS çalıştırmaz veya sınırlı çalıştırır. Bunlar için site **tamamen boş**.
- Faz 2'deki canonical/description sorunlarının, Faz 4'teki 1.9 saniyelik LCP gecikmesinin ve buradaki tüm bulguların **ortak kök nedeni budur.**

**Çözüm seçenekleri (tek landing page stratejisine göre sıralı):**
1. **Prerender (önerilen):** `vite-plugin-prerender` benzeri bir build adımı 3 route'u statik HTML'e basar. SSR altyapısı, sunucu, runtime maliyeti gerektirmez; Vercel'de statik dosya olarak servis edilir. Mimariye en az müdahale eden çözüm.
2. **Kritik içeriği `index.html`'e statik yazmak:** H1, ilk paragraf ve paketlerin özeti elle HTML'e konur, React hydrate edince üzerine biner. Ucuz ama iki kaynağı senkron tutma borcu yaratır.
3. **SSR'a geçiş:** Tek landing page için aşırı; `server.ts` zaten Vercel'de çalışmıyor (aşağıda K-02).

**[KRİTİK] | [api/[...path].ts](api/) + [server.ts](server.ts) | `/api/health` canlıda 500 dönüyor — sunucu tarafının tamamı kırık.**
CLAUDE.md'de `FUNCTION_INVOCATION_FAILED` olarak belgelenen durum canlıda teyit edildi. Doğrudan SEO etkisi sınırlı (form ve yorumlar Supabase'e doğrudan gidiyor), **ancak**:
- `server.ts`'teki dinamik `/sitemap.xml` ve `/robots.txt` route'ları ([server.ts:130](server.ts#L130), [server.ts:154](server.ts#L154)) hiçbir zaman çalışmıyor. Canlıda servis edilenler `public/` altındaki statik dosyalar. Yani **aynı işi yapan iki kod yolu var, biri ölü**.
- Bir tarayıcı `/api/*` altında bir URL keşfederse 500 alır; tekrarlanan 500'ler tarama bütçesini olumsuz etkiler.
**Çözüm:** Ya Vercel fonksiyonu onarılsın, ya `/api/*` tamamen kaldırılıp `server.ts`'in ölü SEO route'ları silinsin. Mevcut hâl "iki kaynak, biri sessizce ölü".

> ✅ **2026-09-08 — teşhis kondu ve düzeltildi.** Vercel runtime logu sebebi verdi:
> `ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'`.
> `api/[...path].ts` uzantısız `"../server"` import ediyordu; proje `"type": "module"`
> olduğu için fonksiyon ESM çalışıyor ve Node'un ESM çözümleyicisi uzantı tahmin etmez.
> Detay: [01-uygulanan-duzeltmeler.md](01-uygulanan-duzeltmeler.md) § 6.

### ÖNEMLİ

**[ÖNEMLİ] | [vercel.json:6-9](vercel.json#L6-L9) | Var olmayan her URL 200 + `index, follow` dönüyor (soft 404).**
`/bu-sayfa-yok-12345` → 200 OK, `<meta name="robots" content="index, follow">` ([index.html:21](index.html#L21)), ana sayfa canonical'ı.
Statik hosting'de SPA için gerçek 404 durum kodu döndürmek mümkün değil — bu mimarinin kabul edilen sınırı. Ama Google'a "bu sayfa yok" demenin ikinci yolu var: `noindex`.
Şu an canonical `/`'e işaret ettiği için hasar sınırlı, fakat Google canonical'ı yok sayabilir ve uydurma URL'leri "soft 404" olarak raporlar.
**Çözüm:** `NotFoundPage` mount olduğunda `<meta name="robots" content="noindex">` bassın. React 19 bunu bileşen içinde doğal destekliyor. (Faz 2'deki route bazlı `<head>` yönetimiyle aynı düzeltme.)

**[ÖNEMLİ] | `public/robots.txt` son satır | `Sitemap:` direktifi www'suz adresi gösteriyor.**
```
Sitemap: https://akademitu.com/sitemap.xml
```
Bu adres 308 ile www'luya yönleniyor. Google yönlendirmeyi takip eder ama sitemap referansının doğrudan kanonik adresi vermesi beklenir. Aynı şekilde `sitemap.xml`'in **üç `<loc>` girdisinin üçü de** www'suz — yani sitemap'te listelenen hiçbir URL kanonik değil.
**Çözüm:** [need.json:5](need.json#L5) `domain` → `https://www.akademitu.com`, sonra `npm run build`. Tek değişiklikle robots.txt + sitemap.xml birlikte düzelir. (Faz 2'de K-02 olarak raporlandı.)

**[ÖNEMLİ] | Yönlendirme zinciri: `http://akademitu.com` → 2 atlama.**
`http://akademitu.com/` → `https://akademitu.com/` → `https://www.akademitu.com/`. Her atlama gecikme ekler ve link değerinin küçük bir kısmını sızdırır. Eski basılı materyal, sosyal medya profili veya bir dizin sitesi www'suz http adresini veriyorsa bu zincir her ziyarette işliyor.
**Çözüm:** Vercel domain ayarlarında `http://akademitu.com` ve `https://akademitu.com` için doğrudan `https://www.akademitu.com`'a tek atlamalı yönlendirme tanımla.

### İYİLEŞTİRME

**[İYİLEŞTİRME] | [scripts/generate-seo.ts:35-57](scripts/generate-seo.ts#L35-L57) | robots.txt'te bu sitede karşılığı olmayan yollar listeleniyor.**
```
Allow: /public/          ← prod'da böyle bir yol yok (Vite public/ içeriğini köke taşır)
Allow: /index.html       ← gereksiz, / zaten Allow
Disallow: /src/          ← prod'da yok (build /assets/ üretir)
Disallow: /dist/         ← prod'da yok
Disallow: /node_modules/ ← hiç yayınlanmıyor
Disallow: /.git/         ← hiç yayınlanmıyor
Disallow: /admin/ /dashboard/ /user/ /account/ /checkout/ /cart/  ← hiçbiri mevcut değil
```
Zararlı değil, ama hepsi jenerik şablon kalıntısı. Var olmayan yolları listelemek dosyayı okunmaz yapar ve gerçek bir kural eklendiğinde gözden kaçmasına yol açar.
**Çözüm:** Sadeleştir. Gerçekten anlamlı olan tek Disallow adayı `/api/` (şu an 500 döndüren, indekslenmesi istenmeyen alan).

**[İYİLEŞTİRME] | robots.txt | `Crawl-delay: 1` — Google bu direktifi yok sayar.**
Googlebot `Crawl-delay`'i desteklemez (tarama hızı GSC'den ayarlanır). Bing ve Yandex uygular; 3 sayfalık bir sitede taramayı yavaşlatmanın hiçbir faydası yok, sadece yeni içeriğin keşfini geciktirir.
**Çözüm:** Sil.

**[İYİLEŞTİRME] | [server.ts:362](server.ts#L362) | Tek `http://` referansı — sadece bir konsol log satırı.**
`console.log(\`Server running on http://0.0.0.0:${PORT}\`)`. Kullanıcıya sunulan hiçbir bağlantı değil, karışık içerik (mixed content) riski yok. **Aksiyon gerekmiyor** — kontrol kaydı olarak yazıldı.

---

## 4. Temiz çıkan kontroller ✅

| Kontrol | Sonuç |
|---|---|
| Yanlışlıkla `noindex` bırakılmış sayfa | ✅ Yok — kodda tek `robots` etiketi var, o da `index, follow` |
| `nofollow` bırakılmış iç link | ✅ Yok |
| Staging'den kalmış engelleme kuralı | ✅ Yok — robots.txt production için üretiliyor |
| robots.txt önemli dizin kapatıyor mu | ✅ Hayır — `/assets/` (JS/CSS) ve `/teachers/` (görseller) açık; Google'ın render için ihtiyacı olan kaynaklar engellenmemiş |
| robots.txt erişilebilir mi | ✅ 200 |
| sitemap.xml geçerli XML mi | ✅ Geçerli, 3 URL |
| sitemap robots.txt'te referanslı mı | ✅ Evet (host yanlış ama var) |
| sitemap güncel mi | ✅ `lastmod: 2026-09-04` = son commit tarihi |
| Hardcoded `http://` bağlantı | ✅ Yok (tek istisna console.log) |
| Yönlendirme döngüsü | ✅ Yok |
| Google Search Console doğrulaması | ✅ [index.html:5](index.html#L5) mevcut |
| `hreflang` gerekliliği | ✅ Tek dil, tek pazar — gerekmiyor |
| Sayfalama / faceted URL kirliliği | ✅ Yok |

---

## 5. Bu fazın özeti

`robots.txt`, `sitemap.xml`, yönlendirmeler ve engelleme kuralları tarafında **ciddi bir hata yok** — sadece kozmetik temizlik ve host düzeltmesi gerekiyor.

Gerçek sorun tek bir yerde toplanıyor: **sunucu hiçbir route için içerik döndürmüyor.** Denetimin buraya kadarki en yüksek etkili tek bulgusu budur ve Faz 2 (canonical/description), Faz 4 (LCP) bulgularının da kök nedenidir.

---

## 6. Ölçülemeyenler

| Ne | Gereken |
|---|---|
| Sayfaların şu an indekste olup olmadığı | GSC → Dizin → Sayfalar (erişiminiz var) |
| Googlebot'un render kuyruğunda ne kadar beklediği | GSC → URL Denetimi → "Canlı URL'yi test et" → Oluşturulan HTML |
| Gerçek tarama sıklığı | GSC → Ayarlar → Tarama istatistikleri |
| Vercel fonksiyonunun 500 sebebi | Vercel → Functions → Logs |
