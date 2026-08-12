import React from 'react';
import { ArrowRight, CheckCircle, GraduationCap } from 'lucide-react';
import { TeacherTicker } from './TeacherTicker';

interface HeroSectionProps {
  onOpenTrialForm: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenTrialForm }) => {
  return (
    <section id="ana-sayfa" className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* ANA DİKDÖRTGEN KUTU (YUMUŞATILMIŞ KENARLAR VE MAVİ ARKA PLAN #191F61) */}
      <div className="bg-gradient-to-br from-[#101442] via-[#1a1f5a] to-[#2a3080] rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-10 lg:p-14 text-white shadow-2xl relative overflow-hidden border border-white/10">
        {/* ARKA PLAN DEKORATİF IŞIK/MİNT/GOLD DOKUNUŞLARI */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B6D6CC]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#c5a059]/10 rounded-full blur-2xl pointer-events-none" />

        {/* İKİ EŞİT PARÇAYA BÖLÜNEN GRID (BİLGİSAYAR VE TABLETTE YAN YANA: SOL YAZI/BUTON, SAĞ HOCA KUTUSU; MOBİLDE ALT ALTA) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8 lg:gap-12 items-center relative z-10">
          
          {/* SOL YARI: METİN VE BEYAZ BUTON */}
          <div className="space-y-5 md:space-y-6 lg:pr-4">
            
            {/* BAŞLIK */}
            <h1 className="text-2xl sm:text-3xl md:text-3xl lg:text-5xl font-extrabold text-white leading-[1.18] tracking-tight">
              Derece hocaları ile sınava hazırlan
            </h1>



            {/* AVANTAJ MADDELERİ */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-1 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B6D6CC] shrink-0" />
                <span>YKS & LGS Birebir Ders</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B6D6CC] shrink-0" />
                <span>Kişiye Özel Koçluk</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B6D6CC] shrink-0" />
                <span>Takip & Veli Raporu</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#B6D6CC] shrink-0" />
                <span>İlk Ders Ücretsiz</span>
              </div>
            </div>

            {/* BEYAZ BUTON (İÇİNDE MAVİ YAZI) */}
            <div className="pt-2 sm:pt-4">
              <button
                onClick={onOpenTrialForm}
                className="w-full sm:w-auto bg-white text-[#191F61] hover:bg-[#B6D6CC] hover:text-[#191F61] px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base lg:text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 cursor-pointer group border-b-2 border-[#c5a059]/30"
              >
                <span>Ücretsiz deneme dersi al</span>
                <ArrowRight className="w-5 h-5 text-[#191F61] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* SAĞ YARI: YÜKLENEN GÖRSELLERİN AKACAĞI KUTUCUK */}
          {/* SAĞ YARI: YÜKLENEN GÖRSELLERİN AKACAĞI KUTUCUK */}
          {/* SAĞ YARI: YÜKLENEN GÖRSELLERİN AKACAĞI ALAN (ÇERÇEVESİZ & KUTUSUZ) */}
            <div className="relative h-[360px] sm:h-[400px] md:h-[440px] lg:h-[480px] overflow-hidden">
              <TeacherTicker />
            </div>

        </div>

      </div>
    </section>
  );
};


