import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Alan, Secim } from './AdminUI';
import { GUN_ADLARI } from '../../../lib/haftaTarih';
import {
  ADIM_DK,
  GUN_DK,
  araliklariBirlestir,
  dakikaMetni,
  type Aralik,
} from '../../../lib/dersSaati';

/*
 * ÖĞRETMENİN HAFTALIK MÜSAİT SAATLERİ — düzenleyici
 * ===========================================================================
 * Hem hesap açarken (zorunlu) hem de mevcut bir öğretmenin müsaitliğini
 * değiştirirken kullanılıyor; kaydetmeyi çağıran taraf yapıyor, burası
 * yalnızca listeyi düzenliyor.
 *
 * Aralık ekleme tek satırdan: gün (ya da "hafta içi"/"her gün"), başlangıç,
 * bitiş. Hafta içi 09:00-17:00 gibi tekrarlayan bir programı yedi kez
 * girmemek için toplu seçenekler var. Saatler yarım saatlik adımlarla —
 * dersler saat başı ve buçukta başlıyor, müsaitlik de aynı ızgarada.
 *
 * Eklenen aralık aynı gündeki bir aralıkla çakışıyor ya da ona bitişikse
 * ikisi birleşiyor (sunucu da aynısını yapıyor); liste her zaman
 * kaydedilecek hâliyle görünüyor.
 */

const GUN_SECENEKLERI: { deger: string; etiket: string; gunler: number[] }[] = [
  ...GUN_ADLARI.map((ad, i) => ({ deger: String(i + 1), etiket: ad, gunler: [i + 1] })),
  { deger: 'hafta-ici', etiket: 'Hafta içi (Pzt–Cum)', gunler: [1, 2, 3, 4, 5] },
  { deger: 'hafta-sonu', etiket: 'Hafta sonu (Cmt–Paz)', gunler: [6, 7] },
  { deger: 'her-gun', etiket: 'Her gün', gunler: [1, 2, 3, 4, 5, 6, 7] },
];

const BASLANGICLAR = Array.from({ length: GUN_DK / ADIM_DK }, (_, i) => i * ADIM_DK);

export const MusaitlikDuzenleyici: React.FC<{
  value: Aralik[];
  onChange: (araliklar: Aralik[]) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled = false }) => {
  const [gun, setGun] = useState('hafta-ici');
  const [bas, setBas] = useState(9 * 60);
  const [bit, setBit] = useState(17 * 60);

  function ekle() {
    const gunler = GUN_SECENEKLERI.find((g) => g.deger === gun)?.gunler ?? [];
    onChange(
      araliklariBirlestir([
        ...value,
        ...gunler.map((weekday) => ({ weekday, startMinute: bas, endMinute: bit })),
      ])
    );
  }

  function kaldir(silinecek: Aralik) {
    onChange(value.filter((a) => a !== silinecek));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <Alan etiket="Gün">
          <Secim value={gun} onChange={(e) => setGun(e.target.value)} disabled={disabled}>
            {GUN_SECENEKLERI.map((g) => (
              <option key={g.deger} value={g.deger}>
                {g.etiket}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Başlangıç">
          <Secim
            value={bas}
            disabled={disabled}
            onChange={(e) => {
              const yeni = Number(e.target.value);
              setBas(yeni);
              /* Bitiş başlangıcın gerisinde kalırsa bir saat sonrasına itiliyor;
                 aksi halde "Ekle" geçersiz bir aralık üretirdi. */
              if (bit <= yeni) setBit(Math.min(yeni + 60, GUN_DK));
            }}
          >
            {BASLANGICLAR.map((dk) => (
              <option key={dk} value={dk}>
                {dakikaMetni(dk)}
              </option>
            ))}
          </Secim>
        </Alan>
        <Alan etiket="Bitiş">
          <Secim value={bit} onChange={(e) => setBit(Number(e.target.value))} disabled={disabled}>
            {BASLANGICLAR.map((dk) => dk + ADIM_DK)
              .filter((dk) => dk > bas)
              .map((dk) => (
                <option key={dk} value={dk}>
                  {dakikaMetni(dk)}
                </option>
              ))}
          </Secim>
        </Alan>
        <Button type="button" variant="soft" size="sm" onClick={ekle} disabled={disabled || bit <= bas}>
          <Plus className="h-4 w-4" />
          Ekle
        </Button>
      </div>

      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
        {GUN_ADLARI.map((ad, i) => {
          const weekday = i + 1;
          const gunun = value.filter((a) => a.weekday === weekday);

          return (
            <li key={ad} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-24 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">
                {ad}
              </span>

              {/* 24 saatlik şerit: günün hangi kısmının dolu olduğu bir
                  bakışta görünsün. Etiketler yanındaki kutucuklarda. */}
              <div
                className="relative hidden h-2 flex-1 overflow-hidden rounded-full bg-slate-100 sm:block"
                aria-hidden="true"
              >
                {gunun.map((a) => (
                  <span
                    key={`${a.startMinute}-${a.endMinute}`}
                    className="absolute inset-y-0 rounded-full bg-[#191F61]/60"
                    style={{
                      left: `${(a.startMinute / GUN_DK) * 100}%`,
                      width: `${((a.endMinute - a.startMinute) / GUN_DK) * 100}%`,
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-wrap gap-1.5 sm:w-64 sm:justify-end">
                {gunun.length === 0 ? (
                  <span className="text-xs text-slate-400">Müsait değil</span>
                ) : (
                  gunun.map((a) => {
                    const metin = `${dakikaMetni(a.startMinute)}–${dakikaMetni(a.endMinute)}`;
                    return (
                      <span
                        key={metin}
                        className="inline-flex items-center gap-1 rounded-full bg-[#191F61]/10 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-[#191F61]"
                      >
                        {metin}
                        <button
                          type="button"
                          onClick={() => kaldir(a)}
                          disabled={disabled}
                          aria-label={`${ad} ${metin} aralığını kaldır`}
                          className="rounded-full p-0.5 hover:bg-[#191F61]/15 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
