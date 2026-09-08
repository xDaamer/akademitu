import React from 'react';
import { FileText } from 'lucide-react';
import need from '../../need.json';
import { PageMeta, seoPage } from '../components/PageMeta';
import { LegalBreadcrumb, LegalPageFooter } from '../components/LegalPageChrome';

const page = seoPage('terms');

export const TermsPage: React.FC = () => {
  return (
    <main className="flex-grow bg-slate-50 px-4 py-16 sm:py-24">
      <PageMeta
        title={page.title}
        description={page.description}
        path={page.path}
      />
      <LegalBreadcrumb page={page} label="Kullanım Koşulları" />
      <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-10 text-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#191F61]/10 text-[#191F61] flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191F61]">
            Kullanım Koşulları
          </h1>
        </div>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">1. Genel Hükümler</h2>
            <p>
              {need.site.name} internet sitesini ("Site") kullanarak aşağıdaki kullanım koşullarını kabul etmiş
              sayılırsınız. Bu koşullar, sitenin kullanımına ve sunulan hizmetlere ilişkin kuralları düzenler.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">2. Hizmetin Kapsamı</h2>
            <p>
              {need.site.name}, YKS ve LGS sınavlarına hazırlanan öğrencilere yönelik özel ders ve koçluk hizmeti
              sunmaktadır. Site üzerinden iletilen bilgi talepleri, tarafımızca değerlendirilerek sizinle iletişime
              geçilmesi amacıyla kullanılır.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">3. Kullanıcı Yükümlülükleri</h2>
            <p>
              Site üzerinden ilettiğiniz bilgilerin (ad-soyad, telefon numarası vb.) doğru ve güncel olmasından
              siz sorumlusunuz. Sitenin kötüye kullanımı, yanıltıcı bilgi girilmesi veya üçüncü kişilerin haklarını
              ihlal edecek şekilde kullanılması yasaktır.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">4. Fikri Mülkiyet</h2>
            <p>
              Sitede yer alan tüm marka, logo, metin ve görseller {need.site.name}'a aittir ve izinsiz
              kullanılamaz, çoğaltılamaz.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">5. Sorumluluğun Sınırlandırılması</h2>
            <p>
              Site içeriği bilgilendirme amaçlıdır. {need.site.name}, sitenin kesintisiz veya hatasız çalışacağını
              garanti etmez ve sitenin kullanımından doğabilecek dolaylı zararlardan sorumlu tutulamaz.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">6. Değişiklikler</h2>
            <p>
              {need.site.name}, bu kullanım koşullarını dilediği zaman güncelleme hakkını saklı tutar. Güncel
              koşullar bu sayfada yayınlandığı andan itibaren geçerli olur.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-lg text-[#191F61] mb-2">7. İletişim</h2>
            <p>
              Adres: {need.contact.address.street}, {need.contact.address.city}/{need.contact.address.region}<br />
              Telefon: {need.contact.phone}
            </p>
          </section>

          <LegalPageFooter
            sibling={{ path: '/gizlilik-politikasi', label: 'Gizlilik Politikası' }}
          />
        </div>
      </div>
    </main>
  );
};
