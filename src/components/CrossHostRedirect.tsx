import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { isCrossHost } from '../lib/host';

/**
 * BAŞKA HOST'A YÖNLENDİRME
 * ---------------------------------------------------------------------------
 * react-router'ın <Navigate> bileşeni yalnızca uygulama İÇİNDE gezinir; ona
 * "https://portal.akademitu.com/" vermek işe yaramaz (yolu göreli sanar).
 * akademitu.com ile portal.akademitu.com arası geçiş tam sayfa yüklemesidir.
 *
 * Bu bileşen hedefe bakıp doğru aracı seçer: tam URL ise window.location,
 * göreli yol ise <Navigate>. Böylece aynı JSX yerelde (tek host, göreli yol)
 * ve canlıda (iki host, tam URL) çalışır — bkz. src/lib/host.ts.
 *
 * `replace`: geri tuşu kullanıcıyı yönlendirmenin kaynağına geri atmamalı,
 * yoksa sonsuz bir ileri-geri döngüsü oluşur.
 */
export const CrossHostRedirect: React.FC<{ to: string }> = ({ to }) => {
  const external = isCrossHost(to);

  useEffect(() => {
    if (external) window.location.replace(to);
  }, [external, to]);

  if (!external) return <Navigate to={to} replace />;

  /* Tam sayfa yüklemesi bir an sürüyor; boş ekran yerine bir satır. */
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50">
      <p className="text-sm font-medium text-slate-500">Yönlendiriliyor...</p>
    </div>
  );
};
