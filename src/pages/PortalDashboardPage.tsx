import React from 'react';
import { LogOut } from 'lucide-react';
import { PageMeta } from '../components/PageMeta';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { formatNationalMobile, extractSignificantPhoneDigits } from '../lib/phone';
import logoBlue from '../assets/logo-blue.png';

/*
 * PANELİN İLK EKRANI — BİLİNÇLİ OLARAK ASGARİ
 * ===========================================================================
 * Bu faz kimlik doğrulama katmanını kurmakla ilgiliydi; panelin gerçek içeriği
 * (ders programı, ödemeler, gelişim) ayrı bir iş. Burada yalnızca oturumun
 * gerçekten çalıştığını gösteren asgari ekran var: sunucudan gelen kullanıcı
 * bilgisi ve çıkış.
 *
 * Bu ekranın var olması testin kendisi: veriler /api/auth/me'den, kullanıcının
 * KENDİ jetonuyla ve RLS altında okunuyor.
 */
export const PortalDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <>
      <PageMeta
        title="Panel | akademITU"
        description="akademITU öğrenci ve veli paneli."
        path="/portal/panel"
        noIndex
      />

      <main className="min-h-dvh bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-20 max-w-4xl items-center gap-3 px-4 sm:px-6">
            <img src={logoBlue} alt="" width={512} height={512} className="h-10 w-10 object-contain" />
            <span className="text-lg font-extrabold tracking-tight text-[#191F61]">
              akademITU
            </span>

            <Button variant="soft" size="sm" onClick={logout} className="ml-auto">
              <LogOut className="h-4 w-4" />
              Çıkış yap
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#191F61]">
            Hoş geldin{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}.
          </h1>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Hesap bilgilerin
            </h2>

            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-slate-500">Ad soyad</dt>
                <dd className="mt-1 font-medium text-slate-900">{user?.fullName ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">E-posta</dt>
                <dd className="mt-1 font-medium text-slate-900">{user?.email ?? '—'}</dd>
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
          </div>

          <p className="mt-6 text-sm text-slate-500">
            Ders programın, ödemelerin ve gelişim raporun yakında burada olacak.
          </p>
        </div>
      </main>
    </>
  );
};
