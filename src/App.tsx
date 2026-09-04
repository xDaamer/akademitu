import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Phone } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PopUpForm } from './components/PopUpForm';
import { CookieBanner } from './components/CookieBanner';
import { HomePage } from './pages/HomePage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { Button } from './components/ui/Button';

export default function App() {
  const [formMode, setFormMode] = useState<'scroll' | 'button' | null>(null);
  const [hasScrolledTriggered, setHasScrolledTriggered] = useState(false);
  const [activeSection, setActiveSection] = useState('ana-sayfa');
  const location = useLocation();
  const isHome = location.pathname === '/';

  // SEO: Add Organization & WebSite Schema to document head
  useEffect(() => {
    const organizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "akademITU",
      "url": "https://www.akademitu.com",
      "logo": "https://www.akademitu.com/logo.png",
      "description": "YKS ve LGS hazırlık için derece yapmış öğrencilerden kişiye özel koçluk ve özel ders",
      "telephone": "+90-530-369-9539",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "İstanbul",
        "addressRegion": "İstanbul",
        "addressCountry": "TR"
      },
      "sameAs": ["https://www.instagram.com/akademitu", "https://www.youtube.com/@akademitu"]
    };

    const websiteSchema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "akademITU",
      "url": "https://www.akademitu.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://www.akademitu.com/?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    };

    // Create script tags
    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.textContent = JSON.stringify(organizationSchema);
    document.head.appendChild(orgScript);

    const webScript = document.createElement('script');
    webScript.type = 'application/ld+json';
    webScript.textContent = JSON.stringify(websiteSchema);
    document.head.appendChild(webScript);

    return () => {
      document.head.removeChild(orgScript);
      document.head.removeChild(webScript);
    };
  }, []);

  // AUTOMATIC POP-UP ON SCROLL DOWN (Triggers scroll mode form) — home page only
  useEffect(() => {
    if (!isHome) return;

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
  }, [hasScrolledTriggered, isHome]);

  const handleOpenTrialForm = () => {
    setFormMode('button');
  };

  const handleCloseTrialForm = () => {
    setFormMode(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#B6D6CC] selection:text-[#191F61] pb-16 sm:pb-0">
      <Analytics />
      <SpeedInsights />
      {/* 1. SABİT HEADER (LOGO, YAZI, MENÜ VE BEYAZ METİNLİ MAVİ DÜĞME) */}
      <Header
        onOpenTrialForm={handleOpenTrialForm}
        activeSection={activeSection}
      />

      {/* 2. SAYFA İÇERİKLERİ */}
      <Routes>
        <Route path="/" element={<HomePage onOpenTrialForm={handleOpenTrialForm} />} />
        <Route path="/gizlilik-politikasi" element={<PrivacyPolicyPage />} />
        <Route path="/kullanim-kosullari" element={<TermsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* 3. FOOTER BÖLÜMÜ */}
      <Footer onOpenTrialForm={handleOpenTrialForm} />

      {/* 4. ÇİFT MODLU DERECE KOÇLUĞU FORMU */}
      <PopUpForm
        isOpen={formMode !== null}
        mode={formMode}
        onClose={handleCloseTrialForm}
      />

      {/* 5. SAĞ TARAF: ARAYALIM BUTONU (SABIT) */}
      {/* Kendi biçimi olduğu için size="none": renk/hover/odak varyanttan gelir. */}
      <Button
        size="none"
        onClick={handleOpenTrialForm}
        className="fixed right-0 top-1/2 -translate-y-1/2 px-4 py-10 rounded-l-2xl z-40 hidden sm:flex flex-col"
      >
        <Phone className="w-6 h-6" />
        <span
          className="text-[11px] font-bold whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          Sizi Arayalım
        </span>
      </Button>

      {/* 6. SAĞ ALT: WHATSAPP BUTONU (SABIT) */}
      <div className="fixed bottom-24 sm:bottom-6 right-6 z-40 group">
        <a
          href="https://wa.me/905303699539?text=Merhaba! AkademITU için bilgi almak istiyorum."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 active:scale-95 flex items-center justify-center block"
        >
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsb1L0gLGLPI8j2cMJ8xc3_11wDVCJJWJch7ZGRWUNlw&s=10" 
            alt="WhatsApp" 
            className="w-8 h-8 rounded-full"
          />
        </a>

        {/* WHATSAPP TOOLTIP */}
        <div className="absolute bottom-20 right-0 bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Detaylı bilgi al
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-slate-800 transform rotate-45" />
        </div>
      </div>

      {/* 7. MOBİL YAPIŞKAN CTA BAR */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] p-3">
        <Button fullWidth size="lg" onClick={handleOpenTrialForm}>
          Ücretsiz Deneme Dersi Al
        </Button>
      </div>

      {/* 8. ÇEREZ BİLDİRİMİ */}
      <CookieBanner />
    </div>
  );
}

