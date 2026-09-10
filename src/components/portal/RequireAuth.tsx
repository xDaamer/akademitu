import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { CrossHostRedirect } from '../CrossHostRedirect';
import { loginHref } from '../../lib/host';

/*
 * KORUMALI ROUTE
 * ---------------------------------------------------------------------------
 * Bu bir GÜVENLİK SINIRI DEĞİL, bir gezinme kolaylığı. İstemcide çalışan hiçbir
 * kontrol veriyi korumaz; gerçek koruma sunucuda (çerezdeki jeton doğrulanır)
 * ve veritabanında (RLS "yalnızca kendi satırın" der). Buradaki iş sadece
 * giriş yapmamış birini boş bir ekranla baş başa bırakmamak.
 *
 * isLoading beklemek şart: /api/auth/me cevabı gelmeden yönlendirme yapılırsa
 * oturumu AÇIK olan kullanıcı da sayfayı her yenilediğinde bir an giriş
 * ekranına atılırdı.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    /*
     * Giriş ekranı ARTIK BAŞKA BİR HOST'TA (akademitu.com/login); panel
     * portal.akademitu.com'da. Bu yüzden react-router <Navigate> yetmiyor,
     * tam sayfa yüklemesi gerekiyor — bkz. CrossHostRedirect.
     *
     * `state.from` da bu yüzden kaldırıldı: router state'i host geçişinde
     * taşınmaz. Panel host'unda gidilebilecek tek yer zaten kök adres, yani
     * saklanacak bir hedef yok.
     */
    return <CrossHostRedirect to={loginHref()} />;
  }

  return <>{children}</>;
};
