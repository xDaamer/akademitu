import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import need from '../../../need.json';
import { panelHrefForRole, isCrossHost } from '../../lib/host';
import { ShieldCheck, User } from 'lucide-react';
import { Button, buttonClasses } from '../ui/Button';
import { PhoneField } from '../ui/PhoneField';
import { Field, FIELD_ICON_CLASSES } from '../ui/Field';
import { PasswordField } from '../ui/PasswordField';
import { isValidTurkishMobilePhone } from '../../lib/phone';
import { useAuth } from '../../context/AuthContext';
import { ApiRequestError } from '../../lib/api';

/*
 * GİRİŞ — TELEFON (VARSAYILAN) YA DA KULLANICI ADI
 * ---------------------------------------------------------------------------
 * Sunucuya /api/auth/login ile gidiyor; oturum jetonu httpOnly çerezde
 * dönüyor, bu bileşen jetonu hiç görmüyor.
 *
 * TELEFON VARSAYILAN: hesapların tamamının telefonu var, kullanıcı adı ise
 * isteğe bağlı (profiles.username NULL olabilir). Varsayılanı kullanıcı adı
 * yapmak, çoğu kişiye sahip olmadığı bir alanı gösterirdi.
 *
 * E-POSTA HİÇ SORULMUYOR. auth.users'ta bir e-posta alanı var — Supabase Auth
 * ona dayanıyor — ama o telefondan türetilen bir iç kimlik; kullanıcı onu ne
 * görür ne yazar. Kullanıcı adında '@' de bu yüzden yasak: e-postaya benzeyen
 * bir alan "hangisini yazacağım" sorusunu doğururdu.
 *
 * Sunucu "kimlik kayıtlı değil" ile "şifre yanlış" ayrımını BİLEREK yapmıyor
 * (ikisi de aynı mesaj): ayrıştırmak, saldırgana hangi numaraların/adların
 * kayıtlı olduğunu tek tek sorgulatırdı. Burada da mesaj olduğu gibi
 * gösteriliyor.
 */

type GirisModu = 'telefon' | 'kullaniciAdi';

type Errors = Partial<Record<'phone' | 'username' | 'password' | 'form', string>>;

export const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mod, setMod] = useState<GirisModu>('telefon');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  /* Honeypot: gerçek kullanıcı görmez, bot doldurur. PopUpForm'daki
     `website` alanının aynısı. */
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* Yalnızca AÇIK OLAN alan doğrulanıyor: kapalı moddaki alan formda hiç
     yok, dolayısıyla boş olması bir hata değil. */
  const validate = (): Errors => {
    const next: Errors = {};

    if (mod === 'telefon') {
      if (!phone) {
        next.phone = 'Telefon numaranı gir.';
      } else if (!isValidTurkishMobilePhone(phone)) {
        next.phone = 'Numara 5 ile başlamalı ve 10 haneli olmalı.';
      }
    } else {
      const temiz = username.trim().toLowerCase();
      if (!temiz) {
        next.username = 'Kullanıcı adını gir.';
      } else if (!/^[a-z0-9._-]{3,30}$/.test(temiz)) {
        /* Sunucu ve veritabanı da aynı kalıbı uyguluyor; buradaki kontrol
           kullanıcıyı boşuna sunucuya göndermemek için. */
        next.username = '3-30 karakter; harf, rakam, nokta, alt çizgi ve tire.';
      }
    }

    if (!password) next.password = 'Şifreni gir.';
    return next;
  };

  /* Mod değişince o anki hatalar anlamsızlaşıyor (başka bir alana aitler) ve
     yazılmış değer de taşınmıyor — iki kimlik birbirinin yerine geçmez. */
  const modDegistir = () => {
    setMod((onceki) => (onceki === 'telefon' ? 'kullaniciAdi' : 'telefon'));
    setPhone('');
    setUsername('');
    setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0 || website) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const girenKullanici = await login(
        mod === 'telefon' ? { phone } : { username: username.trim().toLowerCase() },
        password,
        website,
      );

      /*
       * Panel BAŞKA BİR HOST'TA: portal.akademitu.com. react-router oraya
       * gidemez, tam sayfa yüklemesi gerekiyor.
       *
       * Oturumun yeni host'ta da tanınmasını sağlayan şey çerezin
       * Domain=.akademitu.com ile yazılmış olması (bkz. server/cookies.ts) —
       * jeton URL'de TAŞINMAZ. Kılavuzun "handoff token" yöntemine gerek yok,
       * çünkü iki host aynı kayıtlı alan adı ve aynı sunucu altında.
       *
       * replace: geri tuşuyla giriş ekranına dönmek, oturum açıkken anlamsız.
       *
       * HEDEF ROLE GÖRE değişiyor: öğrenci paneli panel host'unun kökünde,
       * öğretmen paneli onun altındaki /ogretmen yolunda (bkz. lib/host.ts).
       * Rol sunucudan, giriş yanıtının içinde geliyor — burada bir tahmin
       * yapılmıyor.
       */
      const target = panelHrefForRole(girenKullanici.userType);

      /*
       * Rolü olmayan (profil satırı silinmiş) ya da henüz paneli olmayan
       * ('admin') bir hesap hiçbir yere yönlendirilmiyor. Sessizce öğrenci
       * paneline atmak, oraya ait olmayan birini oraya sokmak olurdu; kişi
       * boş bir ekranla baş başa kalırdı ve sebebini göremezdi.
       */
      if (!target) {
        setErrors({
          form: 'Hesabınız için henüz bir panel tanımlı değil. Lütfen bizimle iletişime geçin.',
        });
        setIsSubmitting(false);
        return;
      }

      if (isCrossHost(target)) {
        window.location.replace(target);
      } else {
        navigate(target, { replace: true });
      }
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
          {mod === 'telefon' ? 'Telefon ile giriş yap' : 'Kullanıcı adı ile giriş yap'}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">
          {mod === 'telefon'
            ? 'Kayıtlı telefon numaran ve şifrenle panele gir.'
            : 'Kullanıcı adın ve şifrenle panele gir.'}
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

      {mod === 'telefon' ? (
        <PhoneField
          value={phone}
          onChange={(next) => {
            setPhone(next);
            if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
          }}
          error={errors.phone}
          autoComplete="tel-national"
        />
      ) : (
        <Field
          label="Kullanıcı adı"
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
          }}
          error={errors.username}
          hint="Harf, rakam, nokta, alt çizgi ve tire · 3-30 karakter"
          placeholder="kullanici.adi"
          /* autoCapitalize/spellCheck kapalı: mobil klavye ilk harfi büyütüp
             kullanıcı adını bozardı. Sunucu zaten küçültüyor ama kişi yazdığı
             şeyin değiştiğini görmemeli. */
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          icon={<User className={FIELD_ICON_CLASSES} aria-hidden="true" />}
        />
      )}

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

          Hedef /portal/sifremi-unuttum İDİ ve o sayfa hiç yazılmadı — bağlantı
          404'e gidiyordu. Hesaplar elle yönetildiğine göre şifre sıfırlama da
          elle yapılacak, o yüzden doğru hedef iletişim kanalı.
        */
        labelAction={
          <a
            href={need.contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded text-xs font-semibold text-slate-500 transition-colors hover:text-[#191F61] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5a059] focus-visible:ring-offset-2"
          >
            Şifremi unuttum
          </a>
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

      {/*
        Kayıt bağlantısı YOK: hesaplar elle açılıyor. Yerine ne yapılacağını
        söyleyen bir satır konuldu — kapalı bir kapının önünde kullanıcıyı
        açıklamasız bırakmak, olmayan bir düğmeyi aramasına yol açar.
      */}
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
          Bağlantın SSL ile güvence altında.
        </p>

        <p className="text-center text-sm text-slate-600">
          Hesabın yok mu?{' '}
          <a
            href={need.contact.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'link' })}
          >
            Bize ulaş
          </a>
        </p>

        {/*
          GİRİŞ YOLUNU DEĞİŞTİRME. <button type="button"> — form içinde
          type verilmezse tarayıcı onu "submit" sayar ve bağlantıya basmak
          formu gönderirdi.

          Yazı, gidilecek yeri söylüyor (bulunulan yeri değil): telefon
          modundayken "Kullanıcı adı ile giriş yap" yazıyor. Tersi olsaydı
          kişi hangi moddayken hangisine basacağını her seferinde çözmek
          zorunda kalırdı.
        */}
        <p className="text-center text-sm text-slate-600">
          <button
            type="button"
            onClick={modDegistir}
            className={buttonClasses({ variant: 'link' })}
          >
            {mod === 'telefon'
              ? 'Kullanıcı adı ile giriş yap'
              : 'Telefon ile giriş yap'}
          </button>
        </p>
      </div>
    </form>
  );
};
