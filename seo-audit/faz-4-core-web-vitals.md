# FAZ 4 — CORE WEB VITALS (LCP / INP / CLS)

**Tarih:** 2026-09-07
**Ölçüm:** Lighthouse 12.x, canlı site `https://www.akademitu.com`, simüle edilmiş throttling.
**Not:** Bunlar **laboratuvar** verisidir. Google sıralamada **saha (CrUX) verisi** kullanır; site yeni olduğu için henüz CrUX eşiği dolmamış olabilir. Laboratuvar iyi görünse bile saha farklı çıkabilir.

---

## 1. Skorlar

| Metrik | 📱 Mobil | 💻 Masaüstü | Google eşiği | Durum |
|---|---|---|---|---|
| **Performans skoru** | **82** | **97** | — | Mobilde iyileştirilebilir |
| **SEO skoru** | **100** | **100** | — | ✅ |
| **LCP** | **3.8 s** | 1.1 s | ≤2.5 s iyi / >4.0 s kötü | ⚠️ **Mobilde "iyileştirme gerekli" bandında** |
| **CLS** | **0** | 0 | ≤0.1 | ✅ **Mükemmel** |
| **TBT** (INP vekili) | **80 ms** | 0 ms | ≤200 ms | ✅ |
| FCP | 2.6 s | 0.7 s | ≤1.8 s | ⚠️ |
| Speed Index | 4.8 s | 0.9 s | — | ⚠️ |
| Sunucu yanıtı | 50 ms | — | ≤600 ms | ✅ Çok iyi (Vercel CDN) |
| Toplam sayfa ağırlığı | **936 KB** | — | — | ⚠️ |

**Tek cümlelik teşhis:** Masaüstü neredeyse kusursuz; **tek gerçek problem mobil LCP** ve onun da tek bir kaynağı var.

---

## 2. LCP — kök neden analizi

**LCP elementi:**
```html
<img alt="" width="800" height="1067" decoding="async" fetchpriority="high"
     class="w-full h-full object-cover" src="/teachers/dila.jpg">
```
Yani sayfanın en büyük ögesi H1 değil, **hero'nun sağındaki hoca fotoğrafı şeridinden bir kare** ([TeacherTicker.tsx:541-556](src/components/TeacherTicker.tsx#L541-L556)).

**LCP zaman kırılımı (mobil, toplam ~2.5 s + gecikmeler):**

| Aşama | Süre | Yorum |
|---|---|---|
| Time to first byte | 219 ms | ✅ Sorun değil |
| **Resource load delay** | **884 ms** | ❌ Görsel *keşfedilene kadar* geçen boşluk |
| Resource load duration | 403 ms | ⚠️ Görselin kendisi büyük |
| **Element render delay** | **1041 ms** | ❌ JS çalışıp DOM'a basana kadar |

**[KRİTİK] | [main.tsx:7](src/main.tsx#L7) + [index.html:56](index.html#L56) | LCP gecikmesinin ~1.9 saniyesi doğrudan CSR mimarisinden geliyor.**
884 ms "resource load delay" + 1041 ms "element render delay" = tarayıcının HTML'i alıp da ekrana bir şey basamadığı süre. Sebebi mimari: ilk HTML'de `<div id="root"></div>` dışında hiçbir şey yok. Tarayıcının **preload scanner'ı** LCP görselini bulamıyor, çünkü o `<img>` etiketi 202 KB'lık JS bundle indirilip çalıştırılana kadar var olmuyor. Görsel ancak React render ettikten sonra keşfediliyor — yani indirmeye ~900 ms geç başlıyor.
**Çözümler (etki sırasıyla):**
1. `index.html`'e statik `<link rel="preload" as="image" href="/teachers/dila.jpg" fetchpriority="high">` ekle. **Tek satır, ~800 ms kazanç.** Tek şart: `public/teachers/config.json`'daki ilk görselle senkron kalması (`activeImagesLeft[0]`).
2. Bunu otomatikleştirmek için `scripts/generate-seo.ts`'e `config.json`'u okuyup preload satırını üreten bir adım eklenebilir — elle senkron tutma riskini kaldırır.
3. Kalıcı çözüm SSR/prerender'dır ama tek landing page için aşırı; 1. madde maliyetin çok küçük bir kısmıyla kazancın çoğunu verir.

**[KRİTİK] | [public/teachers/](public/teachers/) | 7 hoca fotoğrafı sıkıştırılmamış JPEG olarak, tamamı hemen (eager) yükleniyor — 639 KB.**

| Dosya | Aktarılan | Lighthouse'un hesapladığı israf |
|---|---|---|
| bora.jpg | 145 KB | 140 KB |
| celal.jpg | 108 KB | 104 KB |
| onat.jpg | 96 KB | 92 KB |
| emre.jpg | 93 KB | 89 KB |
| nehir.jpg | 82 KB | 78 KB |
| dila.jpg (LCP) | 72 KB | 69 KB |
| dorukhan.jpg | 43 KB | 41 KB |
| **Toplam** | **639 KB** | **613 KB** |

Lighthouse'un `image-delivery` denetimi toplam **681 KB tasarruf** hesaplıyor — sayfanın 936 KB'lık ağırlığının **%73'ü**. Görseller 800×1067 piksel ve mobilde bunun çok altında bir alana çiziliyor.
**Çözüm:** WebP/AVIF'e çevir + mobil için `srcset` üret. `sharp` **zaten bağımlılıklarda kurulu** ([package.json:24](package.json#L24)) ve şu an hiçbir yerde kullanılmıyor — build adımına bir dönüştürme scripti eklemek için ek paket gerekmiyor. (Detay Faz 10'da.)

**[ÖNEMLİ] | Site geneli | `loading="lazy"` hiç kullanılmamış — kaynak kodda tek bir örneği yok.**
7 hoca fotoğrafının hepsi ilk yüklemede iniyor, oysa şeritte aynı anda en fazla 2-3 tanesi görünür. Footer logosu ([Footer.tsx:28](src/components/Footer.tsx#L28)) ve WhatsApp ikonu ([App.tsx:215](src/App.tsx#L215)) da ilk ekranın çok altında olmalarına rağmen hemen yükleniyor.
**Çözüm:** LCP adayı olan ilk 1-2 görsel hariç hepsine `loading="lazy"`. **Dikkat:** LCP görseline lazy koymak metriği kötüleştirir — [TeacherTicker.tsx:552](src/components/TeacherTicker.tsx#L552)'deki `priority` bayrağı zaten bu ayrımı yapıyor, aynı bayrak `loading` için de kullanılmalı.

**[ÖNEMLİ] | [index.html:52](index.html#L52) | Google Fonts stylesheet render'ı blokluyor — Lighthouse 480 ms toplam, bu satır için 992 ms tahmin ediyor.**
`preconnect` etiketleri doğru konmuş ([index.html:49-50](index.html#L49-L50)) ✅ ve `&display=swap` var ✅ — ikisi de doğru yapılmış. Kalan sorun: stylesheet'in kendisi hâlâ senkron. Ayrıca **6 ağırlık birden** isteniyor (300, 400, 500, 600, 700, 800); sayfa bunların hepsini kullanmıyor.
**Çözüm:** (a) Kullanılmayan ağırlıkları çıkar — muhtemelen 400/600/800 yeterli; (b) stylesheet'i `media="print" onload="this.media='all'"` kalıbıyla asenkron yükle, ya da fontu self-host et (üçüncü taraf bağlantısını tamamen kaldırır).

---

## 3. CLS — sorun yok ✅

**CLS = 0** (hem mobil hem masaüstü). Bu, denetim planındaki tüm CLS risk kalıplarının bu projede zaten çözülmüş olması sayesinde:

- Hoca kartlarında `aspectRatio` satır içi veriliyor ([TeacherTicker.tsx:536-540](src/components/TeacherTicker.tsx#L536-L540)) — görsel inmeden yer ayrılıyor ✅
- Görsellerde `width`/`height` öznitelikleri var ([TeacherTicker.tsx:547-548](src/components/TeacherTicker.tsx#L547-L548)) ✅
- Çerez bandı kaldırılmış (commit `5ac5bb5`) — klasik CLS kaynağı yok ✅
- Mobil yapışkan CTA `fixed` konumlu, akışı etkilemiyor ([App.tsx:230](src/App.tsx#L230)) ✅
- `motion` animasyonları `opacity`/`transform` üzerinden — layout tetiklemiyor ✅
- Pop-up `<body>`'yi `position: fixed` yaparken kaydırma çubuğu telafisi düşünülmüş ([App.tsx:145-150](src/App.tsx#L145-L150) yorumları)

**[İYİLEŞTİRME] | [Header.tsx](src/components/Header.tsx) + [Footer.tsx:27-31](src/components/Footer.tsx#L27-L31) | İki logoda `width`/`height` yok.**
Lighthouse `unsized-images` denetimi bu ikisini işaretliyor. Ölçülen CLS 0 olduğu için **şu an zarar vermiyor** (Tailwind'in `h-12`/`h-11` sınıfları yüksekliği sabitliyor). Yine de yavaş bağlantıda logo geç inerse kayma riski var ve denetim aracı uyarı üretiyor.
**Çözüm:** İki `<img>`'a `width`/`height` ekle. Düşük öncelik.

---

## 4. INP / ana thread — sorun yok ✅

**TBT: mobil 80 ms, masaüstü 0 ms.** Her ikisi de "iyi" bandında (≤200 ms).

| Ölçüm | Değer |
|---|---|
| Ana thread çalışması | 0.7 s |
| JS başlatma (bootup) | 0.2 s |
| Uzun görev | Raporlanmadı |

**[ÖNEMLİ] | `dist/assets/index-*.js` | Bundle 672 KB ham / 196 KB gzip; Lighthouse **117 KB'ının (%58) kullanılmadığını** ölçüyor.**
Tek bir bundle var, kod bölme (code splitting) yok. Şu an TBT'yi bozmuyor ama gereksiz indirme ve ayrıştırma maliyeti — ve LCP'nin "element render delay" kısmına doğrudan katkı veriyor.
**Kullanılmayan yükün muhtemel kaynakları:**
- `@google/genai` ([package.json:12](package.json#L12)) — **kodda hiç çağrılmıyor** (Faz 0'da tespit edildi). Tree-shaking'in ne kadarını attığı ölçülmedi ama bağımlılık listesinde durmasının hiçbir gerekçesi yok.
- `PopUpForm` 1073 satır ([PopUpForm.tsx](src/components/PopUpForm.tsx)) + `KvkkModal` — ilk render'da asla görünmüyorlar, ana bundle'da olmaları gerekmiyor.
**Çözüm:** (a) `@google/genai`'yi kaldır; (b) `PopUpForm` ve `KvkkModal`'ı `React.lazy` ile böl. İkisi de düşük riskli.

**[İYİLEŞTİRME] | [TeacherTicker.tsx](src/components/TeacherTicker.tsx) + [TestimonialsSection.tsx:104-120](src/components/TestimonialsSection.tsx#L104-L120) | Sayfada aralıksız çalışan iki `requestAnimationFrame` döngüsü var.**
Şerit ve yorum karuseli sürekli animasyon yapıyor. Ölçülen TBT bunun sorun yaratmadığını gösteriyor ve **her ikisi de özenle yazılmış**: `prefers-reduced-motion` kontrolü var ([TestimonialsSection.tsx:41-43](src/components/TestimonialsSection.tsx#L41-L43)), delta-time tabanlı (120 Hz ekranda hızlanmıyor), `translate3d` ile compositor'da çalışıyor, arka plan sekmesi sıçraması kırpılıyor.
Kalan tek not: düşük güçlü Android cihazlarda iki sürekli animasyon pil ve INP açısından ölçülmedi. Bu **bir bulgu değil, ölçülemeyen bir risk**.

---

## 5. Üçüncü taraf scriptler

| Kaynak | Durum |
|---|---|
| Google Fonts | Render blokluyor (yukarıda) |
| Vercel Analytics + Speed Insights ([App.tsx:153-154](src/App.tsx#L153-L154)) | Lighthouse çalışmasında ölçülebilir maliyet üretmedi ✅ |
| `encrypted-tbn0.gstatic.com` WhatsApp ikonu ([App.tsx:216](src/App.tsx#L216)) | 13 KB, ayrı DNS+TLS el sıkışması gerektiriyor |

**[İYİLEŞTİRME] | [App.tsx:216](src/App.tsx#L216) | WhatsApp ikonu Google'ın görsel önbelleğinden hotlink ediliyor.**
`https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsb1L0...` — bu bir Google Görseller küçük resim URL'i, kalıcı bir CDN değil. Google bu URL'i istediği zaman geçersiz kılabilir; o gün ikon sessizce kırılır. Ayrıca ayrı bir origin'e bağlantı maliyeti var ve `preconnect` verilmemiş.
**Çözüm:** İkonu yerelleştir (`public/whatsapp.svg`) ya da `lucide-react` zaten kurulu olduğu için bir SVG ikon bileşeni kullan — sıfır ek istek.

---

## 6. Doğru yapılmış olanlar (bozulmamalı)

- CLS = 0 — `aspectRatio` + `width`/`height` disiplini
- Sunucu yanıtı 50 ms (Vercel CDN)
- LCP görselinde `fetchpriority="high"` zaten var ([TeacherTicker.tsx:552](src/components/TeacherTicker.tsx#L552))
- Fontta `display=swap` + `preconnect` doğru kurulmuş
- `prefers-reduced-motion` desteği
- Animasyonlar compositor'da (`transform`/`opacity`), delta-time tabanlı
- Masaüstü performansı 97

---

## 7. Etki tahmini

Mobil LCP 3.8 s → tahmini kazanımlar:

| Aksiyon | Tahmini kazanç | Efor |
|---|---|---|
| LCP görseline `preload` | ~800 ms | Çok düşük (1 satır) |
| Hoca görsellerini WebP'ye çevir + boyutlandır | ~400 ms | Orta (`sharp` zaten kurulu) |
| Görünmeyen görsellere `loading="lazy"` | ~200 ms | Düşük |
| Font stylesheet'ini asenkronlaştır / ağırlık azalt | ~300-500 ms | Düşük |
| `@google/genai` kaldır + modalleri `React.lazy` | ~100-200 ms | Düşük-orta |

Bu beşi birlikte LCP'yi **2.5 s eşiğinin altına indirmeye yeter** görünüyor. Uygulanırsa yeniden ölçüm şart.

> ⚠️ Bu tahminler Lighthouse'un kendi `wastedMs` hesaplarına dayanır, gerçek kazanç değildir.

---

## 8. Ölçülemeyenler

| Ne | Neden | Gereken |
|---|---|---|
| **Gerçek INP** | Lighthouse INP ölçmez, TBT vekildir | Saha verisi (CrUX / GSC Core Web Vitals raporu) |
| **Saha CWV verisi** | Site yeni, CrUX eşiği dolmamış olabilir | GSC → Core Web Vitals; erişiminiz var |
| Düşük güçlü Android'de iki rAF döngüsünün pil/INP etkisi | Gerçek cihaz gerekli | Fiziksel cihaz testi |
| Yorum bölümünün performansa etkisi | Supabase'den geliyor, ölçüm anındaki veri bilinmiyor | — |
| Gerçek font dosyası indirme maliyeti | LH çalışmasında woff2 isteği yakalanmadı | Tekrar ölçüm |
