import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, History, CreditCard, MessageSquareQuote, ChevronRight } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiRequestError } from '../lib/api';
import { formatNationalMobile, extractSignificantPhoneDigits } from '../lib/phone';
import { SITE_URL } from '../config';
import need from '../../need.json';
import { routingMode, studentCommentsPath } from '../lib/host';
import { GUN_ADLARI, gunEkle, gunEtiketi } from '../lib/haftaTarih';
import { trTarih } from '../components/portal/TeacherLessonList';
import { PanelHeader } from '../components/portal/PanelHeader';

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
  status: 'scheduled' | 'completed' | 'cancelled';
  kind: 'ders' | 'koclu';
}

interface Yorum {
  text: string;
  updatedAt: string;
}

/** Küçük "Geçmiş dersler" önizlemesi — tam liste /yorumlar sayfasında. */
interface GecmisDers {
  id: string;
  subject: string;
  teacherName: string | null;
  startsAt: string;
  comment: Yorum | null;
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
  weekStart: string;
  lessons: Ders[];
  payments: Odeme[];
  coachNote: KocNotu | null;
  pastLessons: GecmisDers[];
}

const DURUM_ETIKET: Record<Ders['status'], { metin: string; sinif: string }> = {
  scheduled: { metin: 'Planlandı', sinif: 'bg-slate-100 text-slate-600' },
  completed: { metin: 'İşlendi', sinif: 'bg-emerald-100 text-emerald-800' },
  cancelled: { metin: 'İptal', sinif: 'bg-slate-200 text-slate-500' },
};

/** Takvimdeki tek ders kartı — mobil gün listesinde ve masaüstü ızgarada aynı. */
const DersKarti: React.FC<{ ders: Ders }> = ({ ders }) => {
  const durum = DURUM_ETIKET[ders.status];

  return (
    <div
      className={`rounded-lg border p-2 text-left ${
        ders.status === 'cancelled'
          ? 'border-slate-200 bg-slate-50 opacity-70'
          : 'border-[#191F61]/15 bg-[#191F61]/5'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-xs font-bold text-slate-500">{saat(ders.starts_at)}</p>
        {/* Koçluk seansı, normal dersten renkle ayrılıyor — eski düz listedeki
            aynı ayrım, kartlara taşındı. */}
        {ders.kind === 'koclu' && (
          <span className="rounded-full bg-[#B6D6CC]/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#191F61]">
            Koçluk
          </span>
        )}
      </div>
      <p className="truncate text-sm font-bold text-[#191F61]" title={ders.subject}>
        {ders.subject}
      </p>
      {ders.teacher_name && (
        <p className="truncate text-xs text-slate-600" title={ders.teacher_name}>
          {ders.teacher_name}
        </p>
      )}
      <span
        className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${durum.sinif}`}
      >
        {durum.metin}
      </span>
    </div>
  );
};

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
  const { user } = useAuth();
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

  /* Haftanın yedi günü, "YYYY-MM-DD" listesi. Takvimin sütunları/bölümleri. */
  const gunler = useMemo(
    () => (ozet?.weekStart ? Array.from({ length: 7 }, (_, i) => gunEkle(ozet.weekStart, i)) : []),
    [ozet?.weekStart]
  );

  /* Gün -> o günün dersleri. Takvim her hücrede listeyi taramasın diye tek
     seferde kuruluyor — TeacherDashboardPage'deki aynı desen. */
  const gunlereGore = useMemo(() => {
    const harita = new Map<string, Ders[]>();
    for (const ders of ozet?.lessons ?? []) {
      const gun = trTarih(ders.starts_at);
      const mevcut = harita.get(gun);
      if (mevcut) mevcut.push(ders);
      else harita.set(gun, [ders]);
    }
    return harita;
  }, [ozet]);

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
        <PanelHeader />

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191F61] sm:text-4xl">
              Hoş geldin{ilkAd ? `, ${ilkAd}` : ''}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Bu haftanın ders programı, geçmiş derslerin ve ödemelerin burada.
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
                BU HAFTA — panelin merkezi ve tam genişlikte, artık pazartesi-
                pazar 7 günlük bir takvim. Sınırlar sunucuda /api/teacher/
                schedule ile AYNI hafta tanımından geliyor (bkz.
                server/weekUtils.ts), o yüzden bir dersin "bu hafta" olup
                olmadığı öğrenci ve öğretmen panelinde aynı cevabı verir.
              */}
              <Bolum baslik="Bu hafta" ikon={<CalendarDays className="h-5 w-5" />} genis>
                {!ozet?.lessons.length ? (
                  <Bos>Bu hafta planlanmış dersin görünmüyor.</Bos>
                ) : (
                  <>
                    {/*
                      MOBİL: gün gün liste. Yedi sütunlu bir ızgara telefonda
                      okunamaz — TeacherDashboardPage'deki aynı gerekçe.
                    */}
                    <div className="space-y-5 lg:hidden">
                      {gunler.map((gun, i) => {
                        const dersler = gunlereGore.get(gun) ?? [];
                        if (dersler.length === 0) return null;

                        return (
                          <div key={gun}>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                              {GUN_ADLARI[i]} · {gunEtiketi(gun)}
                            </h3>
                            <div className="space-y-2">
                              {dersler.map((ders) => (
                                <DersKarti key={ders.id} ders={ders} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* MASAÜSTÜ: pazartesi-pazar 7 sütun. */}
                    <div className="hidden gap-2 lg:grid lg:grid-cols-7">
                      {gunler.map((gun, i) => {
                        const dersler = gunlereGore.get(gun) ?? [];

                        return (
                          <div key={gun} className="min-w-0">
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                              {GUN_ADLARI[i]}
                              <span className="block font-medium normal-case text-slate-400">
                                {gunEtiketi(gun)}
                              </span>
                            </h3>
                            <div className="space-y-1.5">
                              {dersler.length ? (
                                dersler.map((ders) => <DersKarti key={ders.id} ders={ders} />)
                              ) : (
                                <p className="text-xs text-slate-300">—</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </Bolum>

              {/*
                GEÇMİŞ DERSLER — küçük önizleme. Tam liste ve tamamlanan her
                dersin yorumu zaten /yorumlar sayfasında (StudentCommentsPage);
                burası "hepsini gör"e gitmeden önce son birkaç dersin ve varsa
                koçun notunun hızlı bir özeti.
              */}
              <Bolum baslik="Geçmiş dersler" ikon={<History className="h-5 w-5" />}>
                {ozet?.pastLessons.length ? (
                  <>
                    <ul className="space-y-2.5">
                      {ozet.pastLessons.map((ders) => (
                        <li key={ders.id} className="rounded-xl bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="text-sm font-bold text-[#191F61]">
                              {ders.subject}
                            </span>
                            {ders.teacherName && (
                              <span className="text-xs text-slate-500">· {ders.teacherName}</span>
                            )}
                            <span className="ml-auto text-xs text-slate-400">
                              {tarihUzun(ders.startsAt)}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {ders.comment ? ders.comment.text : 'Henüz yorum eklenmedi.'}
                          </p>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={studentCommentsPath()}
                      className="mt-4 inline-flex items-center gap-1.5 rounded text-sm font-bold text-[#191F61] transition-colors hover:text-[#101442] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
                    >
                      Tümünü gör
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </>
                ) : (
                  <Bos>Henüz tamamlanmış dersin yok.</Bos>
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

                {/*
                  DERS BAZLI yorumlar ayrı bir sayfada: yukarıdaki not
                  öğrenci hakkında GENEL (coach_notes), o sayfadakiler ise
                  BELİRLİ derslere ait (lesson_comments). İkisi farklı veri,
                  farklı soru — ama öğrenci için ikisi de "koçum ne demiş",
                  o yüzden giriş buradan veriliyor.
                */}
                <Link
                  to={studentCommentsPath()}
                  className="mt-4 inline-flex items-center gap-1.5 rounded text-sm font-bold text-[#191F61] transition-colors hover:text-[#101442] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
                >
                  Ders yorumlarını gör
                  <ChevronRight className="h-4 w-4" />
                </Link>
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
