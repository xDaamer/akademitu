import React from 'react';

/*
 * "Deneme" rozeti — lessons.is_trial. Yönetim, öğretmen ve öğrenci
 * panellerinde aynı görünsün diye tek yerde. Deneme dersi 25 dk, normal ders
 * 50 dk (bkz. server/dersSaati.ts); rozet süreyi tekrar etmiyor, kartın
 * saat aralığı zaten gösteriyor.
 */
export const DenemeRozeti: React.FC = () => (
  <span className="rounded-full bg-[#c5a059]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7a5f2a]">
    Deneme
  </span>
);
