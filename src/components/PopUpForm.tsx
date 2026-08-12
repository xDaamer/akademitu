import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Phone, User, ArrowRight, ShieldCheck, Check, Gift, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LeadFormData } from '../types';
import { saveLeadStep1, updateLeadStep2 } from '../lib/supabase';
import { KvkkModal } from './KvkkModal';
import logoWhite from '../assets/logo-white.png';

interface PopUpFormProps {
  isOpen: boolean;
  mode: 'scroll' | 'button' | null;
  onClose: () => void;
  onSubmitSuccess?: (data: LeadFormData) => void;
}

const MIDDLE_SCHOOL_GRADES = ['5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf'];
const HIGH_SCHOOL_GRADES = ['9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf', 'Mezun'];

const MIDDLE_SCHOOL_SUBJECTS = [
  'Matematik',
  'Türkçe',
  'Fen Bilimleri',
  'T.C. İnkılap Tarihi',
  'İngilizce',
  'Din Kültürü',
];

const HIGH_SCHOOL_TYT_SUBJECTS = [
  'TYT Matematik',
  'TYT Geometri',
  'TYT Türkçe',
  'TYT Fizik',
  'TYT Kimya',
  'TYT Biyoloji',
  'TYT Tarih',
  'TYT Coğrafya',
];

const HIGH_SCHOOL_AYT_SUBJECTS = [
  'AYT Matematik',
  'AYT Geometri',
  'AYT Türk Dili ve Edebiyatı',
  'AYT Fizik',
  'AYT Kimya',
  'AYT Biyoloji',
  'AYT Tarih',
  'AYT Coğrafya',
];

export const PopUpForm: React.FC<PopUpFormProps> = ({
  isOpen,
  mode,
  onClose,
  onSubmitSuccess,
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

  // Step Management: 1 = Initial Lead, 2 = Detailed Student Form, 3 = Final Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [leadId, setLeadId] = useState<string | undefined>(undefined);
  const [isKvkkOpen, setIsKvkkOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1 Data
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [examType, setExamType] = useState<'YKS' | 'LGS' | 'Diğer'>('YKS');

  // Step 2 Data
  const [studentFullName, setStudentFullName] = useState('');
  const [parentFullName, setParentFullName] = useState('');
  const [userRole, setUserRole] = useState<'Veli' | 'Öğrenci'>('Öğrenci');
  const [gradeClass, setGradeClass] = useState<string>('12. Sınıf');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [error, setError] = useState('');

  if (!isOpen || !mode) return null;

  const isMiddleSchool = MIDDLE_SCHOOL_GRADES.includes(gradeClass);

  // Step 1 Submit: Immediately pushes phone & name to Supabase
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Lütfen Ad ve Soyadınızı giriniz.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await saveLeadStep1({ fullName, phone, examType });
      if (res.id) {
        setLeadId(res.id);
      }
      setStudentFullName(fullName);
      setCurrentStep(2);
    } catch (err) {
      console.error('Step 1 Error:', err);
      // Fallback transition
      setStudentFullName(fullName);
      setCurrentStep(2);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 Submit: Updates Supabase with full detailed survey info
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentFullName.trim()) {
      setError('Lütfen Öğrenci Ad ve Soyadını giriniz.');
      return;
    }
    if (!phone.trim()) {
      setError('Lütfen İletişim Telefon Numarasını giriniz.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      await updateLeadStep2({
        leadId,
        phone,
        studentFullName,
        parentFullName,
        userRole,
        gradeClass,
        selectedSubjects,
      });

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
      setCurrentStep(3);
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
    setStudentFullName('');
    setParentFullName('');
    setUserRole('Öğrenci');
    setGradeClass('12. Sınıf');
    setSelectedSubjects([]);
    setError('');
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* MODE 1: KAYDIRINCA ÇIKAN FORM (MOBİLDE AŞAĞIDAN YUKARI %60 EKRAN KAPLAYAN BOTTOM SHEET, DESKTOP'TA SAĞ ÇEKMECE) */}
            {mode === 'scroll' && (
              <div className={`fixed inset-0 z-50 overflow-hidden flex ${isMobile ? 'flex-col justify-end' : 'justify-end'}`}>
                {/* ARKA PLAN KARARTMA PERDESİ */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={onClose}
                  className="fixed inset-0 bg-slate-950/30 backdrop-blur-xs z-0"
                />

                {/* ÇEKMECE / BOTTOM SHEET */}
                <motion.div
                  initial={isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 }}
                  animate={isMobile ? { y: 0, opacity: 1 } : { x: 0, opacity: 1 }}
                  exit={isMobile ? { y: '100%', opacity: 0 } : { x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 220 }}
                  className={`relative z-10 w-full bg-white text-slate-800 shadow-2xl flex flex-col justify-between overflow-y-auto ${
                    isMobile
                      ? 'h-[60vh] rounded-t-3xl border-t border-slate-200 p-5'
                      : 'md:w-1/2 h-full border-l border-slate-200 p-6 sm:p-10 md:p-12'
                  }`}
                >
                  <div>
                    {/* MOBİL DOKUNMA/ÇEKME HALKASI (TUTAMAÇ) */}
                    {isMobile && (
                      <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />
                    )}

                    {/* ÜST DÜĞMELER */}
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <div className="flex items-center gap-3">
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
                      <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                        aria-label="Kapat"
                      >
                        <X className="w-6 h-6" />
                      </button>
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
                              placeholder="05XX XXX XX XX"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Hedef Sınavınız
                          </label>
                          <div className="flex gap-2">
                            {['YKS', 'LGS', 'Diğer'].map((exam) => (
                              <button
                                key={exam}
                                type="button"
                                onClick={() => setExamType(exam as any)}
                                className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  examType === exam
                                    ? 'bg-[#191F61] text-white border-[#191F61]'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {exam}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-[#191F61] hover:bg-[#101442] text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                        >
                          <span>{isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}</span>
                          <ArrowRight className="w-4 h-4 text-[#B6D6CC]" />
                        </button>
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

                        {/* ÖĞRENCİ VE VELİ BİLGİSİ */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Öğrenci Adı ve Soyadı *
                            </label>
                            <input
                              type="text"
                              value={studentFullName}
                              onChange={(e) => setStudentFullName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Veli Adı ve Soyadı
                            </label>
                            <input
                              type="text"
                              placeholder="Veli adı soyadı"
                              value={parentFullName}
                              onChange={(e) => setParentFullName(e.target.value)}
                              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                            />
                            <p className="text-[10px] text-slate-500 italic">
                              Öğrenciyseniz burayı doldurmanıza gerek yoktur.
                            </p>
                          </div>
                        </div>

                        {/* VELİ MİSİNİZ ÖĞRENCİ MİSİNİZ */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Veli misiniz öğrenci misiniz? *
                          </label>
                          <div className="flex gap-2">
                            {(['Öğrenci', 'Veli'] as const).map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setUserRole(role)}
                                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                  userRole === role
                                    ? 'bg-[#191F61] text-white border-[#191F61]'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* TELEFON */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Telefon *
                          </label>
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                            required
                          />
                          <p className="text-[10px] text-slate-500 italic">
                            Veliyseniz lütfen kendi telefon numaranızı giriniz.
                          </p>
                        </div>

                        {/* HANGİ SINIFA GİDİYOR */}
                        <div className="space-y-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Öğrencimiz hangi sınıfa gidiyor? *
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {[...MIDDLE_SCHOOL_GRADES, ...HIGH_SCHOOL_GRADES].map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGradeClass(g)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                  gradeClass === g
                                    ? 'bg-[#191F61] text-white border-[#191F61]'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {g}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* HANGİ DERSLERDEN ÖZEL DERS ALMAK İSTİYORSUNUZ */}
                        <div className="space-y-2 pt-1">
                          <label className="block text-xs font-semibold text-slate-700">
                            Hangi derslerden özel ders almak istiyorsunuz?
                          </label>

                          {isMiddleSchool ? (
                            <div className="flex flex-wrap gap-1.5">
                              {MIDDLE_SCHOOL_SUBJECTS.map((subj) => {
                                const selected = selectedSubjects.includes(subj);
                                return (
                                  <button
                                    key={subj}
                                    type="button"
                                    onClick={() => toggleSubject(subj)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                      selected
                                        ? 'bg-[#191F61] text-white border-[#191F61]'
                                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                    <span>{subj}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                              <div>
                                <span className="text-[10px] font-bold text-[#191F61] uppercase">TYT Dersleri</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {HIGH_SCHOOL_TYT_SUBJECTS.map((subj) => {
                                    const selected = selectedSubjects.includes(subj);
                                    return (
                                      <button
                                        key={subj}
                                        type="button"
                                        onClick={() => toggleSubject(subj)}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                                          selected
                                            ? 'bg-[#191F61] text-white border-[#191F61]'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                        <span>{subj}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="pt-1">
                                <span className="text-[10px] font-bold text-[#191F61] uppercase">AYT Dersleri</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {HIGH_SCHOOL_AYT_SUBJECTS.map((subj) => {
                                    const selected = selectedSubjects.includes(subj);
                                    return (
                                      <button
                                        key={subj}
                                        type="button"
                                        onClick={() => toggleSubject(subj)}
                                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                                          selected
                                            ? 'bg-[#191F61] text-white border-[#191F61]'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                        <span>{subj}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full bg-[#191F61] hover:bg-[#101442] text-white py-3.5 rounded-2xl font-extrabold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
                        >
                          <span>{isSubmitting ? 'Kaydediliyor...' : 'Tamamla ve Gönder'}</span>
                          <Check className="w-4 h-4 text-[#B6D6CC]" />
                        </button>
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
                        <button
                          onClick={handleReset}
                          className="w-full bg-[#191F61] hover:bg-[#101442] text-white font-bold py-3 rounded-xl transition-all shadow-md cursor-pointer"
                        >
                          Tamamdır
                        </button>
                      </div>
                    )}
                  </div>

                  {/* KVKK BİLGİLENDİRME YAZISI */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
                    <span>Bu formu doldurarak </span>
                    <button
                      type="button"
                      onClick={() => setIsKvkkOpen(true)}
                      className="text-[#191F61] font-bold underline hover:text-[#101442] cursor-pointer inline-block"
                    >
                      KVKK Aydınlatma Metni
                    </button>
                    <span> ve Gizlilik Politikasını onaylamış olursunuz.</span>
                  </div>
                </motion.div>
              </div>
            )}

            {/* MODE 2: BUTTON CLICK MODAL */}
            {mode === 'button' && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
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
                    <div className="flex items-center gap-3">
                      <img
                        src={logoWhite}
                        alt="akademITU Logo"
                        className="h-12 w-auto object-contain"
                      />
                      <div>
                        <h3 className="text-xl font-extrabold text-[#191F61] tracking-tight">
                          {currentStep === 1 && 'Ücretsiz Deneme Dersi'}
                          {currentStep === 2 && 'Öğrenci & Ders Detayları'}
                          {currentStep === 3 && 'Talebiniz Alındı!'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {currentStep === 1 ? 'Adım 1/2' : currentStep === 2 ? 'Adım 2/2' : 'İşlem Tamamlandı'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
                      aria-label="Kapat"
                    >
                      <X className="w-5 h-5" />
                    </button>
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
                            placeholder="05XX XXX XX XX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#191F61] transition-all"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Hedef Sınavınız
                        </label>
                        <div className="flex gap-2">
                          {['YKS', 'LGS', 'Diğer'].map((exam) => (
                            <button
                              key={exam}
                              type="button"
                              onClick={() => setExamType(exam as any)}
                              className={`flex-1 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                examType === exam
                                  ? 'bg-[#191F61] text-white border-[#191F61]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {exam}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#191F61] hover:bg-[#101442] text-white py-4 rounded-2xl font-extrabold text-base shadow-xl hover:shadow-2xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Devam Et'}</span>
                        <ArrowRight className="w-5 h-5 text-[#B6D6CC]" />
                      </button>
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Öğrenci Adı ve Soyadı *
                          </label>
                          <input
                            type="text"
                            value={studentFullName}
                            onChange={(e) => setStudentFullName(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                            required
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-slate-700">
                            Veli Adı ve Soyadı
                          </label>
                          <input
                            type="text"
                            placeholder="Veli adı soyadı"
                            value={parentFullName}
                            onChange={(e) => setParentFullName(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                          />
                          <p className="text-[10px] text-slate-500 italic">
                            Öğrenciyseniz burayı doldurmanıza gerek yoktur.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Veli misiniz öğrenci misiniz? *
                        </label>
                        <div className="flex gap-2">
                          {(['Öğrenci', 'Veli'] as const).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => setUserRole(role)}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                userRole === role
                                  ? 'bg-[#191F61] text-white border-[#191F61]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {role}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Telefon *
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#191F61]"
                          required
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          Veliyseniz lütfen kendi telefon numaranızı giriniz.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Öğrencimiz hangi sınıfa gidiyor? *
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {[...MIDDLE_SCHOOL_GRADES, ...HIGH_SCHOOL_GRADES].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setGradeClass(g)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                                gradeClass === g
                                  ? 'bg-[#191F61] text-white border-[#191F61]'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Hangi derslerden özel ders almak istiyorsunuz?
                        </label>

                        {isMiddleSchool ? (
                          <div className="flex flex-wrap gap-1.5">
                            {MIDDLE_SCHOOL_SUBJECTS.map((subj) => {
                              const selected = selectedSubjects.includes(subj);
                              return (
                                <button
                                  key={subj}
                                  type="button"
                                  onClick={() => toggleSubject(subj)}
                                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                    selected
                                      ? 'bg-[#191F61] text-white border-[#191F61]'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                  <span>{subj}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                            <div>
                              <span className="text-[10px] font-bold text-[#191F61] uppercase">TYT Dersleri</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {HIGH_SCHOOL_TYT_SUBJECTS.map((subj) => {
                                  const selected = selectedSubjects.includes(subj);
                                  return (
                                    <button
                                      key={subj}
                                      type="button"
                                      onClick={() => toggleSubject(subj)}
                                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                                        selected
                                          ? 'bg-[#191F61] text-white border-[#191F61]'
                                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                      <span>{subj}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="pt-1">
                              <span className="text-[10px] font-bold text-[#191F61] uppercase">AYT Dersleri</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {HIGH_SCHOOL_AYT_SUBJECTS.map((subj) => {
                                  const selected = selectedSubjects.includes(subj);
                                  return (
                                    <button
                                      key={subj}
                                      type="button"
                                      onClick={() => toggleSubject(subj)}
                                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                                        selected
                                          ? 'bg-[#191F61] text-white border-[#191F61]'
                                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {selected && <Check className="w-3 h-3 text-[#B6D6CC]" />}
                                      <span>{subj}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-[#191F61] hover:bg-[#101442] text-white py-4 rounded-2xl font-extrabold text-base shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                      >
                        <span>{isSubmitting ? 'Kaydediliyor...' : 'Tamamla ve Gönder'}</span>
                        <Check className="w-5 h-5 text-[#B6D6CC]" />
                      </button>
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
                      <button
                        onClick={handleReset}
                        className="mt-2 w-full bg-[#191F61] text-white py-3.5 rounded-2xl font-bold text-base hover:bg-[#101442] transition-colors shadow-lg cursor-pointer"
                      >
                        Tamamdır
                      </button>
                    </div>
                  )}

                  {/* KVKK NOTICE */}
                  <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
                    <span>Bu formu doldurarak </span>
                    <button
                      type="button"
                      onClick={() => setIsKvkkOpen(true)}
                      className="text-[#191F61] font-bold underline hover:text-[#101442] cursor-pointer inline-block"
                    >
                      KVKK Aydınlatma Metni
                    </button>
                    <span> ve Gizlilik Politikasını onaylamış olursunuz.</span>
                  </div>
                </motion.div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* KVKK MODAL */}
      <KvkkModal isOpen={isKvkkOpen} onClose={() => setIsKvkkOpen(false)} />
    </>
  );
};
