import React, { useEffect, useState } from 'react';
import { LogOut, CalendarDays, TrendingUp, CreditCard, MessageSquareQuote } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiRequestError } from '../lib/api';
import { formatNationalMobile, extractSignificantPhoneDigits } from '../lib/phone';
import { SITE_URL } from '../config';
import need from '../../need.json';
import { routingMode } from '../lib/host';

/*
 * PANEL — portal.akademitu.com KÖKÜ
 * ===========================================================================
 * Panel ana siteden ayrı bir alt alan adında yaşıyor; giriş ekranı ise
 * akademitu.com/login'de kaldı (bkz. src/lib/host.ts). İkisi aynı Vercel
 * projesinden servis ediliyor, oturum çerezi Domain=.akademitu.com ile
 * ikisinde de geçerli (bkz. server/cookies.ts).
 *
 * Veriler /api/portal/ozet'ten geliyor — tek istek, dört bölüm. Sunucu o
 * sorguları kullanıcının KENDİ jetonuyla, RLS altında çalıştırıyor
 * (server/routes/portal.ts), yani bu sayfa başkasının verisini hiçbir
 * durumda göremez.
 *
 * BOŞ DURUMLAR GERÇEK. Önceki taslakta sabit örnek veriler vardı; artık veri
 * yoksa uydurma sayı gösterilmiyor, ne olduğu yazılıyor. Boş bir panel,
 * gerçek olmayan dolu bir panelden dürüsttür.
 */

interface Ders {
  id: string;
  subject: string;
  teacher_name: string | null;
  starts_at: string;
  kind: 'ders' | 'koclu';
}

interface Deneme {
  id: string;
  title: string;
  net: number;
  taken_on: string;
}

interface Odeme {
  id: string;
  period: string;
  amount: number;
  currency: string;
  status: 'odendi' | 'bekliyor' | 'gecikti';
  due_on: string | null;
}

interface KocNotu {
  id: string;
  author_name: string | null;
  body: string;
  written_on: string;
}

interface Ozet {
  lessons: Ders[];
  examResults: Deneme[];
  payments: Odeme[];
  coachNote: KocNotu | null;
}

const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'] as const;

function gunKisa(iso: string) {
  return GUNLER[new Date(iso).getDay()];
}

function ayinGunu(iso: string) {
  return new Date(iso).getDate();
}

function saat(iso: string) {
  return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function tarihUzun(iso: string) {
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
}

function paraBirimi(tutar: number, birim: string) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: birim || 'TRY',
    maximumFractionDigits: 0,
  }).format(tutar);
}

const ODEME_ETIKET: Record<Odeme['status'], { metin: string; sinif: string }> = {
  odendi: { metin: 'Ödendi', sinif: 'bg-emerald-100 text-emerald-800' },
  bekliyor: { metin: 'Bekliyor', sinif: 'bg-[#c5a059]/20 text-[#7a5f2a]' },
  gecikti: { metin: 'Gecikti', sinif: 'bg-rose-100 text-rose-800' },
};

/** Bölüm kabuğu — dört bölüm aynı ritmi paylaşsın diye tek yerde. */
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
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">{baslik}</h2>
    </div>
    {children}
  </section>
);

/** Boş durum: ne olmadığını değil, ne olacağını söyler. */
const Bos: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
    {children}
  </p>
);

export const PortalDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;

    apiFetch<Ozet>('/api/portal/ozet')
      .then((veri) => {
        if (!iptal) setOzet(veri);
      })
      .catch((err) => {
        if (iptal) return;
        setHata(
          err instanceof ApiRequestError ? err.message : 'Panel verileri alınamadı.'
        );
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });

    return () => {
      iptal = true;
    };
  }, []);

  const ilkAd = user?.fullName?.trim().split(' ')[0];
  const denemeler = ozet?.examResults ?? [];
  const enYuksekNet = denemeler.length ? Math.max(...denemeler.map((d) => Number(d.net))) : 0;
  const sonNet = denemeler.length ? Number(denemeler[denemeler.length - 1].net) : 0;
  const ilkNet = denemeler.length ? Number(denemeler[0].net) : 0;

  return (
    <>
      {/*
        origin: panel kendi alt alan adında yaşıyor, adresi ana siteninki
        değil. path "/" çünkü portal.akademitu.com'un kökü. ('both' modunda —
        localhost/önizleme — ayrı bir host olmadığı için ana origin ve /panel
        yolu doğru cevap.)
      */}
      <PageMeta
        title="Panel | akademITU"
        description="akademITU öğrenci ve veli paneli."
        origin={routingMode() === 'both' ? SITE_URL : need.portal.domain}
        path={routingMode() === 'both' ? '/panel' : '/'}
        noIndex
      />

      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-5xl items-center gap-3 px-4 sm:px-6">
            {/*
              Marka adı artık bir bağlantı: panel ayrı bir alt alan adında
              olduğu için ana siteye dönmenin başka yolu kalmadı (header/footer
              bu host'ta hiç render edilmiyor). react-router Link DEĞİL —
              hedef başka bir host.
            */}
            <a
              href={`${SITE_URL}/`}
              className="rounded text-lg font-extrabold tracking-tight text-[#191F61] transition-colors hover:text-[#101442] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
            >
              akademITU
            </a>

            <Button variant="soft" size="sm" onClick={logout} className="ml-auto">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış yap</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191F61] sm:text-4xl">
              Hoş geldin{ilkAd ? `, ${ilkAd}` : ''}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Ders programın, deneme sonuçların ve ödemelerin burada.
            </p>
          </div>

          {hata && (
            <p
              role="alert"
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700"
            >
              {hata}
            </p>
          )}

          {yukleniyor ? (
            <p className="py-16 text-center text-sm text-slate-500">Yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/*
                BU HAFTA — panelin merkezi ve tam genişlikte.
                Öğrencinin panele her girişte bakacağı tek şey hangi gün hangi
                ders; diğer bölümler yanında bilinçli olarak sessiz.
              */}
              <Bolum baslik="Bu hafta" ikon={<CalendarDays className="h-5 w-5" />} genis>
                {ozet?.lessons.length ? (
                  <ul className="divide-y divide-slate-100">
                    {ozet.lessons.map((d) => (
                      <li key={d.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                        <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-slate-50 py-1.5">
                          <span className="text-[11px] font-semibold uppercase text-slate-500">
                            {gunKisa(d.starts_at)}
                          </span>
                          <span className="text-sm font-bold text-[#191F61]">
                            {ayinGunu(d.starts_at)}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{d.subject}</p>
                          {d.teacher_name && (
                            <p className="truncate text-sm text-slate-500">{d.teacher_name}</p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            d.kind === 'koclu'
                              ? 'bg-[#B6D6CC]/50 text-[#191F61]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {saat(d.starts_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Bos>Bu hafta planlanmış dersin görünmüyor.</Bos>
                )}
              </Bolum>

              {/* Grafik CSS sütunlarıyla — birkaç çubuk için kütüphane eklemeye değmez. */}
              <Bolum baslik="Deneme gelişimi" ikon={<TrendingUp className="h-5 w-5" />}>
                {denemeler.length ? (
                  <>
                    {/*
                      Çubuk ve etiketler AYRI SATIRDA: yüzde yükseklik ancak ana
                      kutunun yüksekliği belirli olduğunda çözülür. Aynı sütunda
                      dururken sütun auto yüksekliğe düşüyor ve çubuklar hiç
                      görünmüyordu.
                    */}
                    <div
                      className="flex h-32 items-end gap-2"
                      role="img"
                      aria-label={`Deneme netleri: ${denemeler.map((d) => d.net).join(', ')}`}
                    >
                      {denemeler.map((d, i) => (
                        <div key={d.id} className="flex h-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t-lg ${
                              i === denemeler.length - 1 ? 'bg-[#191F61]' : 'bg-[#191F61]/25'
                            }`}
                            style={{
                              height: enYuksekNet
                                ? `${(Number(d.net) / enYuksekNet) * 100}%`
                                : '0%',
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex gap-2" aria-hidden="true">
                      {denemeler.map((d) => (
                        <span
                          key={d.id}
                          className="flex-1 text-center text-xs font-bold text-slate-600"
                        >
                          {Number(d.net)}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">
                      Son denemede <span className="font-bold text-[#191F61]">{sonNet} net</span>
                      {denemeler.length > 1 && (
                        <>
                          {' '}
                          — ilk denemeye göre {sonNet >= ilkNet ? '' : '−'}
                          {Math.abs(sonNet - ilkNet)} {sonNet >= ilkNet ? 'artış' : 'düşüş'}.
                        </>
                      )}
                    </p>
                  </>
                ) : (
                  <Bos>Henüz deneme sonucun girilmemiş.</Bos>
                )}
              </Bolum>

              <Bolum baslik="Ödemeler" ikon={<CreditCard className="h-5 w-5" />}>
                {ozet?.payments.length ? (
                  <ul className="space-y-2.5">
                    {ozet.payments.map((o) => {
                      const etiket = ODEME_ETIKET[o.status];
                      return (
                        <li
                          key={o.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{o.period}</p>
                            <p className="text-sm text-slate-500">
                              {paraBirimi(Number(o.amount), o.currency)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${etiket.sinif}`}
                          >
                            {etiket.metin}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <Bos>Görüntülenecek ödeme kaydın yok.</Bos>
                )}
              </Bolum>

              <Bolum baslik="Koçundan not" ikon={<MessageSquareQuote className="h-5 w-5" />} genis>
                {ozet?.coachNote ? (
                  <blockquote className="border-l-2 border-[#c5a059] pl-4 text-slate-700">
                    <p className="leading-relaxed whitespace-pre-line">{ozet.coachNote.body}</p>
                    <footer className="mt-3 text-sm font-semibold text-slate-500">
                      {ozet.coachNote.author_name ?? 'Koçun'} · {tarihUzun(ozet.coachNote.written_on)}
                    </footer>
                  </blockquote>
                ) : (
                  <Bos>Koçundan henüz bir not yok.</Bos>
                )}
              </Bolum>
            </div>
          )}

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
                <dd className="mt-1 break-all font-medium text-slate-900">{user?.email ?? '—'}</dd>
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
              Bilgilerinde bir yanlışlık varsa bize ulaş — hesap bilgileri panelden
              değiştirilemiyor.
            </p>
          </section>
        </main>
      </div>
    </>
  );
};
