import React, { useCallback, useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { apiFetch, ApiRequestError } from '../../lib/api';
import { Alan, Girdi, Secim, Kutu, Uyari, isoyaCevir } from './admin/AdminUI';

/*
 * ÖĞRETMENİN KENDİ DERSİNİ AÇMASI — eklendi 2026-09-24
 * ===========================================================================
 * AdminLessons'un ("Ders ata") öğretmen sürümü: aynı form ritmi (aynı
 * AdminUI parçaları), ama iki fark var:
 *
 *   1. Öğrenci seçimi TÜM öğrenciler değil — yalnızca /api/teacher/ogrenciler
 *      döndürdükleri: bu öğretmenin daha önce ders verdiği ya da yöneticinin
 *      kendisine atadığı öğrenciler (bkz. server/routes/teacher.ts ve
 *      supabase-teacher-panel.sql §5 — RLS aynı sınırı veritabanında da
 *      çiziyor, bu liste sadece kolaylık).
 *   2. Öğretmen alanı yok (ders her zaman kendi adına açılıyor) ve durum
 *      yalnızca planlandı/işlendi — iptal bir yönetim kararı, ne route ne
 *      de RLS öğretmenin 'cancelled' ile ders açmasına izin veriyor.
 *
 * Var olan dersleri DÜZENLEMİYOR/SİLMİYOR — o hâlâ admin panelinin işi;
 * burası yalnızca YENİ ders açıyor. Açılan ders haftalık programda,
 * TeacherDashboardPage'in kendi sorgusuyla (onEklendi -> yeniden getir)
 * görünür.
 */

interface Ogrenci {
  id: string;
  fullName: string | null;
}

type Tur = 'ders' | 'koclu';
type Durum = 'scheduled' | 'completed';

const BOS_FORM = {
  studentId: '',
  subject: '',
  startsAt: '',
  endsAt: '',
  kind: 'ders' as Tur,
  status: 'scheduled' as Durum,
};

export const TeacherLessonForm: React.FC<{ onEklendi: () => void }> = ({ onEklendi }) => {
  const [ogrenciler, setOgrenciler] = useState<Ogrenci[] | null>(null);
  const [form, setForm] = useState(BOS_FORM);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  const ogrencileriGetir = useCallback(async () => {
    try {
      const veri = await apiFetch<{ students: Ogrenci[] }>('/api/teacher/ogrenciler');
      setOgrenciler(veri.students);
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Öğrenci listesi alınamadı.');
      setOgrenciler([]);
    }
  }, []);

  useEffect(() => {
    void ogrencileriGetir();
  }, [ogrencileriGetir]);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesgul(true);
    setHata(null);
    setBasari(null);

    try {
      await apiFetch('/api/teacher/dersler', {
        method: 'POST',
        body: {
          studentId: form.studentId,
          subject: form.subject,
          startsAt: form.startsAt ? isoyaCevir(form.startsAt) : '',
          endsAt: form.endsAt ? isoyaCevir(form.endsAt) : null,
          kind: form.kind,
          status: form.status,
        },
      });
      setBasari('Ders açıldı.');
      setForm(BOS_FORM);
      onEklendi();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Ders açılamadı.');
    } finally {
      setMesgul(false);
    }
  }

  const yukleniyor = ogrenciler === null;
  const ogrenciYok = !yukleniyor && ogrenciler.length === 0;

  return (
    <Kutu baslik="Yeni ders aç" ikon={<CalendarPlus className="h-5 w-5" />}>
      {hata && <Uyari tur="hata">{hata}</Uyari>}
      {basari && <Uyari tur="basari">{basari}</Uyari>}

      {ogrenciYok && (
        <Uyari tur="hata">
          Henüz size atanmış bir öğrenci yok. Ders açabilmeniz için yöneticinin size en az bir öğrenci
          ataması gerekiyor.
        </Uyari>
      )}

      <form onSubmit={kaydet} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Alan etiket="Öğrenci">
          <Secim
            value={form.studentId}
            onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            required
            disabled={yukleniyor || ogrenciYok}
          >
            <option value="">Seçin...</option>
            {(ogrenciler ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName ?? 'İsimsiz öğrenci'}
              </option>
            ))}
          </Secim>
        </Alan>

        <Alan etiket="Ders konusu">
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
            onChange={(e) => setForm({ ...form, kind: e.target.value as Tur })}
          >
            <option value="ders">Ders</option>
            <option value="koclu">Koçluk</option>
          </Secim>
        </Alan>

        <Alan etiket="Durum">
          <Secim
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as Durum })}
          >
            <option value="scheduled">Planlandı</option>
            <option value="completed">İşlendi</option>
          </Secim>
        </Alan>

        <div className="sm:col-span-2">
          <Button type="submit" disabled={mesgul || yukleniyor || ogrenciYok}>
            {mesgul ? 'Kaydediliyor...' : 'Dersi aç'}
          </Button>
        </div>
      </form>
    </Kutu>
  );
};
