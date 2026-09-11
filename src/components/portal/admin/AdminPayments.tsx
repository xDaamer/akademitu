import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Receipt, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { Alan, Girdi, Secim, Kutu, Uyari, Bos, paraBirimi, type Hesap } from './AdminUI';

/*
 * ÜCRET / ÖDEME GİRİŞİ
 * ===========================================================================
 * Öğrencinin panelindeki "Ödemeler" bölümünü besleyen kayıtlar. Bir ödeme
 * satırı bir DÖNEMİ temsil ediyor (örn. "2026-09"), tek tek dersleri değil —
 * tablo öyle kurulmuş ve öğrenci paneli de dönem bazında gösteriyor.
 *
 * TUTAR DENETİM KAYDINA YAZILMIYOR: supabase-audit-log.sql ödeme detayını
 * açıkça yasaklıyor, log'a yazılan yalnızca hangi satıra dokunulduğu.
 *
 * Para birimi alanı var ama varsayılan TRY; tabloda kolon olduğu için
 * gösteriliyor, çoklu para birimi bir ihtiyaç olduğu için değil.
 */

interface Odeme {
  id: string;
  studentId: string;
  studentName: string | null;
  period: string;
  amount: number;
  currency: string;
  status: 'odendi' | 'bekliyor' | 'gecikti';
  dueOn: string | null;
}

const DURUM_ETIKET: Record<Odeme['status'], { metin: string; sinif: string }> = {
  odendi: { metin: 'Ödendi', sinif: 'bg-emerald-100 text-emerald-800' },
  bekliyor: { metin: 'Bekliyor', sinif: 'bg-[#c5a059]/20 text-[#7a5f2a]' },
  gecikti: { metin: 'Gecikti', sinif: 'bg-rose-100 text-rose-800' },
};

const BOS_FORM = {
  studentId: '',
  period: '',
  amount: '',
  currency: 'TRY',
  status: 'bekliyor' as Odeme['status'],
  dueOn: '',
};

export const AdminPayments: React.FC<{ hesaplar: Hesap[] }> = ({ hesaplar }) => {
  const [odemeler, setOdemeler] = useState<Odeme[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [form, setForm] = useState(BOS_FORM);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  const ogrenciler = hesaplar.filter((h) => h.userType === 'student');

  const getir = useCallback(async () => {
    setYukleniyor(true);
    try {
      const veri = await apiFetch<{ payments: Odeme[] }>('/api/admin/odemeler');
      setOdemeler(veri.payments);
      setHata(null);
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ödemeler alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void getir();
  }, [getir]);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesgul(true);
    setHata(null);
    setBasari(null);

    const govde = {
      studentId: form.studentId,
      period: form.period,
      amount: form.amount,
      currency: form.currency,
      status: form.status,
      dueOn: form.dueOn || null,
    };

    try {
      if (duzenlenenId) {
        await apiFetch(`/api/admin/odemeler/${duzenlenenId}`, { method: 'PATCH', body: govde });
        setBasari('Ödeme güncellendi.');
      } else {
        await apiFetch('/api/admin/odemeler', { method: 'POST', body: govde });
        setBasari('Ödeme eklendi.');
      }
      setForm(BOS_FORM);
      setDuzenlenenId(null);
      await getir();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ödeme kaydedilemedi.');
    } finally {
      setMesgul(false);
    }
  }

  async function sil(id: string) {
    if (!window.confirm('Bu ödeme kaydı silinsin mi?')) return;
    setMesgul(true);
    setHata(null);
    setBasari(null);
    try {
      await apiFetch(`/api/admin/odemeler/${id}`, { method: 'DELETE' });
      setBasari('Ödeme silindi.');
      if (duzenlenenId === id) {
        setDuzenlenenId(null);
        setForm(BOS_FORM);
      }
      await getir();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ödeme silinemedi.');
    } finally {
      setMesgul(false);
    }
  }

  function duzenle(o: Odeme) {
    setDuzenlenenId(o.id);
    setForm({
      studentId: o.studentId,
      period: o.period,
      amount: String(o.amount),
      currency: o.currency,
      status: o.status,
      dueOn: o.dueOn ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <Kutu
        baslik={duzenlenenId ? 'Ödemeyi düzenle' : 'Ücret gir'}
        ikon={<CreditCard className="h-5 w-5" />}
      >
        {hata && <Uyari tur="hata">{hata}</Uyari>}
        {basari && <Uyari tur="basari">{basari}</Uyari>}

        {ogrenciler.length === 0 && (
          <Uyari tur="hata">Önce en az bir öğrenci hesabı açmalısınız.</Uyari>
        )}

        <form onSubmit={kaydet} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Alan etiket="Öğrenci">
            <Secim
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              required
            >
              <option value="">Seçin...</option>
              {ogrenciler.map((o) => (
                <option key={o.id} value={o.id}>{o.fullName}</option>
              ))}
            </Secim>
          </Alan>

          <Alan etiket="Dönem" ipucu="Örn. 2026-09 ya da Eylül 2026">
            <Girdi
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
              placeholder="2026-09"
              required
            />
          </Alan>

          <Alan etiket="Tutar">
            <Girdi
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="9500"
              inputMode="decimal"
              required
            />
          </Alan>

          <Alan etiket="Para birimi">
            <Secim
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              <option value="TRY">TRY</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </Secim>
          </Alan>

          <Alan etiket="Durum">
            <Secim
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Odeme['status'] })}
            >
              <option value="bekliyor">Bekliyor</option>
              <option value="odendi">Ödendi</option>
              <option value="gecikti">Gecikti</option>
            </Secim>
          </Alan>

          <Alan etiket="Son ödeme tarihi" ipucu="Boş bırakılabilir.">
            <Girdi
              type="date"
              value={form.dueOn}
              onChange={(e) => setForm({ ...form, dueOn: e.target.value })}
            />
          </Alan>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mesgul || ogrenciler.length === 0}>
              {mesgul ? 'Kaydediliyor...' : duzenlenenId ? 'Değişikliği kaydet' : 'Ödemeyi ekle'}
            </Button>
            {duzenlenenId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDuzenlenenId(null);
                  setForm(BOS_FORM);
                }}
              >
                Vazgeç
              </Button>
            )}
          </div>
        </form>
      </Kutu>

      <Kutu
        baslik="Ödemeler"
        ikon={<Receipt className="h-5 w-5" />}
        sag={<span className="text-xs text-slate-400">{odemeler.length} kayıt</span>}
      >
        {yukleniyor ? (
          <p className="py-8 text-center text-sm text-slate-500">Yükleniyor...</p>
        ) : odemeler.length === 0 ? (
          <Bos>Henüz ödeme kaydı yok.</Bos>
        ) : (
          <ul className="space-y-2">
            {odemeler.map((o) => {
              const durum = DURUM_ETIKET[o.status];
              return (
                <li
                  key={o.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border p-3 ${
                    duzenlenenId === o.id ? 'border-[#c5a059] bg-[#c5a059]/5' : 'border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-bold text-[#191F61]">
                        {o.studentName ?? 'Bilinmeyen öğrenci'}
                      </span>
                      <span className="text-sm text-slate-600">{o.period}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {paraBirimi(o.amount, o.currency)}
                      {o.dueOn ? ` · son ödeme ${o.dueOn}` : ''}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${durum.sinif}`}
                  >
                    {durum.metin}
                  </span>

                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => duzenle(o)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sil(o.id)}
                      disabled={mesgul}
                      aria-label="Ödemeyi sil"
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Kutu>
    </div>
  );
};
