import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import logoWhite from '../assets/logo-white.png';
import { Button } from './ui/Button';

interface HeaderProps {
  onOpenTrialForm: () => void;
  activeSection: string;
}

const navItems = [
  { id: 'ana-sayfa', label: 'Ana Sayfa' },
  { id: 'paketler', label: 'Paketler' },
  { id: 'neden-biz', label: 'Neden Biz' },
  { id: 'sss', label: 'SSS' },
];

export const Header: React.FC<HeaderProps> = ({ onOpenTrialForm, activeSection }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  /*
   * Menü açıkken: Escape kapatır, arka plan kaymaz, odak panele geçer ve
   * kapanınca menü butonuna geri döner. Önceki açılır menüde bunların hiçbiri
   * yoktu — klavyeyle gezen biri menü açıkken arkadaki sayfada kayboluyordu.
   */
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    const trigger = menuTriggerRef.current;
    const previousOverflow = document.body.style.overflow;

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger && document.body.contains(trigger)) trigger.focus();
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center">
          {/* SOL: LOGO VE AKADEMİTU YAZISI */}
          <a
            href="#ana-sayfa"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('ana-sayfa');
            }}
            className="flex shrink-0 items-center gap-3 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
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

          {/*
            ORTA: MASAÜSTÜ MENÜ
            Kapsayıcının ortasına sabitlenir. Eskiden justify-between ile
            duruyordu; o zaman menünün yeri logonun ve butonun genişliğine
            göre kayıyordu, gerçekte ortalanmış değildi.
          */}
          <nav
            aria-label="Ana menü"
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex"
          >
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => scrollToSection(item.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative text-sm ${isActive ? 'text-[#191F61]' : ''}`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-4 bottom-1 h-0.5 rounded-full bg-[#c5a059]" />
                  )}
                </Button>
              );
            })}
          </nav>

          {/* SAĞ: CTA VE MOBİL MENÜ TETİKLEYİCİSİ */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Button
              onClick={onOpenTrialForm}
              className="hidden md:inline-flex border border-[#c5a059]/40"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
              <span>Ücretsiz Deneme Dersi</span>
            </Button>

            <Button
              ref={menuTriggerRef}
              variant="iconGhost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden"
              aria-label="Menüyü aç"
              aria-expanded={mobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </header>

      {/*
        MOBİL PANEL — header'ın DIŞINDA.
        header'daki backdrop-blur, fixed konumlu alt elemanlar için containing
        block yarattığından panel header'ın içinde kalsaydı viewport'a değil
        header'a göre konumlanırdı.
      */}
      {/*
        AnimatePresence'ın çocukları doğrudan ve key'li olmalı; ikisini bir
        fragment'a sarmak exit animasyonlarının hiç çalışmamasına yol açıyordu.
      */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm md:hidden"
            aria-hidden="true"
          />
        )}

        {mobileMenuOpen && (
          <motion.div
              key="menu-panel"
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Menü"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-xs flex-col bg-white shadow-2xl focus:outline-none md:hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 h-20 shrink-0">
                <div className="flex items-center gap-2.5">
                  <img
                    src={logoWhite}
                    alt=""
                    className="h-10 w-auto object-contain"
                  />
                  <span className="text-lg font-extrabold tracking-tight text-[#191F61]">
                    akademITU
                  </span>
                </div>

                <Button
                  variant="iconGhost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Menüyü kapat"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <nav aria-label="Mobil menü" className="flex flex-1 flex-col gap-1 p-4">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-left text-base transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] ${
                        isActive
                          ? 'bg-[#191F61]/10 font-bold text-[#191F61]'
                          : 'font-medium text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                      )}
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 p-4 shrink-0">
                <Button
                  fullWidth
                  size="lg"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenTrialForm();
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                  Ücretsiz Deneme Dersi
                </Button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
