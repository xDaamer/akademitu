import React from 'react';
import { LogOut, CalendarDays, TrendingUp, CreditCard, MessageSquareQuote } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { formatNationalMobile, extractSignificantPhoneDigits } from '../lib/phone';

/*
 * PANEL — TASLAK
 * ===========================================================================
 * Bu ekran giriş ekranının sol panelinde verilen sözü karşılıyor: "Ders
 * programını, ödemelerini ve gelişimini tek panelden takip et." Dört bölüm de
 * o cümlenin karşılığı; bölümleri buradan çıkarmak, panelin ne olacağını
 * baştan tarif etmiş oluyor.
 *
 * VERİLER ÖRNEKTİR VE ÖYLE ETİKETLENMİŞTİR.
 * Taslak bir ekranda uydurma sayıları gerçekmiş gibi göstermek, sonradan
 * "neden benim netlerim böyle değil" sorusuna yol açar. Üstteki şerit ve
 * bölüm başlıklarındaki "örnek" işareti bu yüzden var — süs değil, ekranın
 * dürüstlüğü.
 *
 * Sabitler ORNEK_ önekiyle: ileride veri bağlanırken neyin atılacağı tek
 * bakışta belli olsun.
 */

const ORNEK_DERSLER = [
  { gun: 'Pzt', tarih: '15 Eyl', ders: 'Matematik', saat: '19:00', hoca: 'Dila Hoca', durum: 'planlandi' },
  { gun: 'Çar', tarih: '17 Eyl', ders: 'Fizik', saat: '20:30', hoca: 'Emre Hoca', durum: 'planlandi' },
  { gun: 'Cum', tarih: '19 Eyl', ders: 'Türkçe', saat: '18:00', hoca: 'Selin Hoca', durum: 'planlandi' },
  { gun: 'Cmt', tarih: '20 Eyl', ders: 'Koçluk görüşmesi', saat: '11:00', hoca: 'Ayça Hoca', durum: 'koclu' },
] as const;

const ORNEK_DENEMELER = [
  { ad: '1. Deneme', net: 62 },
  { ad: '2. Deneme', net: 68 },
  { ad: '3. Deneme', net: 71 },
  { ad: '4. Deneme', net: 79 },
  { ad: '5. Deneme', net: 84 },
] as const;

const ORNEK_ODEMELER = [
  { donem: 'Eylül 2026', tutar: '4.500 ₺', durum: 'odendi' },
  { donem: 'Ekim 2026', tutar: '4.500 ₺', durum: 'bekliyor' },
] as const;

const EN_YUKSEK_NET = Math.max(...ORNEK_DENEMELER.map((d) => d.net));

/** Bölüm kabuğu — dört bölüm de aynı ritmi paylaşsın diye tek yerde. */
const Bolum: React.FC<{
  baslik: string;
  ikon: React.ReactNode;
  children: React.ReactNode;
  genis?: boolean;
}> = ({ baslik, ikon, children, genis = false }) => (
  <section
    className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 ${
      genis ? 'lg:col-span-2' : ''
    }`}
  >
    <div className="mb-4 flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#191F61]/10 text-[#191F61]">
        {ikon}
      </span>
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
        {baslik}
      </h2>
      {/* Her bölümde tekrar eden işaret: veriler gerçek değil. */}
      <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
        örnek
      </span>
    </div>
    {children}
  </section>
);

export const PortalDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const ilkAd = user?.fullName?.trim().split(' ')[0];

  return (
    <>
      <PageMeta
        title="Panel | akademITU"
        description="akademITU öğrenci ve veli paneli."
        path="/portal/panel"
        noIndex
      />

      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-5xl items-center gap-3 px-4 sm:px-6">
            {/* Logo görseli kaldırıldı; başlıkta marka adı metin olarak duruyor. */}
            <span className="text-lg font-extrabold tracking-tight text-[#191F61]">
              akademITU
            </span>

            <Button variant="soft" size="sm" onClick={logout} className="ml-auto">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış yap</span>
            </Button>
          </div>
        </header>

        {/*
          Taslak uyarısı sayfanın en üstünde ve göz ardı edilemeyecek yerde:
          altındaki her sayı bu cümlenin kapsamında.
        */}
        <div className="border-b border-[#c5a059]/30 bg-[#c5a059]/10">
          <p className="mx-auto max-w-5xl px-4 py-2.5 text-center text-xs font-semibold text-[#7a5f2a] sm:px-6">
            Bu panel taslak hâlindedir — aşağıdaki ders, deneme ve ödeme
            bilgileri örnek veridir.
          </p>
        </div>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191F61] sm:text-4xl">
              Hoş geldin{ilkAd ? `, ${ilkAd}` : ''}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ders programın, deneme sonuçların ve ödemelerin burada olacak.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/*
              BU HAFTA — panelin merkezi.
              Öğrencinin panele her girişte bakacağı tek şey "bu hafta ne
              zaman, hangi ders". O yüzden en geniş yeri ve tam genişliği o
              alıyor; diğer bölümler yanında sessiz kalıyor.
            */}
            <Bolum baslik="Bu hafta" ikon={<CalendarDays className="h-5 w-5" />} genis>
              <ul className="divide-y divide-slate-100">
                {ORNEK_DERSLER.map((d) => (
                  <li
                    key={`${d.gun}-${d.ders}`}
                    className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    {/* Tarih bloğu: takvimden bakar gibi, gün üstte kısa. */}
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-50 py-1.5">
                      <span className="text-[11px] font-semibold uppercase text-slate-500">
                        {d.gun}
                      </span>
                      <span className="text-sm font-bold text-[#191F61]">
                        {d.tarih.split(' ')[0]}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{d.ders}</p>
                      <p className="truncate text-sm text-slate-500">{d.hoca}</p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        d.durum === 'koclu'
                          ? 'bg-[#B6D6CC]/50 text-[#191F61]'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {d.saat}
                    </span>
                  </li>
                ))}
              </ul>
            </Bolum>

            {/*
              DENEME GELİŞİMİ — CSS sütunları, grafik kütüphanesi YOK.
              Beş çubuk için bundle'a kütüphane eklemek, taslak bir ekranda
              taşınacak bir maliyet değil.
            */}
            <Bolum baslik="Deneme gelişimi" ikon={<TrendingUp className="h-5 w-5" />}>
              {/*
                Çubuk ve etiketler AYRI SATIRDA duruyor, bilinçli olarak.
                İlk hâlde etiketler çubukla aynı sütundaydı ve çubuğun yüzde
                yüksekliği hiç uygulanmıyordu: yüzde yükseklik, ana kutunun
                yüksekliği BELİRLİ olduğunda çözülür; sütunun yüksekliği auto
                olduğu için hepsi sıfıra iniyor ve grafik boş görünüyordu.
                Sarmalayıcıya h-full verilerek yükseklik belirli hâle geldi.
              */}
              <div
                className="flex h-32 items-end gap-2"
                role="img"
                aria-label="Örnek deneme netleri: 62, 68, 71, 79, 84"
              >
                {ORNEK_DENEMELER.map((d, i) => (
                  <div key={d.ad} className="flex h-full flex-1 items-end">
                    <div
                      className={`w-full rounded-t-lg transition-[height] duration-500 ${
                        i === ORNEK_DENEMELER.length - 1 ? 'bg-[#191F61]' : 'bg-[#191F61]/25'
                      }`}
                      style={{ height: `${(d.net / EN_YUKSEK_NET) * 100}%` }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-2 flex gap-2" aria-hidden="true">
                {ORNEK_DENEMELER.map((d) => (
                  <span
                    key={d.ad}
                    className="flex-1 text-center text-xs font-bold text-slate-600"
                  >
                    {d.net}
                  </span>
                ))}
              </div>
              <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                Son denemede{' '}
                <span className="font-bold text-[#191F61]">
                  {ORNEK_DENEMELER[ORNEK_DENEMELER.length - 1].net} net
                </span>{' '}
                — ilk denemeye göre{' '}
                {ORNEK_DENEMELER[ORNEK_DENEMELER.length - 1].net - ORNEK_DENEMELER[0].net} artış.
              </p>
            </Bolum>

            <Bolum baslik="Ödemeler" ikon={<CreditCard className="h-5 w-5" />}>
              <ul className="space-y-2.5">
                {ORNEK_ODEMELER.map((o) => (
                  <li
                    key={o.donem}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{o.donem}</p>
                      <p className="text-sm text-slate-500">{o.tutar}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        o.durum === 'odendi'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[#c5a059]/20 text-[#7a5f2a]'
                      }`}
                    >
                      {o.durum === 'odendi' ? 'Ödendi' : 'Bekliyor'}
                    </span>
                  </li>
                ))}
              </ul>
            </Bolum>

            <Bolum baslik="Koçundan not" ikon={<MessageSquareQuote className="h-5 w-5" />} genis>
              <blockquote className="border-l-2 border-[#c5a059] pl-4 text-slate-700">
                <p className="leading-relaxed">
                  Bu hafta limit konusunda ciddi ilerleme var. Türev sorularına
                  geçmeden önce süreklilik tekrarını bitirelim; cumartesi
                  görüşmesinde deneme stratejini konuşacağız.
                </p>
                <footer className="mt-3 text-sm font-semibold text-slate-500">
                  Ayça Hoca · 13 Eylül
                </footer>
              </blockquote>
            </Bolum>
          </div>

          {/* Hesap bilgileri en altta: her gün bakılan bir şey değil. */}
          <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-700">
              Hesap bilgilerin
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold text-slate-500">Ad soyad</dt>
                <dd className="mt-1 font-medium text-slate-900">{user?.fullName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">E-posta</dt>
                <dd className="mt-1 break-all font-medium text-slate-900">
                  {user?.email ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">Telefon</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {user?.phone
                    ? `+90 ${formatNationalMobile(extractSignificantPhoneDigits(user.phone))}`
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">
              Bilgilerinde bir yanlışlık varsa bize ulaş — hesap bilgileri
              panelden değiştirilemiyor.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};
