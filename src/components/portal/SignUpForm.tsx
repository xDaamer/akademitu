import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail } from 'lucide-react';
import { Button, buttonClasses } from '../ui/Button';
import { Field, FIELD_ICON_CLASSES } from '../ui/Field';
import { PhoneField } from '../ui/PhoneField';
import { PasswordField } from '../ui/PasswordField';
import { KvkkModal } from '../KvkkModal';
import { isValidTurkishMobilePhone } from '../../lib/phone';

/*
 * E-POSTA İLE KAYIT
 * ---------------------------------------------------------------------------
 * Kayıt e-postayla, giriş telefonla: kişi hesabını e-postasıyla açar, her gün
 * gireceği ekranda ise ezberinde olan numarasını yazar. İki alanı da burada
 * topluyoruz ki Faz 2'de telefon -> kullanıcı eşlemesi kurulabilsin.
 *
 * FAZ 1: gerçek kayıt YOK — onSubmit doğrulamayı ve durumları çalıştırır.
 */

type Errors = Partial<
  Record<
    'fullName' | 'email' | 'phone' | 'password' | 'passwordRepeat' | 'consent' | 'form',
    string
  >
>;

/* Tarayıcının type="email" doğrulaması "a@b" gibi girdileri geçirir; bu kalıp
   en azından bir noktalı alan adı arar. Kesin e-posta doğrulaması istemcide
   yapılamaz, gerçek kontrol Faz 2'de doğrulama postasıyla olacak. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const SignUpForm: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [kvkkOpen, setKvkkOpen] = useState(false);

  const clearError = (key: keyof Errors) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): Errors => {
    const next: Errors = {};

    if (!fullName.trim()) next.fullName = 'Ad soyadını gir.';

    if (!email.trim()) {
      next.email = 'E-posta adresini gir.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      next.email = 'Geçerli bir e-posta adresi gir.';
    }

    if (!phone) {
      next.phone = 'Telefon numaranı gir.';
    } else if (!isValidTurkishMobilePhone(phone)) {
      next.phone = 'Numara 5 ile başlamalı ve 10 haneli olmalı.';
    }

    if (!password) {
      next.password = 'Bir şifre belirle.';
    } else if (password.length < 8) {
      next.password = 'Şifre en az 8 karakter olmalı.';
    }

    if (passwordRepeat !== password) {
      next.passwordRepeat = 'Şifreler aynı değil.';
    }

    if (!consent) next.consent = 'Devam etmek için onay ver.';

    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || website) return;

    setIsSubmitting(true);
    // TODO (Faz 2): AuthContext.signUp(...) — /api/auth/signup.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setIsSubmitting(false);
    setErrors({
      form: 'Kayıt henüz açılmadı. Panel yayına alındığında bu ekran çalışacak.',
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#191F61]">
            E-posta ile kayıt ol
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Hesabını aç, panele telefon numaranla gir.
          </p>
        </div>

        {errors.form && (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
          >
            {errors.form}
          </p>
        )}

        <Field
          label="Ad soyad"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            clearError('fullName');
          }}
          error={errors.fullName}
          placeholder="Ayşe Yılmaz"
          autoComplete="name"
          icon={<User className={FIELD_ICON_CLASSES} aria-hidden="true" />}
        />

        <Field
          label="E-posta"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearError('email');
          }}
          error={errors.email}
          placeholder="ayse@ornek.com"
          autoComplete="email"
          icon={<Mail className={FIELD_ICON_CLASSES} aria-hidden="true" />}
        />

        <PhoneField
          value={phone}
          onChange={(next) => {
            setPhone(next);
            clearError('phone');
          }}
          error={errors.phone}
          autoComplete="tel-national"
        />

        <PasswordField
          value={password}
          onChange={(next) => {
            setPassword(next);
            clearError('password');
          }}
          error={errors.password}
          autoComplete="new-password"
          showStrength
        />

        <PasswordField
          label="Şifre tekrar"
          value={passwordRepeat}
          onChange={(next) => {
            setPasswordRepeat(next);
            clearError('passwordRepeat');
          }}
          error={errors.passwordRepeat}
          autoComplete="new-password"
        />

        <div className="space-y-1.5">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                clearError('consent');
              }}
              aria-invalid={errors.consent ? true : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-[#191F61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
            />
            <span>
              <Button
                variant="link"
                className="inline"
                onClick={() => setKvkkOpen(true)}
              >
                KVKK Aydınlatma Metni
              </Button>{' '}
              kapsamında kişisel verilerimin işlenmesini kabul ediyorum.
            </span>
          </label>

          {errors.consent && (
            <p className="text-xs font-semibold text-rose-700">{errors.consent}</p>
          )}
        </div>

        {/* Honeypot — ekran dışında, ekran okuyuculardan gizli. */}
        <div className="absolute -left-[10000px]" aria-hidden="true">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </div>

        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>
          {isSubmitting ? 'Hesap açılıyor...' : 'Hesap oluştur'}
        </Button>

        <p className="border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Zaten hesabın var mı?{' '}
          <Link to="/portal" className={buttonClasses({ variant: 'link' })}>
            Telefon ile giriş yap
          </Link>
        </p>
      </form>

      <KvkkModal isOpen={kvkkOpen} onClose={() => setKvkkOpen(false)} />
    </>
  );
};
