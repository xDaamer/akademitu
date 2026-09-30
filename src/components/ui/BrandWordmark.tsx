import React from 'react';

interface BrandWordmarkProps {
  className?: string;
}

/**
 * Logo görselinin kendi lacivert (#191F61) kare zemini var — açık zeminlerde
 * uyumsuz bir kutu gibi durur. Bu yüzden logo yalnızca lacivert zeminlerde
 * (Footer, PanelHeader, PortalBrandPanel) kullanılıyor; açık zeminlerde
 * onun yerine bu iki satırlık "Sherpa / Akademi" yazısı geçiyor.
 */
export const BrandWordmark: React.FC<BrandWordmarkProps> = ({ className = '' }) => (
  <span className={`flex flex-col leading-[0.95] font-extrabold tracking-tight text-[#191F61] ${className}`}>
    <span>Sherpa</span>
    <span>Akademi</span>
  </span>
);
