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
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsb1L0gLGLPI8j2cMJ8xc3_11wDVCJJWJch7ZGRWUNlw&s=10" 
            alt="WhatsApp" 
            className="w-6 h-6"
          />
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
