import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus, ListChecks, Trash2 } from 'lucide-react';
import { Button } from '../../ui/Button';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import {
  Alan, Girdi, Secim, Kutu, Uyari, Bos,
  isoyaCevir, girdiyeCevir, tarihSaat, type Hesap,
} from './AdminUI';

/*
 * DERS ATAMA
 * ===========================================================================
 * Bir ders bir ÖĞRENCİYE ve (isteğe bağlı) bir ÖĞRETMENE bağlanıyor.
 * Öğretmen boş bırakılabilir — dersin kime atanacağı sonradan belli olan
 * durumlar var ve zorunlu tutmak, dersi hiç girmemeye yol açardı.
 *
 * ROL DOĞRULAMASI SUNUCUDA: "öğrenci" alanına bir öğretmen seçilemez.
 * Buradaki açılır listelerin role göre filtrelenmiş olması bir kolaylık,
 * kontrol değil (bkz. server/routes/admin.ts > dersGovdesi).
 *
 * DURUM alanı burada da var: ders geçmişe dönük giriliyorsa doğrudan
 * "İşlendi" seçilebilsin diye. Öğretmen kendi panelinden de değiştirebiliyor.
 */

interface Ders {
  id: string;
  studentId: string;
  studentName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  subject: string;
  startsAt: string;
  endsAt: string | null;
  kind: 'ders' | 'koclu';
  status: 'scheduled' | 'completed' | 'cancelled';
}

const DURUM_ETIKET: Record<Ders['status'], { metin: string; sinif: string }> = {
  scheduled: { metin: 'Planlandı', sinif: 'bg-slate-100 text-slate-600' },
  completed: { metin: 'İşlendi', sinif: 'bg-emerald-100 text-emerald-800' },
  cancelled: { metin: 'İptal', sinif: 'bg-slate-200 text-slate-500' },
};

const BOS_FORM = {
  studentId: '',
  teacherId: '',
  subject: '',
  startsAt: '',
  endsAt: '',
  kind: 'ders' as Ders['kind'],
  status: 'scheduled' as Ders['status'],
};

export const AdminLessons: React.FC<{ hesaplar: Hesap[] }> = ({ hesaplar }) => {
  const [dersler, setDersler] = useState<Ders[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [form, setForm] = useState(BOS_FORM);
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  const ogrenciler = hesaplar.filter((h) => h.userType === 'student');
  const ogretmenler = hesaplar.filter((h) => h.userType === 'teacher');

  const getir = useCallback(async () => {
    setYukleniyor(true);
    try {
      const veri = await apiFetch<{ lessons: Ders[] }>('/api/admin/dersler');
      setDersler(veri.lessons);
      setHata(null);
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Dersler alınamadı.');
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
      teacherId: form.teacherId || null,
      subject: form.subject,
      startsAt: form.startsAt ? isoyaCevir(form.startsAt) : '',
      endsAt: form.endsAt ? isoyaCevir(form.endsAt) : null,
      kind: form.kind,
      status: form.status,
    };

    try {
      if (duzenlenenId) {
        await apiFetch(`/api/admin/dersler/${duzenlenenId}`, { method: 'PATCH', body: govde });
        setBasari('Ders güncellendi.');
      } else {
        await apiFetch('/api/admin/dersler', { method: 'POST', body: govde });
        setBasari('Ders eklendi.');
      }
      setForm(BOS_FORM);
      setDuzenlenenId(null);
      await getir();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ders kaydedilemedi.');
    } finally {
      setMesgul(false);
    }
  }

  async function sil(id: string) {
    /* Onay şart: silme geri alınamıyor ve dersin yorumu da CASCADE ile
       gidiyor. window.confirm sade ama burada doğru araç — panelde başka
       modal deseni yok ve biri uydurmak bu iş için fazla. */
    if (!window.confirm('Bu ders silinsin mi? Varsa öğretmen yorumu da silinir.')) return;

    setMesgul(true);
    setHata(null);
    setBasari(null);
    try {
      await apiFetch(`/api/admin/dersler/${id}`, { method: 'DELETE' });
      setBasari('Ders silindi.');
      if (duzenlenenId === id) {
        setDuzenlenenId(null);
        setForm(BOS_FORM);
      }
      await getir();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ders silinemedi.');
    } finally {
      setMesgul(false);
    }
  }

  function duzenle(d: Ders) {
    setDuzenlenenId(d.id);
    setForm({
      studentId: d.studentId,
      teacherId: d.teacherId ?? '',
      subject: d.subject,
      startsAt: girdiyeCevir(d.startsAt),
      endsAt: girdiyeCevir(d.endsAt),
      kind: d.kind,
      status: d.status,
    });
    /* Form yukarıda; düzenlemeye basınca oraya kaydır, aksi halde uzun
       listede hiçbir şey olmamış gibi görünüyor. */
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="space-y-6">
      <Kutu baslik={duzenlenenId ? 'Dersi düzenle' : 'Ders ata'} ikon={<CalendarPlus className="h-5 w-5" />}>
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

          <Alan etiket="Öğretmen" ipucu="Boş bırakılabilir.">
            <Secim
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            >
              <option value="">— atanmadı —</option>
              {ogretmenler.map((o) => (
                <option key={o.id} value={o.id}>{o.fullName}</option>
              ))}
            </Secim>
          </Alan>

          <Alan etiket="Ders konusu" genis>
            <Girdi
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="TYT Matematik — Problemler"
              required
            />
          </Alan>

          <Alan etiket="Başlangıç">
            <Girdi
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
            />
          </Alan>

          <Alan etiket="Bitiş" ipucu="Boş bırakılabilir.">
            <Girdi
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </Alan>

          <Alan etiket="Tür">
            <Secim
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Ders['kind'] })}
            >
              <option value="ders">Ders</option>
              <option value="koclu">Koçluk</option>
            </Secim>
          </Alan>

          <Alan etiket="Durum">
            <Secim
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Ders['status'] })}
            >
              <option value="scheduled">Planlandı</option>
              <option value="completed">İşlendi</option>
              <option value="cancelled">İptal</option>
            </Secim>
          </Alan>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={mesgul || ogrenciler.length === 0}>
              {mesgul ? 'Kaydediliyor...' : duzenlenenId ? 'Değişikliği kaydet' : 'Dersi ekle'}
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
        baslik="Dersler"
        ikon={<ListChecks className="h-5 w-5" />}
        sag={<span className="text-xs text-slate-400">{dersler.length} kayıt</span>}
      >
        {yukleniyor ? (
          <p className="py-8 text-center text-sm text-slate-500">Yükleniyor...</p>
        ) : dersler.length === 0 ? (
          <Bos>Henüz ders yok. Yukarıdaki formdan ekleyin.</Bos>
        ) : (
          <ul className="space-y-2">
            {dersler.map((d) => {
              const durum = DURUM_ETIKET[d.status];
              return (
                <li
                  key={d.id}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border p-3 ${
                    duzenlenenId === d.id ? 'border-[#c5a059] bg-[#c5a059]/5' : 'border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-bold text-[#191F61]">
                        {d.studentName ?? 'Bilinmeyen öğrenci'}
                      </span>
                      <span className="truncate text-sm text-slate-600">{d.subject}</span>
                      {d.kind === 'koclu' && (
                        <span className="rounded-full bg-[#B6D6CC]/40 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#2a5d4f]">
                          Koçluk
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {tarihSaat(d.startsAt)}
                      {d.teacherName ? ` · ${d.teacherName}` : ' · öğretmen atanmadı'}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${durum.sinif}`}
                  >
                    {durum.metin}
                  </span>

                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => duzenle(d)}>
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sil(d.id)}
                      disabled={mesgul}
                      aria-label="Dersi sil"
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
