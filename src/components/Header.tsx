import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, UserRound } from 'lucide-react';
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
            {/* width/height: görsel inmeden yer ayrılır (CLS güvencesi).
                alt'ta "Logo" demiyoruz — ekran okuyucu zaten "görsel" diyor. */}
            <img
              src={logoWhite}
              alt="akademITU"
              width={512}
              height={512}
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
            {/*
              Menü ögeleri <a href> — <button> DEĞİL.
              Eskiden onClick'li butonlardı; DOM'da href üretmedikleri için
              (a) arama motoru sayfanın bölüm yapısını menüden okuyamıyor,
              (b) kullanıcı orta tuşla/yeni sekmede açamıyor, bağlantıyı
              kopyalayamıyordu. onClick yumuşak kaydırmayı korur; href hem
              taranabilirliği hem doğal tarayıcı davranışını geri verir.
            */}
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  href={`#${item.id}`}
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(item.id);
                  }}
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

          {/* SAĞ: GİRİŞ, CTA VE MOBİL MENÜ TETİKLEYİCİSİ */}
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/*
              GİRİŞ YAP — zeminsiz, sadece metin.
              `ghost` varyantı tam olarak bu: durağan hâlde arka planı yok,
              yalnızca hover'da hafif bir gri alıyor. Yanındaki dolu lacivert
              CTA ile yarışmaması için bilinçli olarak sessiz bırakıldı;
              ücretsiz deneme dersi hâlâ sayfanın birincil eylemi.

              Telefonda metin yerine ikon: 375px'te logo + "akademITU" yazısı
              + menü düğmesi zaten ~271px yer kaplıyor, "Giriş yap" metni
              yanlarına sığmayıp yatay kaydırma yaratıyordu. İkon 44x44
              dokunma hedefiyle sığıyor; mobil menü panelinin altında ayrıca
              tam genişlikte metin hâli de var.

              href + onClick birlikte: menü ögelerindeki kalıbın aynısı —
              onClick SPA içinde kalmayı, href orta tuşla yeni sekmede açmayı
              ve bağlantıyı kopyalamayı sağlar.
            */}
            <div className="hidden md:block">
              <Button
                href="/portal"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/portal');
                }}
                className="text-sm"
              >
                Giriş yap
              </Button>
            </div>

            <Button
              href="/portal"
              variant="iconGhost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                navigate('/portal');
              }}
              className="md:hidden w-11 h-11"
              aria-label="Giriş yap"
            >
              <UserRound className="w-6 h-6" />
            </Button>

            {/*
              CTA'nın görünürlüğü butonun kendisinde değil bu sarmalayıcıda:
              Button'ın temel sınıflarındaki `inline-flex`, className'e yazılan
              `hidden` ile aynı özgüllükte olduğu için `hidden` kazanamıyordu.
              Sonuç: buton telefonda da başlıkta duruyor, sağa taşıp yatay
              kaydırma yaratıyor ve menü düğmesini ekran dışına itiyordu.
              Telefonda çağrıyı zaten alttaki yapışkan çubuk ve menü içindeki
              buton karşılıyor.
            */}
            <div className="hidden md:block">
              <Button
                onClick={onOpenTrialForm}
                className="border border-[#c5a059]/40"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                <span>Ücretsiz Deneme Dersi</span>
              </Button>
            </div>

            <Button
              ref={menuTriggerRef}
              variant="iconGhost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              /* Dokunma hedefi 44x44 olmalı; size="icon" (p-2) 40x40 veriyordu. */
              className="md:hidden w-11 h-11"
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
                  className="w-11 h-11"
                  aria-label="Menüyü kapat"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <nav aria-label="Mobil menü" className="flex flex-1 flex-col gap-1 p-4">
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(item.id);
                      }}
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
                    </a>
                  );
                })}
              </nav>

              <div className="border-t border-slate-100 p-4 shrink-0 space-y-2">
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

                {/* Başlıktaki ikonun metinli karşılığı: menüyü açan kişi
                    ikonun ne anlama geldiğini tahmin etmek zorunda kalmaz. */}
                <Button
                  href="/portal"
                  fullWidth
                  variant="soft"
                  size="lg"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    navigate('/portal');
                  }}
                >
                  <UserRound className="w-5 h-5" />
                  Giriş yap
                </Button>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
