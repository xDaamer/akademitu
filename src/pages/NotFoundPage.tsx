import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, MessageCircle } from 'lucide-react';
import need from '../../need.json';
import { Button, buttonClasses } from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = `Sayfa Bulunamadı | ${need.site.name}`;
  }, []);

  return (
    <main className="flex-grow flex items-center justify-center px-4 py-16 sm:py-24 bg-slate-50">
      <div className="max-w-xl w-full">
        <div className="bg-gradient-to-br from-[#101442] via-[#1a1f5a] to-[#2a3080] rounded-3xl sm:rounded-[2.5rem] p-8 sm:p-14 text-white shadow-2xl relative overflow-hidden border border-white/10 text-center">
          {/* DEKORATİF ARKA PLAN VURGUSU */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#B6D6CC]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-56 h-56 bg-[#B6D6CC]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <p className="text-7xl sm:text-8xl font-extrabold tracking-tight text-[#B6D6CC]">404</p>
            <h1 className="mt-3 text-xl sm:text-2xl font-extrabold text-white">
              Aradığınız sayfa bulunamadı
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/70 leading-relaxed max-w-md mx-auto">
              Bu sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir. Ana sayfaya dönerek devam edebilir ya da bize doğrudan ulaşabilirsiniz.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* react-router Link olduğu için Button değil, sınıfları kullanılıyor. */}
              <Link
                to="/"
                className={buttonClasses({
                  variant: 'inverse',
                  size: 'lg',
                  className: 'w-full sm:w-auto',
                })}
              >
                <Home className="w-4 h-4" />
                Ana Sayfaya Dön
              </Link>
              <Button
                variant="ghostInverse"
                size="lg"
                onClick={() => window.history.back()}
                className="w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Geri Git
              </Button>
            </div>

            <a
              href={need.contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-[#B6D6CC] hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp'tan bize yazın
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};
