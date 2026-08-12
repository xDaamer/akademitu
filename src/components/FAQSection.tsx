import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FAQItem } from '../types';

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FAQItem[] = [
    {
      question: 'Ücretsiz deneme dersi tam olarak nasıl gerçekleşiyor?',
      answer: 'Ücretsiz deneme dersi talebinizi bıraktıktan sonra hedefinize ve seviyenize uygun derece hocası koçunuz sizinle iletişime geçer. 30-40 dakikalık online tanışma seansında seviye tespiti yapılır, beklentileriniz dinlenir ve örnek anlatım gerçekleşir. Hiçbir ücret veya taahhüt ödemezsiniz.',
    },
    {
      question: 'Dersleriniz online mı yoksa yüz yüze mi?',
      answer: 'Derslerimiz ve koçluk görüşmelerimiz interaktif dijital tahta, ekran paylaşımı ve HD kamera desteği ile tamamen online olarak yapılmaktadır. Bu sayede Türkiye’nin her yerinden derece hocalarına anında ulaşabilirsiniz.',
    },
    {
      question: 'Hangi derslerden özel ders alabilirim?',
      answer: 'YKS (Matematik, Geometri, Fizik, Kimya, Biyoloji, Türkçe, Paragraf, Tarih, Coğrafya) ve LGS (Matematik, Fen Bilimleri, Türkçe) alanındaki tüm derslerden özel ders alabilirsiniz.',
    },
    {
      question: 'Haftalık 2 ders ve üzeri alımlardaki bedava koçluk nedir?',
      answer: 'Yeni öğrencilere özel kampanyamız kapsamında, haftalık 2 veya daha fazla özel ders alan tüm öğrencilerimize 3.150 TL değerindeki birebir koçluk ve haftalık takip programı tamamen hediye edilmektedir. Minimum bir aylık paketlerde geçerlidir.',
    },
    {
      question: 'Eğitmen kadronuz kimlerden oluşuyor?',
      answer: 'Eğitmenlerimizin tamamı YKS sınavında yüksek derece yapmış, eğitmenlik hizmeti verebilecek kalifiyede sosyal becerilere ve bilgiye sahip akademisyen adaylarından oluşmaktadır.',
    },
    {
      question: 'Ders sonrasında veliler bilgilendiriliyor mu?',
      answer: 'Her özel ders ve koçluk seansı sonrasında velilerimize öğrencinin katılım durumu, performans artışı, konu hakimiyeti, ve izlenen çalışma programı hakkında detaylı bilgi verilir.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="sss" className="py-16 sm:py-24 bg-slate-50 border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SSS BAŞLIK */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[#191F61]/10 text-[#191F61] px-4 py-1.5 rounded-full text-xs font-bold mb-3">
            <HelpCircle className="w-4 h-4 text-[#191F61]" />
            <span>Sıkça Sorulan Sorular</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191F61] tracking-tight">
            Aklınıza Takılan Sorular
          </h2>
          <p className="mt-2 text-slate-600 text-sm sm:text-base">
            akademITU koçluk ve özel ders sistemi hakkında bilmek istediğiniz her şey.
          </p>
        </div>

        {/* ACCORDION LİSTESİ */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition-all duration-200"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                >
                  <span className="font-bold text-base sm:text-lg text-[#191F61]">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#191F61] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-[#191F61]' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100 animate-fade-in">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
