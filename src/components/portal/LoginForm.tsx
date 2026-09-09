import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Button, buttonClasses } from '../ui/Button';
import { PhoneField } from '../ui/PhoneField';
import { PasswordField } from '../ui/PasswordField';
import { isValidTurkishMobilePhone } from '../../lib/phone';
import { useAuth } from '../../context/AuthContext';
import { ApiRequestError } from '../../lib/api';

/*
 * TELEFON İLE GİRİŞ
 * ---------------------------------------------------------------------------
 * Sunucuya /api/auth/login ile gidiyor; oturum jetonu httpOnly çerezde
 * dönüyor, bu bileşen jetonu hiç görmüyor.
 *
 * Sunucu "numara kayıtlı değil" ile "şifre yanlış" ayrımını BİLEREK yapmıyor
 * (ikisi de aynı mesaj): ayrıştırmak, saldırgana hangi numaraların kayıtlı
 * olduğunu tek tek sorgulatırdı. Burada da mesaj olduğu gibi gösteriliyor.
 */

type Errors = Partial<Record<'phone' | 'password' | 'form', string>>;

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  /* Honeypot: gerçek kullanıcı görmez, bot doldurur. PopUpForm'daki
     `website` alanının aynısı. */
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): Errors => {
    const next: Errors = {};
    if (!phone) {
      next.phone = 'Telefon numaranı gir.';
    } else if (!isValidTurkishMobilePhone(phone)) {
      next.phone = 'Numara 5 ile başlamalı ve 10 haneli olmalı.';
    }
    if (!password) next.password = 'Şifreni gir.';
    return next;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || website) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(phone, password, website);
      /* replace: geri tuşuyla giriş ekranına dönmek, oturum açıkken anlamsız. */
      navigate('/portal/panel', { replace: true });
    } catch (err) {
      setErrors({
        form:
          err instanceof ApiRequestError
            ? err.message
            : 'Giriş yapılamadı. Lütfen tekrar deneyin.',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-[#191F61]">
          Telefon ile giriş yap
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Kayıtlı telefon numaran ve şifrenle panele gir.
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

      <PhoneField
        value={phone}
        onChange={(next) => {
          setPhone(next);
          if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
        }}
        error={errors.phone}
        autoComplete="tel-national"
      />

      <PasswordField
        value={password}
        onChange={(next) => {
          setPassword(next);
          if (errors.password) {
            setErrors((prev) => ({ ...prev, password: undefined }));
          }
        }}
        error={errors.password}
        autoComplete="current-password"
        /*
          `link` varyantı bilerek KULLANILMADI: kalın + altı çizili hâli
          etiketin kendisiyle yarışıyor ve alanın en dikkat çeken parçası
          "şifremi unuttum" oluyordu. Buradaki iş sessiz bir kaçış yolu
          sunmak, çağrı yapmak değil.
        */
        labelAction={
          <Link
            to="/portal/sifremi-unuttum"
            className="rounded text-xs font-semibold text-slate-500 transition-colors hover:text-[#191F61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
          >
            Şifremi unuttum
          </Link>
        }
      />

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
        {isSubmitting ? 'Giriş yapılıyor...' : 'Giriş yap'}
      </Button>

      <div className="space-y-3 border-t border-slate-100 pt-5">
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Bağlantın SSL ile güvence altında.
        </p>

        <p className="text-center text-sm text-slate-600">
          Hesabın yok mu?{' '}
          <Link to="/portal/kayit" className={buttonClasses({ variant: 'link' })}>
            E-posta ile kayıt ol
          </Link>
        </p>
      </div>
    </form>
  );
};
