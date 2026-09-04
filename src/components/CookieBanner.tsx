import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { Button } from './ui/Button';

const STORAGE_KEY = 'akademitu_cookie_consent';

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = window.localStorage.getItem(STORAGE_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    window.localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 sm:bottom-0 z-[90] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
        <Cookie className="w-8 h-8 text-[#191F61] shrink-0" />
        <p className="text-sm text-slate-600 leading-relaxed flex-grow text-center sm:text-left">
          Sitemizde performansı ölçmek için Vercel Analytics kullanıyoruz. Üçüncü taraf reklam çerezleri
          kullanılmamaktadır. Detaylar için{' '}
          <Link to="/gizlilik-politikasi" className="text-[#191F61] font-semibold hover:underline">
            Gizlilik Politikası
          </Link>
          'nı inceleyebilirsiniz.
        </p>
        <Button onClick={accept} className="shrink-0 whitespace-nowrap">
          Anladım
        </Button>
      </div>
    </div>
  );
};
