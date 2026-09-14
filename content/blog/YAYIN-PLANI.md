# Yayın planı

## Dört küme

Bağımsız 40 yazı yerine, 4 konu etrafında birbirine bağlı küme. Her kümede bir
pillar (`type: pillar`) ve ona `pillarOf` ile bağlanan cluster'lar.

| Küme | Pillar yazı (slug) | Cluster hedefi | Arama niyeti |
|---|---|---|---|
| YKS | `yks-hazirlik-rehberi` | 12–15 | Bilgi |
| LGS | `lgs-hazirlik-rehberi` | 10–12 | Bilgi |
| Çalışma yöntemi | `verimli-ders-calisma-rehberi` | 8–10 | Bilgi |
| Koçluk & veli | `egitim-koclugu-nedir` | 6–8 | Ticari / karar |

Son küme trafik değil **dönüşüm** kümesi: az aramalı ama satın alma niyeti
yüksek sorgular burada.

**Pillar'lar önce yayınlanmalı.** Cluster'ların link verecek bir merkezi
olmazsa küme kurulmaz — ve `blog:check` zaten `pillarOf`u yayında olmayan bir
yazıyı hata sayıyor.

## İlk 20 yazı

İlk dördü pillar; onlar yayınlanmadan cluster yayınlanamaz.

| # | Başlık | `type` | Küme |
|---|---|---|---|
| 1 | YKS'ye Sıfırdan Hazırlık: Tam Yol Haritası | `pillar` | YKS |
| 2 | LGS'ye Hazırlık Rehberi: Nereden Başlamalı? | `pillar` | LGS |
| 3 | Verimli Ders Çalışma Rehberi | `pillar` | Yöntem |
| 4 | Eğitim Koçluğu Nedir, Nasıl Çalışır? | `pillar` | Koçluk |
| 5 | TYT Konu Dağılımı ve Soru Sayıları | `veri` | YKS |
| 6 | AYT Konu Dağılımı (Sayısal / EA / Sözel) | `veri` | YKS |
| 7 | LGS Konu Dağılımı ve Soru Sayıları | `veri` | LGS |
| 8 | YKS Puan Hesaplama: Netler Kaç Puan Getirir? | `veri` | YKS |
| 9 | LGS'de Kaç Net Kaç Puan Yapar? | `veri` | LGS |
| 10 | Haftalık Çalışma Programı Nasıl Hazırlanır? | `nasil` | Yöntem |
| 11 | Deneme Sınavı Nasıl Analiz Edilir? | `nasil` | Yöntem |
| 12 | Konu Tekrarı Nasıl Yapılır? (Aralıklı Tekrar) | `nasil` | Yöntem |
| 13 | Soru Çözerken Dikkat Dağınıklığı Nasıl Önlenir? | `nasil` | Yöntem |
| 14 | Özel Ders mi Kurs mu? Hangisi Kime Uygun? | `karar` | Koçluk |
| 15 | Online Özel Ders Verimli mi? | `karar` | Koçluk |
| 16 | Sınav Kaygısıyla Nasıl Başa Çıkılır? | `nasil` | Yöntem |
| 17 | Veli Olarak Sınav Döneminde Ne Yapmalı, Ne Yapmamalı? | `veli` | Koçluk |
| 18 | YKS Kaynak Seçimi: Hangi Yayın, Hangi Seviye? | `nasil` | YKS |
| 19 | 9. ve 10. Sınıfta YKS'ye Hazırlık Mantıklı mı? | `karar` | YKS |
| 20 | ÖSYM Sınav Takvimi: Tüm Tarihler | `guncel` | YKS |

## Tempo

Haftada 2 yazı, ilk 6 ay — toplam ~50 yazı. Az ama iyi, çok ama sığdan iyidir.

İlk 90 günün önceliği: 4 pillar + her kümede 4–5 cluster.

Bakım: her yazı 3 ayda bir gözden geçirilir (`lastReviewedAt`).
`npm run blog:check` 90 günü aşanları listeliyor.

## Sezon haritası

Türkiye sınav takvimine göre hangi ayda ne öne çıkarılmalı:

| Dönem | Öne çıkarılacak içerik |
|---|---|
| Eylül–Ekim | Yeni dönem planı, çalışma programı, konu sırası, hedef belirleme |
| Kasım–Aralık | Konu dağılımları, kaynak seçimi, deneme analizi, dönem değerlendirmesi |
| Ocak–Şubat | Sınav kaygısı, ara tatil planı, motivasyon, veli rehberleri |
| Mart–Nisan | Son düzlük stratejisi, tekrar planı, deneme sıklığı, eksik kapatma |
| Mayıs | Son 30 gün, sınav günü hazırlığı, uyku ve beslenme, psikolojik hazırlık |
| Haziran | Sınav sonrası değerlendirme, net hesaplama, cevap anahtarı analizi |
| **Temmuz–Ağustos** | **Tercih dönemi — yılın en yüksek trafikli haftaları.** Taban puanlar, tercih stratejisi, bölüm rehberleri |
| Ağustos sonu | Yeni döneme başlangıç, sıfırdan hazırlık, 9./10. sınıf erken plan |

**Sezonluk içerik en az 6 hafta önce yayınlanmalı.** Bir yazının sıralamaya
oturması zaman alır; tercih yazısını temmuzda yayınlarsanız o sezonu
kaçırırsınız. Bu, dosya tabanlı yayında ek bir avantaj: yazıyı `status: draft`
ile hazır tutup tarihi geldiğinde tek satır değiştirip push edebilirsiniz.

## Ölçüm

İlk 3 ayda trafik beklemeyin; bu normaldir.

| Dönem | Bakılacak |
|---|---|
| Ay 1–3 | İndekslenen sayfa sayısı, Search Console görüntülenme artışı, ortalama pozisyon |
| Ay 4–6 | İlk sayfada sıralanan sorgu sayısı, organik oturum, blog → hizmet sayfası geçişi |
| Ay 6+ | Blog kaynaklı lead sayısı, yazı bazında dönüşüm, marka aramalarındaki artış |

Aylık ritüel: **en çok görüntülenen ama tıklanmayan 10 sorguyu bulun**, o
yazıların başlığını ve meta açıklamasını yeniden yazın. En hızlı kazanç
buradadır — içerik zaten sıralanıyor, sadece SERP'te satmıyor.
