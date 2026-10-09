import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../ui/Button';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { GUN_ADLARI, gunEkle, gunEtiketi } from '../../../lib/haftaTarih';
import { ADIM_DK, dakikaMetni, trAnIso, trGunDakika, type Aralik } from '../../../lib/dersSaati';
import { DenemeRozeti } from '../DenemeRozeti';

/*
 * ÖĞRETMENİN HAFTALIK PROGRAMI — ders atama ızgarası
 * ===========================================================================
 * Ders atarken tarih-saat girmek yerine öğretmenin haftası açılıyor: sütunlar
 * günler, satırlar yarım saatler. Bir hücre ancak şu durumda tıklanabilir:
 *   - o saatte başlayan, seçili süredeki (deneme 25 / normal 50 dk) ders
 *     öğretmenin o günkü müsait aralıklarından BİRİNE tamamen sığıyor, ve
 *   - öğretmenin iptal edilmemiş başka bir dersiyle çakışmıyor.
 *
 * Bu hesap yalnızca gösterim için; sunucu aynı kuralları kendisi uyguluyor
 * (server/dersSaati.ts) ve ÖĞRENCİNİN başka bir dersiyle çakışmayı da orada
 * yakalıyor — o bilgi bu ızgarada yok, öğrencinin programı burada
 * gösterilmiyor.
 *
 * Düzenlenen ders (haricDersId) dolu sayılmıyor: kendi saatinde kalabilsin
 * ya da bir yarım saat kaydırılabilsin.
 */

interface ProgramDersi {
  id: string;
  studentName: string | null;
  subject: string;
  startsAt: string;
  endsAt: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  isTrial: boolean;
}

interface ProgramCevabi {
  weekStart: string;
  availability: Aralik[];
  lessons: ProgramDersi[];
}

/* Müsaitlik tanımlı değilse gösterilecek aralık. */
const VARSAYILAN_ILK = 9 * 60;
const VARSAYILAN_SON = 21 * 60;

/** Bir dersin Türkiye saatiyle günü ve [başlangıç, bitiş) dakikaları. */
function dersDakikalari(d: ProgramDersi) {
  const bas = trGunDakika(d.startsAt);
  const sure = (new Date(d.endsAt).getTime() - new Date(d.startsAt).getTime()) / 60_000;
  return { tarih: bas.tarih, bas: bas.minute, bit: bas.minute + sure };
}

export const OgretmenProgrami: React.FC<{
  ogretmenId: string;
  sureDk: number;
  secili: string | null;
  onSec: (iso: string) => void;
  haricDersId?: string | null;
  /** İlk açılacak hafta (düzenlemede dersin haftası). null: bu hafta. */
  ilkHafta?: string | null;
  /** Değiştikçe program yeniden çekilir — kaydetmeden sonra. */
  yenile?: number;
}> = ({ ogretmenId, sureDk, secili, onSec, haricDersId = null, ilkHafta = null, yenile = 0 }) => {
  const [hafta, setHafta] = useState<string | null>(ilkHafta);
  const [program, setProgram] = useState<ProgramCevabi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  /* Öğretmen ya da düzenlenen ders değişince istenen hafta sıfırlanıyor. */
  useEffect(() => {
    setHafta(ilkHafta);
  }, [ogretmenId, ilkHafta]);

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    const yol = `/api/admin/ogretmenler/${ogretmenId}/program${hafta ? `?week=${hafta}` : ''}`;
    apiFetch<ProgramCevabi>(yol)
      .then((veri) => {
        if (iptal) return;
        setProgram(veri);
        setHata(null);
      })
      .catch((err) => {
        if (iptal) return;
        setHata(err instanceof ApiRequestError ? err.message : 'Öğretmenin programı alınamadı.');
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [ogretmenId, hafta, yenile]);

  const haftaBasi = program?.weekStart ?? null;
  const gunler = useMemo(
    () => (haftaBasi ? Array.from({ length: 7 }, (_, i) => gunEkle(haftaBasi, i)) : []),
    [haftaBasi]
  );

  /* Düzenlenen ders hariç, gün -> o günün dolu dakika aralıkları. */
  const doluluk = useMemo(() => {
    const harita = new Map<string, { bas: number; bit: number; ders: ProgramDersi }[]>();
    for (const ders of program?.lessons ?? []) {
      if (ders.id === haricDersId) continue;
      const { tarih, bas, bit } = dersDakikalari(ders);
      const liste = harita.get(tarih) ?? [];
      liste.push({ bas, bit, ders });
      harita.set(tarih, liste);
    }
    return harita;
  }, [program, haricDersId]);

  /* Satırlar: müsaitliğin ve derslerin kapsadığı en geniş aralık, yarım
     saate yuvarlanmış. Hiçbiri yoksa 09-21. */
  const satirlar = useMemo(() => {
    let ilk = Infinity;
    let son = -Infinity;
    for (const a of program?.availability ?? []) {
      ilk = Math.min(ilk, a.startMinute);
      son = Math.max(son, a.endMinute);
    }
    for (const liste of doluluk.values()) {
      for (const d of liste) {
        ilk = Math.min(ilk, Math.floor(d.bas / ADIM_DK) * ADIM_DK);
        son = Math.max(son, Math.ceil(d.bit / ADIM_DK) * ADIM_DK);
      }
    }
    if (!Number.isFinite(ilk)) {
      ilk = VARSAYILAN_ILK;
      son = VARSAYILAN_SON;
    }
    return Array.from({ length: (son - ilk) / ADIM_DK }, (_, i) => ilk + i * ADIM_DK);
  }, [program, doluluk]);

  const seciliKonum = secili ? trGunDakika(secili) : null;
  const musaitlikYok = (program?.availability.length ?? 0) === 0;

  return (
    <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Öğretmenin programı</p>
          {haftaBasi && (
            <p className="text-xs text-slate-400">
              {gunEtiketi(haftaBasi)} – {gunEtiketi(gunEkle(haftaBasi, 6))}
            </p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => setHafta(null)} disabled={yukleniyor}>
          Bu hafta
        </Button>
        <Button
          type="button"
          variant="soft"
          size="sm"
          aria-label="Önceki hafta"
          disabled={yukleniyor || !haftaBasi}
          onClick={() => haftaBasi && setHafta(gunEkle(haftaBasi, -7))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="soft"
          size="sm"
          aria-label="Sonraki hafta"
          disabled={yukleniyor || !haftaBasi}
          onClick={() => haftaBasi && setHafta(gunEkle(haftaBasi, 7))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {hata ? (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">
          {hata}
        </p>
      ) : yukleniyor && !program ? (
        <p className="py-10 text-center text-sm text-slate-500">Program yükleniyor...</p>
      ) : (
        <>
          {musaitlikYok && (
            <p className="mb-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Bu öğretmenin müsait saati tanımlı değil. Hesaplar sekmesinde öğretmenin satırındaki
              "Müsaitlik" düğmesinden ekleyin.
            </p>
          )}

          {/* Geniş ızgara kendi içinde kayıyor; sayfa gövdesi yatay kaymasın. */}
          <div className={`overflow-x-auto ${yukleniyor ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[640px] border-separate border-spacing-0.5 text-xs">
              <thead>
                <tr>
                  <th className="w-12" />
                  {gunler.map((gun, i) => (
                    <th key={gun} className="pb-1 text-left font-bold text-slate-500">
                      {GUN_ADLARI[i].slice(0, 3)}
                      <span className="ml-1 font-medium text-slate-400">{gunEtiketi(gun)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {satirlar.map((dk) => (
                  <tr key={dk}>
                    <td className="pr-1 text-right align-top font-semibold text-slate-400">
                      {dk % 60 === 0 ? dakikaMetni(dk) : ''}
                    </td>
                    {gunler.map((gun, i) => {
                      const weekday = i + 1;
                      const dolu = (doluluk.get(gun) ?? []).find((d) => d.bas < dk + ADIM_DK && dk < d.bit);

                      if (dolu) {
                        /* Etiket dersin İLK hücresinde; devamı yalnızca dolu
                           görünüyor. */
                        const ilkHucre = dolu.bas >= dk;
                        return (
                          <td key={gun} className="h-8 rounded-md bg-slate-200/80 px-1.5 align-top">
                            {ilkHucre && (
                              <span className="flex items-center gap-1 truncate pt-1 font-semibold text-slate-600">
                                <span className="truncate" title={`${dolu.ders.studentName ?? ''} · ${dolu.ders.subject}`}>
                                  {dolu.ders.studentName ?? 'Ders'}
                                </span>
                                {dolu.ders.isTrial && <DenemeRozeti />}
                              </span>
                            )}
                          </td>
                        );
                      }

                      const aralik = (program?.availability ?? []).find(
                        (a) => a.weekday === weekday && a.startMinute <= dk && dk < a.endMinute
                      );
                      if (!aralik) {
                        return <td key={gun} className="h-8 rounded-md bg-slate-50" />;
                      }

                      const sigiyor =
                        dk + sureDk <= aralik.endMinute &&
                        !(doluluk.get(gun) ?? []).some((d) => d.bas < dk + sureDk && dk < d.bit);
                      const seciliMi = seciliKonum?.tarih === gun && seciliKonum.minute === dk;

                      if (!sigiyor) {
                        /* Müsait ama seçili süredeki ders buradan başlayamıyor
                           (aralığın sonu ya da sonraki ders çok yakın). */
                        return <td key={gun} className="h-8 rounded-md bg-[#B6D6CC]/25" />;
                      }

                      return (
                        <td key={gun} className="h-8 p-0">
                          <button
                            type="button"
                            onClick={() => onSec(trAnIso(gun, dk))}
                            aria-pressed={seciliMi}
                            aria-label={`${GUN_ADLARI[i]} ${gunEtiketi(gun)} ${dakikaMetni(dk)}`}
                            className={`h-8 w-full rounded-md text-left font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#191F61] ${
                              seciliMi
                                ? 'bg-[#c5a059] px-1.5 text-white'
                                : 'bg-[#B6D6CC]/70 px-1.5 text-transparent hover:bg-[#B6D6CC] hover:text-[#191F61]'
                            }`}
                          >
                            {dakikaMetni(dk)}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[#B6D6CC]/70" /> Ders açılabilir
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[#B6D6CC]/25" /> Müsait, ders sığmıyor
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-200" /> Dolu
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-[#c5a059]" /> Seçilen
            </span>
          </div>
        </>
      )}
    </div>
  );
};
