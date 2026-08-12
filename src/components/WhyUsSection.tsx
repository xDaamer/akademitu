import React from 'react';
import { Award, BookOpen, BarChart3, Users, MessageSquare, CheckCircle2 } from 'lucide-react';

interface WhyUsSectionProps {
  onOpenTrialForm: () => void;
}

export const WhyUsSection: React.FC<WhyUsSectionProps> = ({ onOpenTrialForm }) => {
  const features = [
    {
      icon: Award,
      title: 'Derece Eğitmenleri',
      description: 'YKS ve LGS sınavlarında derece yapmış, süreci bizzat deneyimlemiş mühendislik ve bilim öğrencileri ile çalışın.',
    },
    {
      icon: BarChart3,
      title: 'Kişiye Özel İlerleme Analizi',
      description: 'Öğrencinin eksik olduğu konular yapay zeka destekli analiz matrisi ile tespit edilir, zaman boşa harcanmaz.',
    },
    {
      icon: BookOpen,
      title: 'Birebir Özel Müfredat',
      description: 'Ezberci yaklaşımlar yerine mantığı kavratan, YKS ve LGS yeni nesil soru tiplerine tam uyumlu özel içerikler.',
    },
    {
      icon: MessageSquare,
      title: 'Şeffaf Veli Bilgilendirmesi',
      description: 'Her ders sonunda işlenen konular, öğrencinin soru çözme hızı ve haftalık ödev takibi veli ile düzenli paylaşılır.',
    },
  ];

  return (
    <section id="neden-biz" className="py-16 sm:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* BAŞLIK */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[#191F61] font-extrabold text-sm uppercase tracking-wider bg-[#191F61]/10 border border-[#c5a059]/30 px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
            Farkımız
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191F61] tracking-tight mt-3">
            Neden akademITU?
          </h2>
          <p className="mt-3 text-slate-600 text-base sm:text-lg">
            Sıradan dershaneler ve kalabalık sınıflar yerine doğrudan derece yapmış mentorlar ile hedefine ulaş.
          </p>
        </div>

        {/* 4 ANA ÖZELLİK KARTLARI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={index}
                className="bg-slate-50 hover:bg-[#191F61] hover:text-white rounded-3xl p-8 border border-slate-200/80 shadow-sm hover:shadow-2xl transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#191F61] text-[#B6D6CC] group-hover:bg-[#B6D6CC] group-hover:text-[#191F61] flex items-center justify-center mb-6 transition-colors duration-300 shadow-md">
                  <IconComponent className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-[#191F61] group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                <p className="mt-3 text-slate-600 group-hover:text-slate-200 text-sm leading-relaxed transition-colors">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* VURGULU İSTATİSTİK BANNERI */}
        <div className="mt-16 bg-[#191F61] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl border border-[#c5a059]/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="pt-4 md:pt-0">
              <span className="block text-4xl sm:text-5xl font-black text-[#B6D6CC]">
                %98.4
              </span>
              <span className="text-sm font-medium text-slate-200 mt-2 block">
                Öğrenci & Veli Memnuniyeti
              </span>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="block text-4xl sm:text-5xl font-black text-[#B6D6CC]">
                100+
              </span>
              <span className="text-sm font-medium text-slate-200 mt-2 block">
                Derece Hocası Koç
              </span>
            </div>
            <div className="pt-4 md:pt-0">
              <span className="block text-4xl sm:text-5xl font-black text-[#B6D6CC]">
                500+
              </span>
              <span className="text-sm font-medium text-slate-200 mt-2 block">
                Dereceye Giren Başarılı Öğrenci
              </span>
            </div>
          </div>

          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <button
              onClick={onOpenTrialForm}
              className="bg-[#B6D6CC] hover:bg-white text-[#191F61] px-8 py-3.5 rounded-2xl font-extrabold text-sm transition-all duration-300 shadow-lg cursor-pointer border border-[#c5a059]/40"
            >
              Sen de Başarı Hikayene Başla (İlk Ders Ücretsiz)
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
