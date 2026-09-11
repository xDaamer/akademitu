import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth, type UserType } from '../../context/AuthContext';
import { panelHrefForRole } from '../../lib/host';
import { buttonClasses } from '../ui/Button';

/*
 * ROL KAPISI — RequireAuth'un rol karşılığı
 * ---------------------------------------------------------------------------
 * RequireAuth gibi bu da BİR GÜVENLİK SINIRI DEĞİL, bir gezinme kolaylığı.
 * Tarayıcıda çalışan hiçbir kontrol veri korumaz: paketi iki rol de
 * indiriyor ve bu bileşeni devre dışı bırakmak bir öğrencinin öğretmen
 * ekranının BOŞ HÂLİNİ görmesini sağlar, verisini değil. Gerçek sınır iki
 * katmanda:
 *
 *   sunucu  -> /api/teacher/* rol kapısının arkasında, 403 (server/roles.ts)
 *   veritabanı -> RLS; öğretmen yalnızca teacher_id'si kendisi olan dersleri
 *                 görüyor (supabase-teacher-panel.sql §4)
 *
 * Buradaki iş yalnızca yanlış kapıya gelen kişiye ne olduğunu söylemek.
 *
 * NEDEN SESSİZ YÖNLENDİRME DEĞİL: kullanıcı /ogretmen yazıp kendini bir anda
 * öğrenci panelinde bulursa ne olduğunu anlamaz ("adresi yanlış mı yazdım?").
 * Açık bir mesaj + kendi paneline giden bir düğme, hem dürüst hem de test
 * edilebilir — planın "engelleniyor mu" kabul kriteri gözle doğrulanabilsin.
 */
export const RequireRole: React.FC<{
  allow: UserType;
  children: React.ReactNode;
}> = ({ allow, children }) => {
  const { user, isLoading } = useAuth();

  /*
   * isLoading beklemek şart: /api/auth/me cevabı gelmeden karar verilirse
   * doğru role sahip kullanıcı da sayfayı her yenilediğinde bir an "yetkiniz
   * yok" ekranını görürdü. (Aynı gerekçe RequireAuth'ta da yazılı.)
   */
  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
      </div>
    );
  }

  /* Giriş yapılmamışsa bu bileşenin söyleyecek bir şeyi yok — RequireAuth'un
     işi. Dışarıda o sarmaladığı için buraya normalde user'sız gelinmez. */
  if (!user) return null;

  if (user.userType !== allow) {
    const kendiPaneli = panelHrefForRole(user.userType);

    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </span>

          <h1 className="text-xl font-extrabold tracking-tight text-[#191F61]">
            Bu sayfaya erişiminiz yok
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Bu bölüm {allow === 'teacher' ? 'öğretmen' : 'öğrenci'} hesapları için.
          </p>

          {kendiPaneli && (
            /* react-router Link DEĞİL: hedef 'both' modunda bir yol, canlıda
               başka bir host olabiliyor (bkz. lib/host.ts). <a> ikisinde de
               doğru çalışır. */
            <a
              href={kendiPaneli}
              className={buttonClasses({ variant: 'primary', size: 'md', className: 'mt-6' })}
            >
              Kendi panelime git
            </a>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
