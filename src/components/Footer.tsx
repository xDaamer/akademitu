import React, { useState } from 'react';
import { GraduationCap, Mail, Phone, MapPin, Heart } from 'lucide-react';
import logoBlue from '../assets/logo-blue.png';

interface FooterProps {
  onOpenTrialForm: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenTrialForm }) => {
  return (
    <footer className="bg-[#191F61] text-white pt-16 pb-12 border-t border-[#191F61]/80 relative overflow-hidden">
      
      {/* DEKORATİF ARKA PLAN YUMUŞATICI */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#B6D6CC]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          
          {/* MARKA BİLGİSİ */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoBlue} 
                alt="akademITU Logo" 
                className="h-11 md:h-12 w-auto object-contain"
              />
              <span className="text-2xl font-extrabold tracking-tight text-white">
                akadem<span className="text-white">ITU</span>
              </span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">
              Derece hocalarımız ile YKS ve LGS’de hayallerindeki liseye ve üniversiteye hazırlan. Birebir özel ders ve kişiselleştirilmiş koçluk.
            </p>
          </div>

          {/* HIZLI BAĞLANTILAR */}
          <div>
            <h4 className="font-bold text-lg text-white mb-4">
              Hızlı Bağlantılar
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>
                <a href="#ana-sayfa" className="hover:text-[#B6D6CC] transition-colors">Ana Sayfa</a>
              </li>
              <li>
                <a href="#paketler" className="hover:text-[#B6D6CC] transition-colors">Paketler & Fiyatlar</a>
              </li>
              <li>
                <a href="#neden-biz" className="hover:text-[#B6D6CC] transition-colors">Neden akademITU?</a>
              </li>
              <li>
                <a href="#sss" className="hover:text-[#B6D6CC] transition-colors">Sıkça Sorulan Sorular</a>
              </li>
            </ul>
          </div>

          {/* DERSLER & PROGRAMLAR */}
          <div>
            <h4 className="font-bold text-lg text-white mb-4">
              Programlarımız
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li>YKS Sayısal / Eşit Ağırlık Koçluğu</li>
              <li>LGS Birebir Hazırlık & Mentörlük</li>
              <li>Matematik & Geometri Özel Ders</li>
              <li>Fizik, Kimya, Biyoloji Dersleri</li>
              <li>Sınav Stresi & Zaman Yönetimi</li>
            </ul>
          </div>

          {/* İLETİŞİM BİLGİLERİ */}
          <div className="space-y-3">
            <h4 className="font-bold text-lg text-white mb-4">
              İletişim & Destek
            </h4>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Phone className="w-4 h-4 text-[#B6D6CC] shrink-0" />
              <span>05303699539</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MapPin className="w-4 h-4 text-[#B6D6CC] shrink-0" />
              <span>Katar Caddesi Maslak/İstanbul</span>
            </div>
            
            <div className="pt-2">
              <button
                onClick={onOpenTrialForm}
                className="bg-[#B6D6CC] hover:bg-white text-[#191F61] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Ücretsiz Deneme Dersi İste
              </button>
            </div>
          </div>

        </div>

        {/* TELİF HAKKI VE ALT BİLGİ */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 text-center sm:text-left">
          <p>© {new Date().getFullYear()} akademITU. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-1 justify-center">
            <span>Derece Hocalarımız Tarafından</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 fill-current" />
            <span>Geliştirildi</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
