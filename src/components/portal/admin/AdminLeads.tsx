import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox, RefreshCw, Search } from 'lucide-react';
import { Button } from '../../ui/Button';
import { WhatsAppIcon } from '../../ui/WhatsAppIcon';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { Girdi, Secim, Kutu, Uyari, Bos, sadeceTarih, sadeceSaat, telefonGoster } from './AdminUI';

/*
 * FORM BAŞVURULARI
 * ===========================================================================
 * Sitedeki iki adımlı formdan (PopUpForm / MobileLeadSheet) gelen kayıtlar,
 * yani public.leads. Bu tabloya şimdiye kadar yalnızca Supabase Dashboard'dan
 * bakılabiliyordu.
 *
 * SALT OKUNUR — bkz. server/routes/admin.ts'teki BAŞVURULAR bölümü.
 *
 * SAYFALAMA SUNUCUDA: diğer sekmeler son 200 satırı çekip yetiniyor, ama
 * başvurular hesaplardan çok daha hızlı büyüyor ve arama da ancak sunucuda
 * bütün tabloyu kapsayabiliyor. Toplam sayı her istekte geliyor.
 *
 * "Ad Soyad" TEK KOLON: form onu tek alan olarak soruyor ve tabloda da tek
 * kolon. Ad ile soyadı burada bölmek tahmin olurdu ("Ayşe Nur Yılmaz"da
 * soyad hangisi?), tahmini veri gibi göstermek de yanıltıcı.
 */

interface Basvuru {
  id: string;
  createdAt: string;
  updatedAt: string | null;
  fullName: string;
  phone: string;
  examType: string | null;
  /* 1: yalnızca ad + telefon geldi, 2: detaylar da doldu. */
  step: number;
  studentFullName: string | null;
  parentFullName: string | null;
  userRole: string | null;
  gradeClass: string | null;
  subjects: string[];
  isRepeat: boolean;
}

interface Cevap {
  leads: Basvuru[];
  total: number;
  page: number;
  pageSize: number;
}

const Yok: React.FC = () => <span className="text-slate-300">—</span>;

/** Boş/null metin için tire; tablo hücrelerinde boşluğu "yüklenmedi" sanmasınlar. */
const Deger: React.FC<{ v: string | null | undefined }> = ({ v }) => (v ? <>{v}</> : <Yok />);

const DurumRozeti: React.FC<{ b: Basvuru }> = ({ b }) => (
  <div className="flex flex-wrap gap-1">
    {b.step >= 2 ? (
      <span
        title={
          b.updatedAt
            ? `Detaylar ${sadeceTarih(b.updatedAt)} ${sadeceSaat(b.updatedAt)}'te dolduruldu.`
            : undefined
        }
        className="whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800"
      >
        Tamamlandı
      </span>
    ) : (
      <span
        title="Yalnızca ilk adım (ad, telefon) gönderildi."
        className="whitespace-nowrap rounded-full bg-[#c5a059]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7a5f2a]"
      >
        Yarım
      </span>
    )}
    {b.isRepeat && (
      <span
        title="Bu numarayla daha önce de başvuru yapılmış."
        className="whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600"
      >
        Tekrar
      </span>
    )}
  </div>
);

/** Arama + WhatsApp bağlantısı. wa.me ülke koduyla ve baştaki 0 olmadan ister. */
const Telefon: React.FC<{ tel: string }> = ({ tel }) => {
  const rakam = tel.replace(/\D/g, '').replace(/^0+/, '');
  const gecerli = /^5\d{9}$/.test(rakam);

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      {gecerli ? (
        <a
          href={`tel:+90${rakam}`}
          className="font-semibold text-[#191F61] underline-offset-2 hover:underline"
        >
          {telefonGoster(tel)}
        </a>
      ) : (
        <span className="font-semibold text-slate-700">{tel}</span>
      )}
      {gecerli && (
        <a
          href={`https://wa.me/90${rakam}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${telefonGoster(tel)} numarasına WhatsApp'tan yaz`}
          className="text-emerald-600 hover:text-emerald-700"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      )}
    </span>
  );
};

/* Başvuranın kim olduğu (Veli / Öğrenci) yalnızca ikinci adımda soruluyor;
   ilk adımda kalan satırda gösterilecek bir cevap yok. */
const rolGoster = (b: Basvuru) => (b.step >= 2 ? b.userRole : null);

const TH =
  'whitespace-nowrap border-b border-slate-200 px-2 pb-2 text-left text-xs font-bold uppercase tracking-wider text-slate-400';
const TD = 'border-b border-slate-100 px-2 py-2.5 align-top text-sm text-slate-700';

export const AdminLeads: React.FC = () => {
  const [arama, setArama] = useState('');
  const [sorguArama, setSorguArama] = useState('');
  const [sinav, setSinav] = useState('');
  const [adim, setAdim] = useState('');
  const [sayfa, setSayfa] = useState(1);
  const [cevap, setCevap] = useState<Cevap | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  /* Filtre hızlı değişince yanıtlar sırasız dönebilir; yalnızca SON isteğin
     cevabı ekrana yazılıyor. */
  const istekNo = useRef(0);
  const ustRef = useRef<HTMLDivElement>(null);

  /* Arama her tuşta değil, yazma durunca gidiyor. Sayfa da aynı anda 1'e
     dönüyor — ikisi tek render'da birleşiyor, iki istek çıkmıyor. */
  useEffect(() => {
    const t = setTimeout(() => {
      setSorguArama(arama.trim());
      setSayfa(1);
    }, 350);
    return () => clearTimeout(t);
  }, [arama]);

  const getir = useCallback(async () => {
    const no = ++istekNo.current;
    setYukleniyor(true);

    const p = new URLSearchParams({ sayfa: String(sayfa) });
    if (sorguArama) p.set('q', sorguArama);
    if (sinav) p.set('sinav', sinav);
    if (adim) p.set('adim', adim);

    try {
      const veri = await apiFetch<Cevap>(`/api/admin/basvurular?${p.toString()}`);
      if (no !== istekNo.current) return;
      setCevap(veri);
      setHata(null);
    } catch (err) {
      if (no !== istekNo.current) return;
      setHata(err instanceof ApiRequestError ? err.message : 'Başvurular alınamadı.');
    } finally {
      if (no === istekNo.current) setYukleniyor(false);
    }
  }, [sayfa, sorguArama, sinav, adim]);

  useEffect(() => {
    void getir();
  }, [getir]);

  function sayfayaGit(yeni: number) {
    setSayfa(yeni);
    /* Sayfa düğmeleri listenin altında; yeni sayfa da yukarıdan okunur. */
    ustRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const basvurular = cevap?.leads ?? [];
  const toplam = cevap?.total ?? 0;
  const boyut = cevap?.pageSize ?? 50;
  const sonSayfa = Math.max(1, Math.ceil(toplam / boyut));
  const ilk = toplam === 0 ? 0 : (sayfa - 1) * boyut + 1;
  const son = Math.min(sayfa * boyut, toplam);
  const filtreVar = Boolean(sorguArama || sinav || adim);

  return (
    <div ref={ustRef} className="scroll-mt-4">
      <Kutu
        baslik="Form başvuruları"
        ikon={<Inbox className="h-5 w-5" />}
        sag={
          <span className="text-xs text-slate-400">
            {cevap ? `${toplam} başvuru` : ''}
          </span>
        }
      >
        {hata && <Uyari tur="hata">{hata}</Uyari>}

        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Ad veya telefon ara</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Girdi
              type="search"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad veya telefon ara"
              className="pl-9"
            />
          </label>

          <Secim
            aria-label="Hedef sınav"
            value={sinav}
            onChange={(e) => {
              setSinav(e.target.value);
              setSayfa(1);
            }}
          >
            <option value="">Tüm sınavlar</option>
            <option value="YKS">YKS</option>
            <option value="LGS">LGS</option>
            <option value="Diğer">Diğer</option>
          </Secim>

          <Secim
            aria-label="Başvuru durumu"
            value={adim}
            onChange={(e) => {
              setAdim(e.target.value);
              setSayfa(1);
            }}
          >
            <option value="">Tüm başvurular</option>
            <option value="2">Tamamlanan</option>
            <option value="1">Yarım kalan</option>
          </Secim>

          <Button
            variant="soft"
            size="sm"
            onClick={() => void getir()}
            disabled={yukleniyor}
            aria-label="Listeyi yenile"
            className="h-full"
          >
            <RefreshCw className={`h-4 w-4 ${yukleniyor ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {!cevap && yukleniyor ? (
          <p className="py-8 text-center text-sm text-slate-500">Yükleniyor...</p>
        ) : basvurular.length === 0 ? (
          <Bos>{filtreVar ? 'Bu filtreyle eşleşen başvuru yok.' : 'Henüz başvuru yok.'}</Bos>
        ) : (
          <div
            aria-busy={yukleniyor}
            className={`transition-opacity ${yukleniyor ? 'opacity-60' : ''}`}
          >
            {/* MOBİL: kart listesi. On kolonlu tablo telefonda okunmuyor. */}
            <ul className="space-y-2 lg:hidden">
              {basvurular.map((b) => (
                <li key={b.id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[#191F61]">
                        {b.fullName}
                        {rolGoster(b) && (
                          <span className="ml-1.5 text-xs font-medium text-slate-500">
                            ({rolGoster(b)})
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {sadeceTarih(b.createdAt)} · {sadeceSaat(b.createdAt)}
                      </p>
                    </div>
                    <DurumRozeti b={b} />
                  </div>

                  <div className="mt-2 text-sm">
                    <Telefon tel={b.phone} />
                  </div>

                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <dt className="font-bold text-slate-400">Sınav</dt>
                    <dd className="text-slate-700"><Deger v={b.examType} /></dd>
                    <dt className="font-bold text-slate-400">Öğrenci</dt>
                    <dd className="text-slate-700"><Deger v={b.studentFullName} /></dd>
                    <dt className="font-bold text-slate-400">Veli</dt>
                    <dd className="text-slate-700"><Deger v={b.parentFullName} /></dd>
                    <dt className="font-bold text-slate-400">Sınıf</dt>
                    <dd className="text-slate-700"><Deger v={b.gradeClass} /></dd>
                    <dt className="font-bold text-slate-400">Dersler</dt>
                    <dd className="text-slate-700">
                      <Deger v={b.subjects.join(', ')} />
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>

            {/* MASAÜSTÜ: tablo. Geniş içerik kendi içinde kayar, sayfa
                gövdesi yatay kaymaz. */}
            <div className="-mx-4 hidden overflow-x-auto px-4 lg:block sm:-mx-6 sm:px-6">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={TH}>Tarih</th>
                    <th className={TH}>Saat</th>
                    <th className={TH}>Ad Soyad</th>
                    <th className={TH}>Telefon</th>
                    <th className={TH}>Sınav</th>
                    <th className={TH}>Öğrenci</th>
                    <th className={TH}>Veli</th>
                    <th className={TH}>Sınıf</th>
                    <th className={TH}>Dersler</th>
                    <th className={TH}>Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {basvurular.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className={`${TD} whitespace-nowrap tabular-nums`}>
                        {sadeceTarih(b.createdAt)}
                      </td>
                      <td className={`${TD} whitespace-nowrap tabular-nums text-slate-500`}>
                        {sadeceSaat(b.createdAt)}
                      </td>
                      <td className={TD}>
                        <span className="font-bold text-[#191F61]">{b.fullName}</span>
                        {rolGoster(b) && (
                          <span className="block text-xs text-slate-500">{rolGoster(b)}</span>
                        )}
                      </td>
                      <td className={TD}>
                        <Telefon tel={b.phone} />
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <Deger v={b.examType} />
                      </td>
                      <td className={TD}>
                        <Deger v={b.studentFullName} />
                      </td>
                      <td className={TD}>
                        <Deger v={b.parentFullName} />
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <Deger v={b.gradeClass} />
                      </td>
                      <td className={`${TD} max-w-[240px] text-xs`}>
                        <Deger v={b.subjects.join(', ')} />
                      </td>
                      <td className={TD}>
                        <DurumRozeti b={b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {toplam > boyut && (
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs tabular-nums text-slate-500">
              {ilk}–{son} / {toplam}
            </span>
            <div className="flex gap-1.5">
              <Button
                variant="soft"
                size="sm"
                aria-label="Önceki sayfa"
                disabled={yukleniyor || sayfa <= 1}
                onClick={() => sayfayaGit(sayfa - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="soft"
                size="sm"
                aria-label="Sonraki sayfa"
                disabled={yukleniyor || sayfa >= sonSayfa}
                onClick={() => sayfayaGit(sayfa + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Kutu>
    </div>
  );
};
