import React, { useState, useEffect } from 'react';
import { Phone } from 'lucide-react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { PackagesSection } from './components/PackagesSection';
import { WhyUsSection } from './components/WhyUsSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { PopUpForm } from './components/PopUpForm';

export default function App() {
  const [formMode, setFormMode] = useState<'scroll' | 'button' | null>(null);
  const [hasScrolledTriggered, setHasScrolledTriggered] = useState(false);
  const [activeSection, setActiveSection] = useState('ana-sayfa');
  const [showWhatsAppPopup, setShowWhatsAppPopup] = useState(false);

  // AUTOMATIC POP-UP ON SCROLL DOWN (Triggers scroll mode form)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      // Auto trigger scroll form after scrolling 280px down
      if (scrollPosition > 280 && !hasScrolledTriggered) {
        setFormMode('scroll');
        setHasScrolledTriggered(true);
      }

      // Track active section for header menu items
      const sections = ['ana-sayfa', 'paketler', 'neden-biz', 'sss'];
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 100) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolledTriggered]);

  const handleOpenTrialForm = () => {
    setFormMode('button');
  };

  const handleCloseTrialForm = () => {
    setFormMode(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#B6D6CC] selection:text-[#191F61]">
      {/* 1. SABİT HEADER (LOGO, YAZI, MENÜ VE BEYAZ METİNLİ MAVİ DÜĞME) */}
      <Header
        onOpenTrialForm={handleOpenTrialForm}
        activeSection={activeSection}
      />

      {/* 2. ANA İÇERİK BÖLÜMLERİ */}
      <main className="flex-grow">
        {/* HERO / ANA SAYFA BÖLÜMÜ */}
        <HeroSection onOpenTrialForm={handleOpenTrialForm} />

        {/* PAKETLER BÖLÜMÜ */}
        <PackagesSection onOpenTrialForm={handleOpenTrialForm} />

        {/* NEDEN BİZ BÖLÜMÜ */}
        <WhyUsSection onOpenTrialForm={handleOpenTrialForm} />

        {/* SIKÇA SORULAN SORULAR */}
        <FAQSection />
      </main>

      {/* 3. FOOTER BÖLÜMÜ */}
      <Footer onOpenTrialForm={handleOpenTrialForm} />

      {/* 4. ÇİFT MODLU DERECE KOÇLUĞU FORMU */}
      <PopUpForm
        isOpen={formMode !== null}
        mode={formMode}
        onClose={handleCloseTrialForm}
      />

      {/* 5. SAĞ TARAF: ARAYALIM BUTONU (SABIT) */}
      <button
        onClick={handleOpenTrialForm}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#191F61] hover:bg-[#0f1436] text-white px-3 py-8 rounded-l-2xl shadow-lg transition-all duration-300 z-40 group hidden sm:flex flex-col items-center justify-center gap-2"
      >
        <Phone className="w-5 h-5" />
        <span className="text-[10px] font-bold whitespace-nowrap writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          Sizi Arayalım
        </span>
      </button>

      {/* 6. SAĞ ALT: WHATSAPP BUTONU (SABIT) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowWhatsAppPopup(true)}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.91 1.187l-.384.214-.397-.013a9.746 9.746 0 00-3.596.364c.001-4.993 4.067-9.036 9.076-9.036 2.416 0 4.685.857 6.463 2.43-.001-1.425-1.162-2.583-2.587-2.583-1.425 0-2.587 1.158-2.587 2.583z"/>
          </svg>
        </button>

        {/* WHATSAPP POPUP */}
        {showWhatsAppPopup && (
          <div className="absolute bottom-20 right-0 bg-white rounded-2xl shadow-2xl p-4 w-64 border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <p className="text-sm font-semibold text-slate-800">
                WhatsApp ile bilgi almak için tıklayın
              </p>
              <button
                onClick={() => setShowWhatsAppPopup(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <a
              href="https://wa.me/905303699539?text=Merhaba! AkademITU için bilgi almak istiyorum."
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-2.5 rounded-xl font-semibold text-sm transition-colors"
            >
              WhatsApp'ta Yazın
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
