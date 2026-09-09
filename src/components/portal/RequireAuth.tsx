import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

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
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Yükleniyor...</p>
      </div>
    );
  }

  if (!user) {
    /* state.from: giriş sonrası kullanıcının gitmek istediği yere dönebilmek
       için saklanıyor. replace: geri tuşu korumalı sayfaya geri atmasın. */
    return <Navigate to="/portal" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};
