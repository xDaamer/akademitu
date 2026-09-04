import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Phone, User, ArrowRight, ShieldCheck, Check, Gift, Lock, ArrowLeft, ChevronDown, Layers, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadFormData } from '../types';
import { saveLeadStep1, updateLeadStep2 } from '../lib/supabase';
import { KvkkModal } from './KvkkModal';
import { MobileLeadSheet } from './MobileLeadSheet';
import logoWhite from '../assets/logo-white.png';
import { Button } from './ui/Button';

interface PopUpFormProps {
  isOpen: boolean;
  mode: 'scroll' | 'button' | null;
  onClose: () => void;
  onSubmitSuccess?: (data: LeadFormData) => void;
  /**
   * Mobilde alttan açılan kısa form ilk adımı kaydettikten sonra çağrılır:
   * ikinci adım aynı yarım ekranda devam etmez, ana sayfadaki butonun açtığı
   * tam ekran pencereye geçer. Bileşen bu geçişte sökülmediği için girilen
   * ad/telefon ve adım numarası korunur.
   */
  onEscalateToModal?: () => void;
}

const MIDDLE_SCHOOL_GRADES = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'];
const HIGH_SCHOOL_GRADES = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun'];

const LGS_SUBJECTS = [
  'Matematik',
  'Türkçe',
  'Fen Bilimleri',
  'T.C. İnkılap Tarihi',
  'İngilizce',
  'Din Kültürü',
];

const YKS_TYT_SUBJECTS = [
  'TYT Matematik',
  'TYT Geometri',
  'TYT Türkçe',
  'TYT Fizik',
  'TYT Kimya',
  'TYT Biyoloji',
  'TYT Tarih',
  'TYT Coğrafya',
];

const YKS_AYT_SUBJECTS = [
  'AYT Matematik',
  'AYT Geometri',
  'AYT Türk Dili ve Edebiyatı',
  'AYT Fizik',
  'AYT Kimya',
  'AYT Biyoloji',
  'AYT Tarih',
  'AYT Coğrafya',
];

const NOT_DECIDED_SUBJECT = 'Henüz karar vermedim';

// Hedef sınava göre ders müfredatını <optgroup>'lara ayırarak render eder,
// böylece "Diğer" seçiminde onlarca ders tek düz liste yerine LGS/TYT/AYT
// başlıkları altında gruplanır.
const renderSubjectOptions = (examType: 'YKS' | 'LGS' | 'Diğer') => {
  const groups: { label: string; subjects: string[] }[] = [];
  if (examType !== 'YKS') groups.push({ label: 'LGS', subjects: LGS_SUBJECTS });
  if (examType !== 'LGS') {
    groups.push({ label: 'TYT', subjects: YKS_TYT_SUBJECTS });
    groups.push({ label: 'AYT', subjects: YKS_AYT_SUBJECTS });
  }
  return groups.map(({ label, subjects }) => (
    <optgroup key={label} label={label}>
      {subjects.map((subj) => (
        <option key={subj} value={subj}>{subj}</option>
      ))}
    </optgroup>
  ));
};

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '');

const normalizeTurkishMobile = (value: string) => {
  const digits = normalizePhoneNumber(value).replace(/^0+/, '');
  return `0${digits}`.slice(0, 11);
};

const isValidTurkishMobilePhone = (value: string) => {
  const digits = normalizePhoneNumber(value);
  return /^05\d{9}$/.test(digits);
};

// Significant digits only: the 10 digits after the leading 0 (e.g. "532xxxxxxx").
// Used to drive the live "0 (5XX) XXX XX XX" mask below.
const extractSignificantPhoneDigits = (value: string) =>
  normalizePhoneNumber(value).replace(/^0+/, '').slice(0, 10);

const formatPhoneDisplay = (digits: string) => {
  if (!digits) return '';
  const area = digits.slice(0, 3);
  const mid1 = digits.slice(3, 6);
  const mid2 = digits.slice(6, 8);
  const mid3 = digits.slice(8, 10);
  let out = `0 (${area}`;
  if (area.length === 3) out += ')';
  if (mid1) out += ` ${mid1}`;
  if (mid2) out += ` ${mid2}`;
  if (mid3) out += ` ${mid3}`;
  return out;
};

// Marka diliyle uyumlu, ikonlu ve özel oklu select — tarayıcının varsayılan
// dropdown görünümünü (appearance-none) kaldırıp metin girişleriyle aynı
// çerçeve/odak stiline getirir.
interface SelectFieldProps {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}

const SelectField: React.FC<SelectFieldProps> = ({ icon: Icon, label, value, onChange, children }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
      {label}
    </label>
    <div className="relative">
      <Icon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
      <select
        value={value}
        onChange={onChange}
        className="w-full appearance-none pl-11 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] focus:border-transparent transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3.5 top-4 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

/*
 * Yan yana duran seçim düğmeleri (hedef sınav, "ben kimim?"). Aynı işaretleme
 * dört ayrı yerde elle tekrarlanıyordu; tek yerde tanımlı olması, adım 2'ye
 * yeni bir seçim eklendiğinde diğer kopyalarla ayrışmasını engelliyor.
 */
interface ChoiceRowProps {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

const ChoiceRow: React.FC<ChoiceRowProps> = ({ label, options, value, onChange }) => (
  <div className="space-y-1">
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
      {label}
    </label>
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
            value === option
              ? 'bg-[#191F61] text-white border-[#191F61]'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  </div>
);

const EXAM_OPTIONS = ['YKS', 'LGS', 'Diğer'] as const;
const ROLE_OPTIONS = ['Öğrenci', 'Veli'] as const;

export const PopUpForm: React.FC<PopUpFormProps> = ({
  isOpen,
  mode,
  onClose,
  onSubmitSuccess,
  onEscalateToModal,
}) => {
  // Screen size detection for responsive pop-up drawer behavior
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /*
   * GÖVDE KAYDIRMA KİLİDİ — YALNIZCA MOBİL
   * -------------------------------------------------------------------------
   * Telefonda alttan açılan yüzeyin üzerinde yapılan her parmak hareketi
   * altındaki tanıtım sayfasını sürüklüyor, form yerinde duruyordu. Tek başına
   * `overflow: hidden` iOS Safari'de dokunmatik kaydırmayı durdurmadığı için
   * gövde bulunduğu yerde sabitleniyor; kapanışta aynı kaydırma konumuna geri
   * dönülüyor.
   *
   * Masaüstünde bilinçli olarak kilit YOK: orada sağ çekmece açıkken sayfanın
   * kaydırılabilir kalması sitenin önceki davranışı ve bu düzenlemenin kapsamı
   * sadece mobil.
   */
  useEffect(() => {
    if (!isOpen || !isMobile) return;

    const { style } = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
      overflow: style.overflow,
    };

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';
    style.overflow = 'hidden';

    return () => {
      style.position = previous.position;
      style.top = previous.top;
      style.left = previous.left;
      style.right = previous.right;
      style.width = previous.width;
      style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, isMobile]);

  // Step Management: 1 = Initial Lead, 2 = Detailed Student Form, 3 = Final Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [isKvkkOpen, setIsKvkkOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Data
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(''); // empty so the placeholder actually renders
  const [examType, setExamType] = useState<'YKS' | 'LGS' | 'Diğer'>('YKS');
  /*
   * Mobildeki kısa form hedef sınavı sormaz (ad, telefon ve gönder düğmesinin
   * ekranın yarısına sığması için). O durumda soru ikinci adımda sorulur ve
   * cevap updateLeadStep2 ile kayda yazılır — aksi halde bu satırlar
   * veritabanına her zaman varsayılan "YKS" olarak düşerdi.
   */
  const [examDeferred, setExamDeferred] = useState(false);

  // Step 2 Data
  const [studentFullName, setStudentFullName] = useState('');
  const [parentFullName, setParentFullName] = useState('');
  const [userRole, setUserRole] = useState<'Veli' | 'Öğrenci'>('Öğrenci');
  const [gradeClass, setGradeClass] = useState<string>('12. Sınıf');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [website, setWebsite] = useState('');

  const [error, setError] = useState('');

  /*
   * Burada bir "kapalıysa hiçbir şey çizme" erken dönüşü vardı. AnimatePresence
   * çıkış animasyonunu ancak çocuğunu kendisi kaldırdığında oynatabilir; bileşen
   * kapanır kapanmaz null döndüğü için tüm ağaç AnimatePresence'ın haberi olmadan
   * sökülüyor, form açılırken yumuşakça geliyor ama kapanırken bir anda yok
   * oluyordu. Parmakla aşağı sürüklenen bir yüzeyde bu, hareketin ortasında
   * kopan bir kesme gibi hissediliyor. Görünürlük artık aşağıdaki
   * AnimatePresence'ın key'li çocuklarında.
   */

  /** Telefonda alttan açılan, yalnızca ad/telefon soran kısa ilk adım. */
  const isCompactSheet = mode === 'scroll' && isMobile;

  const handleBackToContact = () => {
    setCurrentStep(1);
    setError('');
  };

  const handlePhoneChange = (rawValue: string) => {
    let digits = extractSignificantPhoneDigits(rawValue);
    // Masked inputs re-derive their display from digits alone on every keystroke, so
    // deleting a mask character (a space or a parenthesis) leaves the digit string
    // unchanged and backspace appears to do nothing. Detect that case and drop one
    // more digit so backspace always removes something visible.
    if (rawValue.length < phone.length && digits === extractSignificantPhoneDigits(phone) && digits.length > 0) {
      digits = digits.slice(0, -1);
    }
    setPhone(formatPhoneDisplay(digits));
  };

  // Step 1: persist the initial contact info right away, then reveal the
  // detailed form on the same page. The button reads "Gönder" (Submit), so
  // clicking it must actually save the lead — not just move to step 2
  // locally and defer saving until step 2 is completed too.
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Lütfen Ad ve Soyadınızı giriniz.');
      return;
    }

    const normalizedPhone = normalizeTurkishMobile(phone);
    if (!isValidTurkishMobilePhone(normalizedPhone)) {
      setError('Lütfen telefon numarasını 0 (5XX) XXX XX XX formatında giriniz.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await saveLeadStep1({ fullName, phone: normalizedPhone, examType, website });
      if (!res.success) throw new Error(res.error);
      if (res.id) {
        setLeadId(res.id);
      }
      setStudentFullName(fullName.trim());
      setCurrentStep(2);

      /*
       * Telefonda ikinci adım bu yarım ekranda devam etmez: kayıt alındıktan
       * sonra form, ana sayfadaki "Ücretsiz Deneme Dersi" butonunun açtığı tam
       * ekran pencereye geçer. Hedef sınav orada sorulur (bkz. examDeferred).
       */
      if (isCompactSheet) {
        setExamDeferred(true);
        onEscalateToModal?.();
      }
    } catch (err) {
      console.error('Step 1 Error:', err);
      setError(err instanceof Error ? err.message : 'Form gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: send the full data only when the user submits the final form.
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFullName.trim()) {
      setError('Lütfen Öğrenci Ad ve Soyadını giriniz.');
      return;
    }

    const normalizedPhone = normalizeTurkishMobile(phone);
    if (!isValidTurkishMobilePhone(normalizedPhone)) {
      setError('Lütfen iletişim telefon numarasını 0 (5XX) XXX XX XX formatında giriniz.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      let nextLeadId = leadId;

      if (!nextLeadId) {
        const res = await saveLeadStep1({ fullName, phone: normalizedPhone, examType, website });
        if (!res.success) throw new Error(res.error);
        if (res.id) {
          nextLeadId = res.id;
          setLeadId(res.id);
        }
      }

      const result = await updateLeadStep2({
        leadId: nextLeadId,
        phone: normalizedPhone,
        fullName,
        examType,
        studentFullName,
        parentFullName,
        userRole,
        gradeClass,
        selectedSubjects,
        website,
      });
      if (!result.success) throw new Error(result.error);

      setCurrentStep(3);
      if (onSubmitSuccess) {
        onSubmitSuccess({
          fullName,
          phone,
          examType,
          studentFullName,
          parentFullName,
          userRole,
          gradeClass,
          selectedSubjects,
        });
      }
    } catch (err) {
      console.error('Step 2 Error:', err);
      setError(err instanceof Error ? err.message : 'Form gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSubject = (subj: string) => {
    if (selectedSubjects.includes(subj)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subj));
    } else {
      setSelectedSubjects([...selectedSubjects, subj]);
    }
  };

  const handleReset = () => {
    setCurrentStep(1);
    setLeadId(undefined);
    setFullName('');
    setPhone('');
    setExamType('YKS');
    setExamDeferred(false);
    setStudentFullName('');
    setParentFullName('');
    setUserRole('Öğrenci');
    setGradeClass('12. Sınıf');
    setSelectedSubjects([]);
    setWebsite('');
    setError('');
    onClose();
  };

  return (
    <>
      {/*
        Her iki kip de AnimatePresence'ın DOĞRUDAN ve key'li çocuğu: ikisini bir
        fragment'a sarmak çıkış animasyonlarının hiç çalışmamasına yol açıyor
        (aynı tuzağa Header'daki mobil menüde de düşülmüştü).
      */}
      <AnimatePresence>
            {/* MODE 1: KAYDIRINCA ÇIKAN FORM (MOBİLDE ALTTAN AÇILAN KISA İLK ADIM, MASAÜSTÜNDE SAĞ ÇEKMECE) */}
            {isOpen && mode === 'scroll' && (
              <div key="mode-scroll" className={`fixed inset-0 z-50 overflow-hidden flex ${isMobile ? 'flex-col justify-end' : 'justify-end'}`}>
                {/* ARKA PLAN KARARTMA PERDESİ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs z-0"
                />

                {/*
                  Telefonda ayrı, kısa bir bileşen: masaüstü çekmecesinin tamamı
                  (rozetler, paragraf, sınav seçimi, adım 2 ve adım 3) yarım
                  ekrana sığmıyor, "Gönder" düğmesi görünmüyordu.
                */}
                {isMobile && (
                  <MobileLeadSheet
                    fullName={fullName}
                    phone={phone}
                    website={website}
                    error={error}
                    isSubmitting={isSubmitting}
                    onFullNameChange={setFullName}
                    onPhoneChange={handlePhoneChange}
                    onWebsiteChange={setWebsite}
                    onSubmit={handleStep1Submit}
                    onClose={onClose}
                    onOpenKvkk={() => setIsKvkkOpen(true)}
                  />
                )}

                {/* MASAÜSTÜ: SAĞ ÇEKMECE */}
                {!isMobile && (
                <motion.div
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                  className="relative z-10 w-full md:w-1/2 h-full bg-white text-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto border-l border-slate-200 p-6 sm:p-10 md:p-12"
                >
                  <div>
                    {/* ÜST DÜĞMELER */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div className="flex items-center gap-3 min-w-0">
                        {currentStep === 2 && (
                          <Button
                            variant="iconSoft"
                            size="none"
                            onClick={handleBackToContact}
                            className="rounded-full px-2.5 py-1.5 text-xs font-bold gap-1.5 shrink-0"
                            aria-label="Geri dön"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Geri
                          </Button>
                        )}
                        <img
                          src={logoWhite}
                          alt="akademITU Logo"
                          className="h-10 w-auto object-contain"
                        />
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${currentStep === 1 ? 'bg-[#191F61] animate-pulse' : 'bg-slate-300'}`} />
                          <span className="text-xs font-bold text-slate-600">
                            {currentStep === 1 ? 'Adım 1/2' : currentStep === 2 ? 'Adım 2/2' : 'Tamamlandı'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="iconSoft"
                        size="icon"
                        onClick={onClose}
                        aria-label="Kapat"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold text-[#191F61] tracking-tight mb-2">
                      {currentStep === 1 && 'Ücretsiz Deneme Dersi'}
                      {currentStep === 2 && 'Eğitim Detaylarınız'}
                      {currentStep === 3 && 'Talebiniz Alındı!'}
                    </h2>

                    {/* VURGU ROZETLERİ (ÜCRETSİZ & TAAHHÜTSÜZ) */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                        <Gift className="w-3.5 h-3.5 text-emerald-600" /> %100 Ücretsiz
                      </span>
                      <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Taahhüt veya Bağlılık Yok
                      </span>
                    </div>

                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-6">
                      {currentStep === 1 && 'Derece koçlarımızla birebir tanışın, seviyenizi belirleyin ve ilk dersinizi hiçbir ücret ödemeden ve hiçbir taahhüt vermeden deneyimleyin.'}
                      {currentStep === 2 && 'Koçumuzun sizinle doğru ders programını hazırlayabilmesi için lütfen aşağıdaki detayları tamamlayın.'}
                      {currentStep === 3 && 'Tebrikler! İletişim bilgileriniz bize ulaştı. Derece koçumuz en kısa sürede sizinle iletişime geçecektir.'}
                    </p>

                    {/* STEP 1 FORM */}
                    {currentStep === 1 && (
                      <form onSubmit={handleStep1Submit} className="space-y-4">
                        {error && (
                          <div className="text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                            {error}
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Ad Soyad *
                          </label>
                          <div className="relative">
                            <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Örn: Ahmet Yılmaz"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Telefon Numarası *
                          </label>
                          <div className="relative">
                            <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                            <input
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              placeholder="0 (5XX) XXX XX XX"
                              value={phone}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              maxLength={17}
                              className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                              required
                            />
                          </div>
                        </div>

                        <ChoiceRow
                          label="Hedef Sınavınız"
                          options={EXAM_OPTIONS}
                          value={examType}
                          onChange={(value) => setExamType(value as typeof examType)}
                        />

                        <div className="absolute -left-[10000px]" aria-hidden="true">
                          <label htmlFor="website-scroll">Website</label>
                          <input id="website-scroll" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>

                        <Button
                          type="submit"
                          size="lg"
                          fullWidth
                          disabled={isSubmitting}
                          className="mt-4"
                        >
                          <span>{isSubmitting ? 'Kaydediliyor...' : 'Gönder'}</span>
                          <ArrowRight className="w-4 h-4 text-[#B6D6CC]" />
                        </Button>
                      </form>
                    )}

                    {/* STEP 2 DETAILED FORM */}
                    {currentStep === 2 && (
                      <form onSubmit={handleStep2Submit} className="space-y-4">
                        {error && (
                          <div className="text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                            {error}
                          </div>
                        )}

                        <div className="rounded-2xl border border-[#B6D6CC]/50 bg-[#EBF5F2] p-3 sm:p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Ad Soyad
                              </label>
                              <div className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium">
                                {studentFullName || fullName}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Telefon
                              </label>
                              <div className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium">
                                {phone}
                              </div>
                            </div>
                          </div>
                        </div>

                        <ChoiceRow
                          label="Ben kimim? *"
                          options={ROLE_OPTIONS}
                          value={userRole}
                          onChange={(value) => setUserRole(value as typeof userRole)}
                        />

                        <SelectField
                          icon={Layers}
                          label="Sınıf *"
                          value={gradeClass}
                          onChange={(e) => setGradeClass(e.target.value)}
                        >
                          <optgroup label="Ortaokul">
                            {MIDDLE_SCHOOL_GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Lise">
                            {HIGH_SCHOOL_GRADES.map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </optgroup>
                        </SelectField>

                        <SelectField
                          icon={BookOpen}
                          label="Ders *"
                          value={selectedSubjects[0] || ''}
                          onChange={(e) => setSelectedSubjects(e.target.value ? [e.target.value] : [])}
                        >
                          <option value="">Ders seçiniz</option>
                          <option value={NOT_DECIDED_SUBJECT}>{NOT_DECIDED_SUBJECT}</option>
                          {renderSubjectOptions(examType)}
                        </SelectField>

                        <Button
                          type="submit"
                          size="lg"
                          fullWidth
                          disabled={isSubmitting}
                          className="mt-4"
                        >
                          <span>{isSubmitting ? 'Kaydediliyor...' : 'Tamamla ve Gönder'}</span>
                          <Check className="w-4 h-4 text-[#B6D6CC]" />
                        </Button>
                      </form>
                    )}

                    {/* STEP 3 SUCCESS SCREEN */}
                    {currentStep === 3 && (
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center space-y-4 my-auto">
                        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="font-bold text-xl text-[#191F61]">
                          Talebiniz Başarıyla Alındı!
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          Tebrikler <span className="font-bold text-[#191F61]">{studentFullName || fullName}</span>! Bilgileriniz derece koçumuza iletildi. En kısa sürede sizinle iletişime geçeceğiz.
                        </p>
                        <Button fullWidth size="lg" onClick={handleReset}>
                          Tamamdır
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* KVKK BİLGİLENDİRME YAZISI */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                    <span>Bu formu doldurarak </span>
                    <Button
                      variant="link"
                      onClick={() => setIsKvkkOpen(true)}
                      className="inline"
                    >
                      KVKK Aydınlatma Metni
                    </Button>
                    <span> ve Gizlilik Politikasını onaylamış olursunuz.</span>
                  </div>
                </motion.div>
                )}
              </div>
            )}

            {/* MODE 2: BUTTON CLICK MODAL */}
            {isOpen && mode === 'button' && (
              <div key="mode-button" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-[#191F61]/90 backdrop-blur-xl z-0"
                />

                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                  className="relative z-10 w-full max-w-xl bg-white/95 rounded-3xl shadow-2xl border border-white/50 p-6 sm:p-8 backdrop-blur-2xl my-auto text-slate-900 max-h-[90vh] overflow-y-auto"
                >
                  {/* HEADER */}
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                      {currentStep === 2 && (
                        <Button
                          variant="iconSoft"
                          size="none"
                          onClick={handleBackToContact}
                          /* Telefonda yalnızca ok gösteriliyor: "Geri" yazısı
                             başlığa kalan genişliği iki satıra düşürüyordu.
                             sm ve üstünde düğme eskisiyle birebir aynı. */
                          className="rounded-full p-2 sm:px-2.5 sm:py-1.5 text-xs font-bold gap-1.5 shrink-0"
                          aria-label="Geri dön"
                        >
                          <ArrowLeft className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                          <span className="hidden sm:inline">Geri</span>
                        </Button>
                      )}
                      <img
                        src={logoWhite}
                        alt="akademITU Logo"
                        className="h-11 sm:h-12 w-auto object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-extrabold text-[#191F61] tracking-tight">
                          {currentStep === 1 && 'Ücretsiz Deneme Dersi'}
                          {currentStep === 2 && 'Öğrenci & Ders Detayları'}
                          {currentStep === 3 && 'Talebiniz Alındı!'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {currentStep === 1 ? 'Adım 1/2' : currentStep === 2 ? 'Adım 2/2' : 'İşlem Tamamlandı'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="iconSoft"
                      size="icon"
                      onClick={onClose}
                      aria-label="Kapat"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* STEP 1 FORM (BUTTON MODE) */}
                  {currentStep === 1 && (
                    <form onSubmit={handleStep1Submit} className="space-y-4">
                      {/* VURGU ROZETLERİ (ÜCRETSİZ & TAAHHÜTSÜZ) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                          <Gift className="w-3.5 h-3.5 text-emerald-600" /> %100 Ücretsiz
                        </span>
                        <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold shadow-2xs">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Taahhüt veya Bağlılık Yok
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        Derece hocalarımızla birebir tanışın, seviyenizi belirleyin ve ilk dersinizi hiçbir ücret ödemeden ve hiçbir taahhüt vermeden deneyimleyin.
                      </p>

                      {error && (
                        <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                          {error}
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Ad Soyad *
                        </label>
                        <div className="relative">
                          <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Örn: Ahmet Yılmaz"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Telefon Numarası *
                        </label>
                        <div className="relative">
                          <Phone className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            placeholder="0 (5XX) XXX XX XX"
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            maxLength={17}
                            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <ChoiceRow
                        label="Hedef Sınavınız"
                        options={EXAM_OPTIONS}
                        value={examType}
                        onChange={(value) => setExamType(value as typeof examType)}
                      />

                      <div className="absolute -left-[10000px]" aria-hidden="true">
                        <label htmlFor="website-modal">Website</label>
                        <input id="website-modal" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                        className="mt-2"
                      >
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Gönder'}</span>
                        <ArrowRight className="w-5 h-5 text-[#B6D6CC]" />
                      </Button>
                    </form>
                  )}

                  {/* STEP 2 FORM (BUTTON MODE) */}
                  {currentStep === 2 && (
                    <form onSubmit={handleStep2Submit} className="space-y-4">
                      {error && (
                        <div className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                          {error}
                        </div>
                      )}

                      <div className="rounded-2xl border border-[#B6D6CC]/50 bg-[#EBF5F2] p-3 sm:p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Ad Soyad
                            </label>
                            <div className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium">
                              {studentFullName || fullName}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                              Telefon
                            </label>
                            <div className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 font-medium">
                              {phone}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/*
                        Hedef sınav yalnızca mobildeki kısa ilk adımdan gelindiğinde
                        burada sorulur; normal akışta adım 1'de zaten soruldu ve iki
                        kez sorulması gerekmez.
                      */}
                      {examDeferred && (
                        <ChoiceRow
                          label="Hedef Sınavınız *"
                          options={EXAM_OPTIONS}
                          value={examType}
                          onChange={(value) => setExamType(value as typeof examType)}
                        />
                      )}

                      <ChoiceRow
                        label="Ben kimim? *"
                        options={ROLE_OPTIONS}
                        value={userRole}
                        onChange={(value) => setUserRole(value as typeof userRole)}
                      />

                      <SelectField
                        icon={Layers}
                        label="Sınıf *"
                        value={gradeClass}
                        onChange={(e) => setGradeClass(e.target.value)}
                      >
                        <optgroup label="Ortaokul">
                          {MIDDLE_SCHOOL_GRADES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Lise">
                          {HIGH_SCHOOL_GRADES.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </optgroup>
                      </SelectField>

                      <SelectField
                        icon={BookOpen}
                        label="Ders *"
                        value={selectedSubjects[0] || ''}
                        onChange={(e) => setSelectedSubjects(e.target.value ? [e.target.value] : [])}
                      >
                        <option value="">Ders seçiniz</option>
                        <option value={NOT_DECIDED_SUBJECT}>{NOT_DECIDED_SUBJECT}</option>
                        {renderSubjectOptions(examType)}
                      </SelectField>

                      <Button
                        type="submit"
                        size="lg"
                        fullWidth
                        disabled={isSubmitting}
                        className="mt-2"
                      >
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Tamamla ve Gönder'}</span>
                        <Check className="w-5 h-5 text-[#B6D6CC]" />
                      </Button>
                    </form>
                  )}

                  {/* STEP 3 SUCCESS SCREEN (BUTTON MODE) */}
                  {currentStep === 3 && (
                    <div className="text-center py-6 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-[#B6D6CC]/40 text-[#191F61] flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 className="w-10 h-10 text-[#191F61]" />
                      </div>
                      <h4 className="font-extrabold text-2xl text-[#191F61]">
                        Talebiniz Başarıyla Alındı!
                      </h4>
                      <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-md mx-auto">
                        Tebrikler <span className="font-bold text-[#191F61]">{studentFullName || fullName}</span>! Bilgileriniz derece koçumuza başarıyla ulaştı. En kısa sürede sizinle iletişime geçeceğiz.
                      </p>
                      <Button
                        fullWidth
                        size="lg"
                        onClick={handleReset}
                        className="mt-2"
                      >
                        Tamamdır
                      </Button>
                    </div>
                  )}

                  {/* KVKK NOTICE */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                    <span>Bu formu doldurarak </span>
                    <Button
                      variant="link"
                      onClick={() => setIsKvkkOpen(true)}
                      className="inline"
                    >
                      KVKK Aydınlatma Metni
                    </Button>
                    <span> ve Gizlilik Politikasını onaylamış olursunuz.</span>
                  </div>
                </motion.div>
              </div>
            )}
      </AnimatePresence>

      {/* KVKK MODAL */}
      <KvkkModal isOpen={isKvkkOpen} onClose={() => setIsKvkkOpen(false)} />
    </>
  );
};
