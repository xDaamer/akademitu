import React, { useState } from 'react';
import { UserPlus, KeyRound, Users } from 'lucide-react';
import { Button } from '../../ui/Button';
import { apiFetch, ApiRequestError } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Alan, Girdi, Secim, Kutu, Uyari, Bos, ROL_ETIKET, type Hesap } from './AdminUI';

/*
 * HESAPLAR — açma, düzenleme, şifre sıfırlama
 * ===========================================================================
 * Portalda kayıt ekranı yok ve olmayacak: hesapları yönetici açıyor. Bu sekme
 * eskiden Supabase Dashboard + elle SQL gerektiren iki adımlı işin yerini
 * alıyor (auth kullanıcısı + profiles satırı); sunucu ikisini tek istekte ve
 * geri alınabilir şekilde yapıyor (bkz. server/routes/admin.ts).
 *
 * HESAP SİLME YOK ve bu bilinçli: bir auth kullanıcısını silmek ders
 * geçmişini de etkileyen, geri dönüşü olmayan bir iş. Yanlış satıra basmanın
 * bedeli, panelde kazanılan rahatlıktan büyük. Erişimi kesmek gerekirse
 * Supabase Dashboard'dan yapılır.
 */

const BOS_FORM = {
  fullName: '',
  phone: '',
  username: '',
  password: '',
  userType: 'student' as Hesap['userType'],
};

export const AdminAccounts: React.FC<{
  hesaplar: Hesap[];
  yukleniyor: boolean;
  onDegisti: () => void;
}> = ({ hesaplar, yukleniyor, onDegisti }) => {
  const { user } = useAuth();
  const [form, setForm] = useState(BOS_FORM);
  const [mesgul, setMesgul] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);

  /* Düzenlenen satırın kimliği; null ise hiçbiri açık değil. */
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [duzenForm, setDuzenForm] = useState<Partial<Hesap>>({});
  const [sifreAcik, setSifreAcik] = useState<string | null>(null);
  const [yeniSifre, setYeniSifre] = useState('');

  async function hesapAc(e: React.FormEvent) {
    e.preventDefault();
    setMesgul(true);
    setHata(null);
    setBasari(null);
    try {
      /* Boş kullanıcı adı hiç GÖNDERİLMİYOR: sunucu boş string'i "biçim
         geçersiz" sayardı. Alan isteğe bağlı, yokluğu bir hata değil. */
      await apiFetch('/api/admin/hesaplar', {
        method: 'POST',
        body: { ...form, username: form.username.trim() || undefined },
      });
      /* Şifre ekranda TEKRAR GÖSTERİLMİYOR: yönetici onu zaten kendi yazdı.
         Kaydedilmiş bir şifreyi ekranda tutmak, panel açık unutulduğunda
         gereksiz bir sızıntı yüzeyi. */
      setBasari(`${form.fullName} için hesap açıldı. Şifreyi kişiye iletin.`);
      setForm(BOS_FORM);
      onDegisti();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Hesap açılamadı.');
    } finally {
      setMesgul(false);
    }
  }

  async function duzenKaydet(id: string) {
    setMesgul(true);
    setHata(null);
    setBasari(null);
    try {
      await apiFetch(`/api/admin/hesaplar/${id}`, { method: 'PATCH', body: duzenForm });
      setBasari('Hesap güncellendi.');
      setDuzenlenen(null);
      onDegisti();
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Hesap güncellenemedi.');
    } finally {
      setMesgul(false);
    }
  }

  async function sifreSifirla(id: string) {
    setMesgul(true);
    setHata(null);
    setBasari(null);
    try {
      await apiFetch(`/api/admin/hesaplar/${id}/sifre`, {
        method: 'POST',
        body: { password: yeniSifre },
      });
      setBasari('Şifre güncellendi. Yeni şifreyi kişiye iletin.');
      setSifreAcik(null);
      setYeniSifre('');
    } catch (err) {
      setHata(err instanceof ApiRequestError ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setMesgul(false);
    }
  }

  return (
    <div className="space-y-6">
      <Kutu baslik="Yeni hesap aç" ikon={<UserPlus className="h-5 w-5" />}>
        {hata && <Uyari tur="hata">{hata}</Uyari>}
        {basari && <Uyari tur="basari">{basari}</Uyari>}

        <form onSubmit={hesapAc} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Alan etiket="Ad soyad">
            <Girdi
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ayşe Yılmaz"
              required
            />
          </Alan>

          <Alan etiket="Telefon" ipucu="Giriş bu numarayla yapılır.">
            <Girdi
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="05321234567"
              inputMode="numeric"
              required
            />
          </Alan>

          {/*
            Kullanıcı adı İSTEĞE BAĞLI: telefon her hesapta var ve giriş için
            yeterli. Zorunlu tutmak, ihtiyacı olmayan herkese bir alan daha
            doldurtmak olurdu.
          */}
          <Alan
            etiket="Kullanıcı adı (isteğe bağlı)"
            ipucu="3-30 karakter · harf, rakam, . _ - · büyük harfler küçüğe çevrilir"
          >
            <Girdi
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ornek.kullanici"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </Alan>

          <Alan etiket="Şifre" ipucu="En az 8 karakter. Kişiye siz ileteceksiniz.">
            <Girdi
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="En az 8 karakter"
              required
            />
          </Alan>

          <Alan etiket="Hesap türü">
            <Secim
              value={form.userType}
              onChange={(e) => setForm({ ...form, userType: e.target.value as Hesap['userType'] })}
            >
              <option value="student">Öğrenci</option>
              <option value="teacher">Öğretmen</option>
              <option value="admin">Yönetici</option>
            </Secim>
          </Alan>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={mesgul}>
              {mesgul ? 'Açılıyor...' : 'Hesabı aç'}
            </Button>
          </div>
        </form>
      </Kutu>

      <Kutu
        baslik="Hesaplar"
        ikon={<Users className="h-5 w-5" />}
        sag={<span className="text-xs text-slate-400">{hesaplar.length} kayıt</span>}
      >
        {yukleniyor ? (
          <p className="py-8 text-center text-sm text-slate-500">Yükleniyor...</p>
        ) : hesaplar.length === 0 ? (
          <Bos>Henüz hesap yok.</Bos>
        ) : (
          <ul className="space-y-2">
            {hesaplar.map((h) => (
              <li key={h.id} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-sm font-bold text-[#191F61]">{h.fullName}</span>
                  <span className="text-sm text-slate-500">{h.phone}</span>
                  {h.username && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {h.username}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      h.userType === 'admin'
                        ? 'bg-[#c5a059]/20 text-[#7a5f2a]'
                        : h.userType === 'teacher'
                          ? 'bg-[#191F61]/10 text-[#191F61]'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {ROL_ETIKET[h.userType]}
                  </span>
                  {h.id === user?.id && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                      siz
                    </span>
                  )}

                  <div className="ml-auto flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSifreAcik(null);
                        setDuzenlenen(duzenlenen === h.id ? null : h.id);
                        setDuzenForm({
                          fullName: h.fullName,
                          phone: h.phone,
                          username: h.username,
                          userType: h.userType,
                        });
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDuzenlenen(null);
                        setSifreAcik(sifreAcik === h.id ? null : h.id);
                        setYeniSifre('');
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      <span className="hidden sm:inline">Şifre</span>
                    </Button>
                  </div>
                </div>

                {duzenlenen === h.id && (
                  <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Alan etiket="Ad soyad">
                      <Girdi
                        value={duzenForm.fullName ?? ''}
                        onChange={(e) => setDuzenForm({ ...duzenForm, fullName: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="Telefon">
                      <Girdi
                        value={duzenForm.phone ?? ''}
                        onChange={(e) => setDuzenForm({ ...duzenForm, phone: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="Kullanıcı adı" ipucu="Boş bırakılırsa kaldırılır.">
                      <Girdi
                        value={duzenForm.username ?? ''}
                        onChange={(e) => setDuzenForm({ ...duzenForm, username: e.target.value })}
                        placeholder="—"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </Alan>
                    <Alan etiket="Hesap türü">
                      <Secim
                        value={duzenForm.userType ?? 'student'}
                        onChange={(e) =>
                          setDuzenForm({ ...duzenForm, userType: e.target.value as Hesap['userType'] })
                        }
                      >
                        <option value="student">Öğrenci</option>
                        <option value="teacher">Öğretmen</option>
                        <option value="admin">Yönetici</option>
                      </Secim>
                    </Alan>
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                      <Button size="sm" onClick={() => duzenKaydet(h.id)} disabled={mesgul}>
                        {mesgul ? 'Kaydediliyor...' : 'Kaydet'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDuzenlenen(null)}>
                        Vazgeç
                      </Button>
                    </div>
                  </div>
                )}

                {sifreAcik === h.id && (
                  <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3">
                    <div className="min-w-[220px] flex-1">
                      <Alan etiket="Yeni şifre" ipucu="En az 8 karakter.">
                        <Girdi
                          type="text"
                          value={yeniSifre}
                          onChange={(e) => setYeniSifre(e.target.value)}
                          placeholder="Yeni şifre"
                        />
                      </Alan>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => sifreSifirla(h.id)}
                      disabled={mesgul || yeniSifre.length < 8}
                    >
                      {mesgul ? 'Kaydediliyor...' : 'Şifreyi değiştir'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSifreAcik(null)}>
                      Vazgeç
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Kutu>
    </div>
  );
};
