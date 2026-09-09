import React from 'react';

/*
 * PORTALIN SOL PANELİ
 * ---------------------------------------------------------------------------
 * Sitenin hero'suyla ve 404 sayfasıyla aynı lacivert gradyan ve aynı iki
 * bulanık ışık lekesi (mint + altın). Yeni bir görsel dil icat edilmiyor:
 * kullanıcı ana sayfadan buraya geldiğinde aynı yerde olduğunu anlamalı.
 *
 * lg altında hiç render edilmiyor (`hidden lg:flex`): telefonda ekranın
 * yarısını dekorasyona vermek, formu katlamanın altına iter.
 */
export const PortalBrandPanel: React.FC = () => {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#101442] via-[#1a1f5a] to-[#2a3080] lg:flex lg:flex-col lg:justify-between lg:p-14">
      {/*
        Dekoratif ışık lekeleri — HeroSection'daki ikisinin aynısı, artı
        başlığın arkasında geniş bir aydınlanma. Hero'da gradyan geniş ve
        yatay bir kutuda çalışıyor; burada panel dar ve uzun olduğu için
        `to-br` gradyanının açık ucu yalnızca sağ alt köşede görünüyor ve
        yüzey düz laciverte iniyordu. Üçüncü leke o düzlüğü kırıyor.
      */}
      <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-[#B6D6CC]/12 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-8 h-80 w-80 rounded-full bg-[#c5a059]/12 blur-2xl" />
      <div className="pointer-events-none absolute left-1/4 top-1/3 h-[30rem] w-[30rem] -translate-y-1/4 rounded-full bg-[#2a3080]/60 blur-3xl" />

      <p className="relative z-10 text-sm font-semibold tracking-tight text-white/60">
        akademITU
      </p>

      <div className="relative z-10 max-w-lg">
        {/*
          Satır kırılmaları elle: "hak eder" gibi bir kapanış cümlesinin
          ortadan bölünmesi vurguyu dağıtıyor. Beyaz kısım iki satır, soluk
          kapanış tek satır — soluk kısım bütün olarak okunmalı, tek kelimesi
          renklendirilmiş bir başlık değil bu.
        */}
        <h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-balance text-white xl:text-5xl">
          Derece hocalarıyla
          <br />
          çalışmak
          <br />
          <span className="text-white/40">bir ayrıcalık değil.</span>
        </h1>

        <div className="mt-8 h-px w-16 bg-[#c5a059]" />

        <p className="mt-8 max-w-sm text-base leading-relaxed text-slate-300">
          Ders programını, ödemelerini ve gelişimini tek panelden takip et.
        </p>
      </div>

      <p className="relative z-10 text-xs text-white/40">
        © {new Date().getFullYear()} akademITU. Tüm hakları saklıdır.
      </p>
    </aside>
  );
};
