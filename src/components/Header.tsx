import React, { useState } from 'react';
import { GraduationCap, Menu, X } from 'lucide-react';
import logoWhite from '../assets/logo-white.png';

interface HeaderProps {
  onOpenTrialForm: () => void;
  activeSection: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTrialForm, activeSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'ana-sayfa', label: 'Ana Sayfa' },
    { id: 'paketler', label: 'Paketler' },
    { id: 'neden-biz', label: 'Neden Biz' },
    { id: 'sss', label: 'SSS' },
  ];

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* SOL: LOGO VE AKADEMİTU YAZISI */}
        <a 
          href="#ana-sayfa" 
          onClick={(e) => { e.preventDefault(); scrollToSection('ana-sayfa'); }}
          className="flex items-center gap-3 group"
        >
          <img 
            src={logoWhite} 
            alt="akademITU Logo" 
            className="h-12 md:h-14 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="text-2xl font-extrabold tracking-tight text-[#191F61]">
            akademITU
          </span>
        </a>

        {/* ORTA: MASAÜSTÜ MENÜ SEKMELERİ */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`text-sm font-semibold transition-colors duration-200 relative py-1 ${
                activeSection === item.id 
                  ? 'text-[#191F61]' 
                  : 'text-slate-600 hover:text-[#191F61]'
              }`}
            >
              {item.label}
              {activeSection === item.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#c5a059] rounded-full animate-fade-in" />
              )}
            </button>
          ))}
        </nav>

        {/* SAĞ: ÜCRETSİZ DENEME DERSİ BUTONU (MAVİ ARKA PLAN, BEYAZ YAZI) */}
        <div className="hidden md:flex items-center">
          <button
            onClick={onOpenTrialForm}
            className="bg-[#191F61] hover:bg-[#101442] text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 cursor-pointer border border-[#c5a059]/40"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
            <span>Ücretsiz Deneme Dersi</span>
          </button>
        </div>

        {/* MOBİL MENÜ TOGGLE */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-[#191F61] rounded-lg focus:outline-none"
          aria-label="Menüyü Aç/Kapat"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBİL AÇILIR MENÜ */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 shadow-xl animate-fade-in">
          <div className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-left px-3 py-2 rounded-lg font-medium text-base transition-colors ${
                  activeSection === item.id 
                    ? 'bg-[#191F61]/10 text-[#191F61] font-bold' 
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenTrialForm();
                }}
                className="w-full bg-[#191F61] text-white py-3 rounded-xl font-semibold text-center shadow-md active:scale-95"
              >
                Ücretsiz Deneme Dersi
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
