import React from 'react';

interface BrandWordmarkProps {
  className?: string;
}

/**
 * Markanın iki satırlık yazı hâli. İşaretin YERİNE geçmiyor, YANINDA duruyor:
 * Header ve mobil menüde tek renk lacivert işaretle birlikte render ediliyor.
 *
 * Eskiden logonun tek bir sürümü vardı ve kendi lacivert kare zemini olduğu
 * için açık zeminlerde kutu gibi duruyordu; o yüzden beyaz çubukta işaret hiç
 * gösterilmez, yerine yalnızca bu yazı konurdu. Artık işaretin zemine göre iki
 * şeffaf varyantı var (logo-navy.png açık zeminler, logo-gradient.png lacivert
 * zeminler için), dolayısıyla o kısıt kalktı.
 *
 * Renk sabit #191F61: bu bileşen yalnızca AÇIK zeminlerde kullanılıyor.
 * Lacivert yüzeylerde marka adı yazısı ilgili bileşenin kendi içinde beyaz
 * olarak yazılıyor (Footer, PanelHeader, PortalBrandPanel).
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({ className = '' }) => (
  <span className={`flex flex-col leading-[0.95] font-extrabold tracking-tight text-[#191F61] ${className}`}>
    <span>Sherpa</span>
    <span>Akademi</span>
  </span>
);
