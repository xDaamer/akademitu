import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { teacherPanelPath } from '../../lib/host';
import { PortalDashboardPage } from '../../pages/PortalDashboardPage';

/*
 * PANEL KÖKÜ — KİM GELDİYSE ONUN PANELİ
 * ---------------------------------------------------------------------------
 * portal.akademitu.com/ (ve 'both' modunda /panel) iki rol tarafından da
 * açılabiliyor: giriş sonrası yönlendirme rolü zaten biliyor ama yer imi,
 * elle yazılan adres ve eski /portal* yönlendirmeleri hep köke düşüyor.
 *
 * ÖĞRENCİ PANELİ KÖKTE KALIYOR, öğretmen paneli altındaki bir yola gidiyor:
 * kullanıcıların ezici çoğunluğu öğrenci ve kök adres yer imlerinde,
 * vercel.json'daki yönlendirmelerde ve PANEL_URL'de bu hâliyle geçiyor.
 * Kökü bir "seçim ekranı"na çevirmek herkese fazladan bir tık bindirirdi.
 *
 * Öğretmen için <Navigate> (tam sayfa yüklemesi DEĞİL): hedef aynı host'ta,
 * react-router gezinmesi yeterli. replace — kökten öğretmen paneline geçiş
 * bir adım değil, bir düzeltme; geri tuşu kullanıcıyı buraya geri getirip
 * yeniden yönlendirme döngüsüne sokmamalı.
 */
export const PanelDispatch: React.FC = () => {
  const { user } = useAuth();

  /* RequireAuth dışarıda sarmaladığı için buraya user'sız gelinmez. */
  if (!user) return null;

  if (user.userType === 'teacher') {
    return <Navigate to={teacherPanelPath()} replace />;
  }

  if (user.userType === 'student') {
    return <PortalDashboardPage />;
  }

  /*
   * 'admin' için panel HENÜZ YOK, rolü null olan hesabın ise profil satırı
   * yok. İkisini de öğrenci paneline sokmak yanlış veriyi göstermek olurdu;
   * 404 ise "böyle bir sayfa yok" der, oysa sayfa var — erişilecek bir panel
   * yok. Aradaki fark kullanıcı için anlamlı.
   */
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-extrabold tracking-tight text-[#191F61]">
          Panel hazır değil
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Hesabınız için henüz bir panel tanımlı değil. Lütfen bizimle iletişime geçin.
        </p>
      </div>
    </div>
  );
};
