import React, { useState, useEffect } from 'react';
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
    </div>
  );
}
