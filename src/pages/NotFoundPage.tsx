import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <main className="flex-grow flex items-center justify-center px-4 py-24 bg-slate-50">
      <div className="max-w-lg w-full text-center space-y-6">
        <p className="text-8xl font-extrabold text-[#191F61]">404</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191F61]">
          Aradığınız sayfa bulunamadı
        </h1>
        <p className="text-slate-600">
          Bu sayfa taşınmış, kaldırılmış veya hiç var olmamış olabilir. Ana sayfaya dönerek devam edebilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-[#191F61] hover:bg-[#101442] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-md"
          >
            <Home className="w-4 h-4" />
            Ana Sayfaya Dön
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#191F61] px-6 py-3 rounded-xl font-semibold text-sm transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Geri Git
          </button>
        </div>
      </div>
    </main>
  );
};
