import React, { useCallback, useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { apiFetch, ApiRequestError } from '../lib/api';
import { SITE_URL } from '../config';
import need from '../../need.json';
import { routingMode, ADMIN_PATH } from '../lib/host';
import { AdminAccounts } from '../components/portal/admin/AdminAccounts';
import { AdminLessons } from '../components/portal/admin/AdminLessons';
import { AdminPayments } from '../components/portal/admin/AdminPayments';
import type { Hesap } from '../components/portal/admin/AdminUI';

/*
 * YÖNETİM PANELİ — portal.akademitu.com/yonetim
 * ===========================================================================
 * Hesap açma, ders atama, ücret girme. Bu üçü daha önce Supabase Dashboard
 * ve elle SQL gerektiriyordu.
 *
 * VERİ /api/admin/* ÜZERİNDEN GELİYOR ve o modül diğer iki panelden FARKLI
 * bir yetki modeli kullanıyor: servis rolü, yani RLS emniyet ağı devrede
 * değil ve sınırın tamamı rol kapısı. Gerekçesi server/routes/admin.ts'in
 * başında ayrıntılı yazılı — oraya yeni bir uç eklemeden önce okunmalı.
 *
 * HESAP LİSTESİ BURADA, SEKMELERDE DEĞİL: ders ve ödeme formlarındaki
 * öğrenci/öğretmen açılır listeleri aynı listeden besleniyor. Her sekme
 * kendi kopyasını çekseydi, panelden yeni açılan bir hesap diğer sekmelerde
 * görünmezdi.
 */

type Sekme = 'hesaplar' | 'dersler' | 'odemeler';

const SEKMELER: { ad: Sekme; etiket: string }[] = [
  { ad: 'hesaplar', etiket: 'Hesaplar' },
  { ad: 'dersler', etiket: 'Dersler' },
  { ad: 'odemeler', etiket: 'Ödemeler' },
];

export const AdminPanelPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [sekme, setSekme] = useState<Sekme>('hesaplar');
  const [hesaplar, setHesaplar] = useState<Hesap[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const hesaplariGetir = useCallback(async () => {
    setYukleniyor(true);
    try {
      const veri = await apiFetch<{ accounts: Hesap[] }>('/api/admin/ozet');
      setHesaplar(veri.accounts);
      setHata(null);
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Hesaplar alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    void hesaplariGetir();
  }, [hesaplariGetir]);

  const ilkAd = user?.fullName?.trim().split(' ')[0];
  const yerel = routingMode() === 'both';

  const ogrenciSayisi = hesaplar.filter((h) => h.userType === 'student').length;
  const ogretmenSayisi = hesaplar.filter((h) => h.userType === 'teacher').length;

  return (
    <>
      <PageMeta
        title="Yönetim Paneli | akademITU"
        description="akademITU yönetim paneli."
        origin={yerel ? SITE_URL : need.portal.domain}
        path={yerel ? `/panel${ADMIN_PATH}` : ADMIN_PATH}
        noIndex
      />

      <div className="min-h-dvh bg-slate-50">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-20 max-w-5xl items-center gap-3 px-4 sm:px-6">
            {/* Ana siteye dönüşün tek yolu: bu host'ta header/footer hiç
                render edilmiyor. react-router Link DEĞİL — hedef başka host. */}
            <a
              href={`${SITE_URL}/`}
              className="rounded text-lg font-extrabold tracking-tight text-[#191F61] transition-colors hover:text-[#101442] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
            >
              akademITU
            </a>

            {/* Üç panel aynı kabuğu paylaşıyor; hangisinde olunduğunu
                söyleyen tek işaret bu rozet. */}
            <span className="rounded-full bg-[#c5a059]/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#7a5f2a]">
              Yönetim
            </span>

            <Button variant="soft" size="sm" onClick={logout} className="ml-auto">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Çıkış yap</span>
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#191F61] sm:text-4xl">
              Yönetim{ilkAd ? ` — ${ilkAd}` : ''}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {ogrenciSayisi} öğrenci · {ogretmenSayisi} öğretmen
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

          {/* Sekmeler: role="tablist" değil basit düğmeler — tam ARIA sekme
              deseni klavye ok tuşu yönetimi gerektiriyor ve üç düğme için
              yarım uygulanmış bir desen, hiç uygulanmamış olandan kötüdür. */}
          <div className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1">
            {SEKMELER.map((s) => (
              <button
                key={s.ad}
                type="button"
                onClick={() => setSekme(s.ad)}
                aria-current={sekme === s.ad ? 'page' : undefined}
                className={`flex-1 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${
                  sekme === s.ad
                    ? 'bg-[#191F61] text-white'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-[#191F61]'
                }`}
              >
                {s.etiket}
              </button>
            ))}
          </div>

          {sekme === 'hesaplar' && (
            <AdminAccounts
              hesaplar={hesaplar}
              yukleniyor={yukleniyor}
              onDegisti={hesaplariGetir}
            />
          )}
          {sekme === 'dersler' && <AdminLessons hesaplar={hesaplar} />}
          {sekme === 'odemeler' && <AdminPayments hesaplar={hesaplar} />}
        </main>
      </div>
    </>
  );
};
