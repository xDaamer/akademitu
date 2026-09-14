# Editoryal stil rehberi

`README.md` yazının **biçimini** anlatır (alanlar, şablonlar, doğrulama).
Bu dosya **nasıl yazılacağını** anlatır.

Buradaki kuralların bir kısmı `npm run blog:check` tarafından ölçülüyor; onlar
README'de listeli. Bu dosyadakiler ölçülemeyenler — yani asıl işi yapanlar.
Makineye devredilemeyen bir kuralı makineye devretmiş gibi yapmak, yanlış bir
güven duygusu üretir; bu yüzden ayrı duruyorlar.

## Ton

Sakin, net, abartısız. Klişe motivasyon dilinden kaçının: "hayallerine giden
yol", "asla pes etme", "başarı senin elinde". Bunlar hiçbir şey söylemez ve
okuyanın gözünde metnin tamamının değerini düşürür.

Öğrenciye **sen**, veliye **siz**. Bir yazıda ikisi karışmaz — `type: veli`
yazıları baştan sona "siz"dir, diğerleri "sen". Hitap ortada değişirse okuyucu
kime yazıldığını anlamaz.

Öğretmen gibi yazın, reklamcı gibi değil. Değer önce, satış sonra. Bir yazının
okuyucuya hiçbir şey vermeden CTA'ya varması, o okuyucuyu bir daha
getirmemenin en hızlı yoludur.

Somut olun. "Çok çalış" değil: "günde 4 saat, 45+15 dakikalık 5 blok".
"Düzenli tekrar yap" değil: "1. gün, 3. gün, 7. gün, 21. gün".

## Cümle ve paragraf

- Ortalama cümle 15–20 kelime. 30'u aşanı bölün (`blog:check` sayar).
- Paragraf en fazla 3–4 cümle. Mobilde dev blok okunmuyor.
- Aktif çatı: "Program hazırlanmalıdır" değil, "Programı şöyle hazırla".
- Her ~300 kelimede görsel bir kırılma: tablo, liste, kutu ya da görsel.

## Başlık hiyerarşisi

Sayfada tek H1 vardır ve o `title` alanıdır — gövdede `# ` kullanılmaz.

H2'leri **mümkün olduğunca soru formunda** yazın. İnsanlar soru arıyor; dil
modelleri de soru–cevap bloklarını alıntılıyor. "Konu dağılımı" yerine "Hangi
konudan kaç soru geliyor?".

**Her H2'nin altındaki ilk paragraf o başlığın sorusunu doğrudan cevaplasın.**
Girizgâh yapmayın. Bu kural ölçülemiyor ama yazının en çok fark yaratan
kuralı: öne çıkan snippet'ler ve AI cevapları ezici çoğunlukla o ilk paragrafı
alır.

## İlk 60 kelime kuralı

TL;DR kutusu, başlıktaki soruyu **tek başına** cevaplamalı. Okuyucu başka
hiçbir şey okumasa bile cevabı almış olmalı.

> Kötü: "Bu yazıda TYT matematik konu dağılımını ele alacağız."
> İyi: "TYT Matematik'te 40 soru çıkar. En çok soru gelen üç başlık problemler,
> temel kavramlar ve geometridir; bu üçü tek başına soruların yarısından
> fazlasını oluşturur."

Farkı görün: kötü olan yazının *hakkında*, iyi olan *cevabın kendisi*.

## Anahtar kelime

Odak kelime altı yerde geçer, fazlası gereksiz: H1, ilk 100 kelime, en az bir
H2, slug, meta açıklama, kapak görseli alt metni. Altısını da `blog:check`
kontrol ediyor.

**Yoğunluk hesabı yapmayın.** Aynı kelimeyi yirmi kez tekrarlamak hiçbir işe
yaramıyor, okumayı bozuyor. Bunun yerine eş anlamlı ve ilgili terimleri doğal
biçimde serpiştirin: YKS → TYT, AYT, üniversite sınavı, ÖSYM, yerleştirme.

## Başlık (title) formülü

`[Anahtar kelime] + [fayda veya spesifiklik]`, marka eki dahil 50–60 karakter.

| Kötü | İyi |
|---|---|
| YKS Hakkında Bilmeniz Gerekenler | YKS Konu Dağılımı: Hangi Dersten Kaç Soru? |
| Çalışma Programı | Haftalık Çalışma Programı Nasıl Hazırlanır? |
| Koçluk | Eğitim Koçluğu Nedir, Kimler İçin Gereklidir? |

Tıklama tuzağı kurmayın. Başlığın vaat ettiğini içerik vermiyorsa geri dönüş
oranı sıralamayı düşürür — yani tuzak kısa vadede bile kazandırmaz.

## Meta açıklama formülü

140–160 karakter: `[Sorunun cevabı]. [İçerikte ne var]. [Yumuşak eylem çağrısı].`

> "TYT ve AYT'de hangi dersten kaç soru çıkıyor? Güncel konu dağılımı tablosu,
> en çok soru gelen konular ve çalışma sırası önerisi."

## İç linkler

Anchor metni ne bulacağını söylesin. "Buraya tıklayın" değil, "deneme sınavı
analizi nasıl yapılır". Linkler **paragrafın içinde, ilgili cümlede** dursun;
yazının sonunda toplu liste olarak değil. Sondaki liste okunmaz ve otorite
dağıtımı açısından da zayıftır.

## Görseller

Stok fotoğraf yerine **bilgi grafiği** tercih edin: tablo görseli, akış şeması,
yol haritası. Paylaşım ve doğal link alma oranı kıyaslanamayacak kadar yüksek.

Alt metin tanımlayıcı olsun: "TYT matematik konu dağılımı grafiği" ✅,
"görsel1" ❌. Dosya adları da slug gibi: `tyt-matematik-konu-dagilimi.webp`.

## SSS bölümü

Yazı başına 3–5 soru. Sorular **gerçek arama sorgularından** gelmeli —
Google'ın "İlgili sorular" kutusu ve arama önerileri iyi kaynak. Cevaplar
40–60 kelime ve doğrudan.

SSS sayfada **görünür** olmalı. Sadece şemada olan, sayfada görünmeyen SSS
işe yaramaz; üstelik yapılandırılmış veri kuralı ihlalidir.

## Yasaklar

Bunlar `blog:check`'te hata üretir ve yayını durdurur:

- "Garanti", "%100 başarı", "kesin sonuç", puan/sıralama artışı taahhüdü.
  Hem etik dışı hem reklam mevzuatı riski.

Bunlar ölçülemiyor ama aynı derecede bağlayıcı:

- **Rakip modeli kötülemeyin.** Karşılaştırma yazılarında "kurs şu durumlarda
  daha mantıklı" cümlesini kurabilmelisiniz. Dürüst karşılaştırma hem okuyucu
  güveni hem E-E-A-T açısından daha iyi çalışır.
- **Psikolojik konularda teşhis koymayın, tedavi önermeyin.** "Sınav kaygısı
  yoğunsa bir uzman psikoloğa başvurmak gerekir" sınırında kalın.
- **Vaka yazılarında izin alın.** İsim yerine "M.K., 12. sınıf" formatı ya da
  yazılı rıza. Sayıları şişirmeyin.
- **Sayısal veriyi kaynaksız vermeyin.** ÖSYM/MEB verisi mi, kendi deneme
  analizinizden mi geldiği açıkça yazılsın.

## Güncelleme disiplini

Her yazı 3 ayda bir gözden geçirilir ve `lastReviewedAt` güncellenir. Bu
takvim tartışmaya açık değil: güncellenmeyen yazılar hem klasik sıralamada hem
AI alıntılarında hızla geriliyor. `npm run blog:check` 90 günü aşanları
listeliyor.

`contentUpdatedAt` yalnızca **anlamlı** içerik değişiminde güncellenir — bir
yazım hatası düzeltmek `dateModified`'i değiştirmez. O alanı her dokunuşta
güncellemek, arama motoruna yalan söylemenin kolay ve etkisiz bir yoludur.

Veri yazıları (`type: veri`) yılda bir kez, sınav sonrası **zorunlu** olarak
güncellenir. Duyuru yazıları (`type: guncel`) her yıl aynı dosyada güncellenir;
yeni yazı açılmaz, böylece URL sabit kalır ve otorite birikir.
