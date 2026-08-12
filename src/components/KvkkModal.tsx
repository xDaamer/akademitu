import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface KvkkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KvkkModal: React.FC<KvkkModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          {/* Backlayer blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 text-slate-800 max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#191F61]/10 text-[#191F61] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#191F61]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-[#191F61]">
                    KVKK Aydınlatma Metni
                  </h3>
                  <p className="text-xs text-slate-500">
                    6698 Sayılı Kişisel Verilerin Korunması Kanunu
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm leading-relaxed text-slate-600 flex-grow">
              <p className="font-semibold text-slate-800">
                Derece Koçluğu Platformu olarak kişisel verilerinizin güvenliğine ve gizliliğine büyük önem veriyoruz.
              </p>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">1. Veri Sorumlusu</h4>
                <p>
                  6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla tarafımızca aşağıda açıklanan kapsamda işlenmektedir.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">2. Kişisel Verilerin İşlenme Amacı</h4>
                <p>
                  Toplanan kişisel verileriniz (Ad, Soyad, Telefon Numarası, Sınıf Bilgisi, Hedef Sınav ve Ders Tercihleri); ücretsiz deneme dersi organizasyonunun sağlanması, derece koçlarımızla iletişim kurulması, eğitim programlarımızın tanıtımı ve tarafınıza özel tekliflerin sunulması amaçlarıyla işlenmektedir.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">3. Verilerin Aktarılması ve Saklanması</h4>
                <p>
                  Kişisel verileriniz, yasal yükümlülükler haricinde üçüncü şahıslarla ve kurumlarla kesinlikle paylaşılmaz. Verileriniz güvenli veritabanı altyapılarında (Supabase) şifrelenmiş olarak saklanmaktadır.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">4. Haklarınız</h4>
                <p>
                  KVKK’nın 11. maddesi uyarınca; verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, verilerinizin düzeltilmesini veya silinmesini isteme hakkına sahipsiniz.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="bg-[#191F61] text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-[#101442] transition-colors cursor-pointer"
              >
                Anladım ve Kapat
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
