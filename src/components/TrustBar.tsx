import React from 'react';
import { Award, ShieldCheck, Gift, Clock } from 'lucide-react';
import { motion } from 'motion/react';

// SADE GÜVEN ŞERİDİ: Hero'nun hemen altında, ziyaretçiye anında güven veren
// 4 kısa madde. Uydurma istatistik yok — sitenin zaten savunduğu gerçek
// vaatlerin (KVKK modalı, taahhütsüz deneme dersi, esnek online dersler) özeti.
const trustItems = [
  { icon: Award, label: 'Derece Yapmış Koçlar' },
  { icon: ShieldCheck, label: 'KVKK Uyumlu Veri Güvenliği' },
  { icon: Gift, label: 'İlk Ders %100 Ücretsiz' },
  { icon: Clock, label: 'Esnek Online Ders Saatleri' },
];

export const TrustBar: React.FC = () => {
  return (
    <section className="px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-6xl mx-auto -mt-6 sm:-mt-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-900/5 px-5 sm:px-8 py-5 sm:py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 sm:gap-6">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#191F61]/10 text-[#191F61] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-700 leading-tight">
                  {item.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
