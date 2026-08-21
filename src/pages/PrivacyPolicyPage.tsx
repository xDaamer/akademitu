import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import need from '../../need.json';

export const PrivacyPolicyPage: React.FC = () => {
  useEffect(() => {
    document.title = `Gizlilik Politikası | ${need.site.name}`;
  }, []);

  return (
    <main className="flex-grow bg-slate-50 px-4 py-16 sm:py-24">
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 text-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#191F61]/10 text-[#191F61] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191F61]">
            Gizlilik Politikası & KVKK Aydınlatma Metni
          </h1>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">1. Veri Sorumlusu</h2>
            <p>
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, akademITU olarak
              kişisel verileriniz veri sorumlusu sıfatıyla tarafımızca aşağıda açıklanan kapsamda işlenmektedir.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">2. İşlenen Kişisel Veriler</h2>
            <p>
              Ad-soyad, telefon numarası, öğrencinin okulu, sınıf seviyesi ve ilgilendiği ders/sınav
              türü gibi, tarafınızca form aracılığıyla iletilen kişisel veriler işlenmektedir.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">3. İşlenme Amaçları</h2>
            <p>
              Kişisel verileriniz; koçluk/özel ders hizmeti hakkında bilgi vermek, sizinle iletişime
              geçmek ve talep ettiğiniz hizmeti sunmak amacıyla işlenmektedir.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">4. Verilerin Saklanması ve Aktarımı</h2>
            <p>
              Verileriniz, hizmet sağlayıcımız Supabase üzerinde güvenli şekilde saklanır ve yasal
              zorunluluklar dışında üçüncü kişilerle paylaşılmaz.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">5. Çerezler (Cookies)</h2>
            <p>
              Sitemizde performans ölçümü amacıyla Vercel Analytics ve Vercel Speed Insights kullanılmaktadır.
              Bu araçlar kişisel verilerinizi tanımlayıcı reklam çerezleri ile işlemez. Sitede Google Analytics,
              Meta Pixel veya benzeri üçüncü taraf reklam takip sistemleri kullanılmamaktadır.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">6. Haklarınız</h2>
            <p>
              KVKK'nın 11. maddesi uyarınca kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse
              buna ilişkin bilgi talep etme, verilerinizin silinmesini veya düzeltilmesini isteme haklarına sahipsiniz.
              Bu haklarınızı kullanmak için aşağıdaki iletişim bilgilerinden bize ulaşabilirsiniz.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">7. İletişim</h2>
            <p>
              Adres: {need.contact.address.street}, {need.contact.address.city}/{need.contact.address.region}<br />
              Telefon: {need.contact.phone}
            </p>
          </section>

          <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
            Son güncelleme: 13.08.2026
          </p>
        </div>

        <div className="pt-8">
          <Link to="/" className="text-[#191F61] font-semibold hover:underline text-sm">
            &larr; Ana sayfaya dön
          </Link>
        </div>
      </div>
    </main>
  );
};
