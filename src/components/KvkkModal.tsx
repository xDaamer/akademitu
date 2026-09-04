import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';

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
              <Button
                variant="iconGhost"
                size="icon"
                onClick={onClose}
                aria-label="Kapat"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

                        {/* Content (Scrollable) */}
            <div className="overflow-y-auto pr-2 space-y-4 text-xs sm:text-sm leading-relaxed text-slate-600 flex-grow">
              <p className="text-xs text-slate-400">Son Güncelleme Tarihi: 13.08.2026</p>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">1. Veri Sorumlusu</h4>
                <p>6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) kapsamında, Akademitu internet sitesi üzerinden toplanan kişisel verilerinizin veri sorumlusu <strong>Kerem Ünal</strong>&apos;dır.</p>
                <p className="mt-1">Adres: Katar Cd., Maslak Mah., Sarıyer/İstanbul<br />E-posta: keremunl0616@gmail.com</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">2. İşlenen Kişisel Veriler</h4>
                <p>Başvuru formunu doldurmanız halinde şu verileriniz işlenmektedir: ad ve soyad, telefon numarası, okul, sınıf ve bölüm bilgisi. E-posta, sınav netleri veya sağlık gibi özel nitelikli veriler talep edilmemektedir.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">3. İşlenme Amaçları</h4>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>YKS ve LGS koçluğu ile online özel ders hizmetleri hakkında bilgi vermek</li>
                  <li>Başvurunuzu değerlendirmek ve sizinle iletişime geçmek</li>
                  <li>Telefon veya WhatsApp üzerinden iletişim kurmak</li>
                  <li>Hizmet süreçlerinin yürütülmesi ve yasal yükümlülüklerin yerine getirilmesi</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">4. Hukuki Sebep ve Aktarım</h4>
                <p>Verileriniz <strong>meşru menfaat</strong> hukuki sebebine dayanılarak işlenmekte ve <strong>Supabase</strong> altyapısında saklanmaktadır. Üçüncü kişilere satılmaz veya kiralanmaz; yalnızca kanunen yetkili kurumlara aktarılabilir.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">5. Saklanma Süresi</h4>
                <p>Kişisel verileriniz <strong>3 ay</strong> süreyle saklanır; ardından silinir veya anonim hale getirilir.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">6. Reşit Olmayan Öğrenciler</h4>
                <p>18 yaşından küçük kişiler tarafından başvuru yapılması mümkündür. Hizmet sözleşmesi aşamasında gerekli veli/yasal temsilci süreçleri ayrıca yürütülebilir.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">7. Çerezler</h4>
                <p>Sitede mevcut durumda Google Analytics, Meta Pixel veya benzeri takip sistemleri kullanılmamaktadır.</p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-1">8. KVKK Kapsamındaki Haklarınız</h4>
                <p>KVKK&apos;nın 11. maddesi kapsamında verilerinizin işlenmesi, düzeltilmesi, silinmesi ve aktarıldığı taraflar hakkında bilgi alma haklarına sahipsiniz.</p>
                <p className="mt-1">Başvuru: <strong>keremunl0616@gmail.com</strong></p>
              </div>
            </div>

{/* Footer */}
            <div className="pt-4 border-t border-slate-100 mt-4 flex justify-end shrink-0">
              <Button onClick={onClose}>Anladım ve Kapat</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
