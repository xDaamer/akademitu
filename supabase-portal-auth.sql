-- =========================================================================
-- PORTAL KİMLİK DOĞRULAMA + ANON YETKİLERİNİN GERİ ALINMASI
-- =========================================================================
-- Supabase SQL Editor'de çalıştırın. Birden fazla kez çalıştırılabilir
-- (idempotent).
--
-- BAĞLAM
-- -------------------------------------------------------------------------
-- Frontend artık Supabase'e DOĞRUDAN gitmiyor; tüm trafik kendi Express
-- katmanımızdan (/api/*) geçiyor ve anahtarlar sunucuda .env'de duruyor.
-- Bu dosya o mimarinin veritabanı tarafını kuruyor:
--
--   1. profiles       — telefon <-> kullanıcı eşlemesi (giriş telefonla,
--                       kayıt e-postayla yapılıyor).
--   2. auth_attempts  — IP başına hız limiti sayacı.
--   3. anon rolünün leads/testimonials üzerindeki yetkilerinin GERİ ALINMASI.
--
-- 3. ADIM BU İŞİN ASIL GÜVENLİK KAZANCIDIR. Yapılmazsa anahtar "gizlenmiş"
-- olur ama yetki açık kalır — ve Supabase'in anon anahtarı zaten gizlenebilir
-- bir sır değildir (içinde yalnızca proje ve rol bilgisi olan imzalı bir JWT).
-- Kazanç anahtarın saklanmasından değil, anon'un artık HİÇBİR ŞEY
-- yapamamasından geliyor.
--
-- GERİ ALMA: bu dosya uygulandıktan sonra tarayıcıdan doğrudan erişim biter.
-- Eski davranışa dönmek gerekirse supabase-anon-lead-insert.sql yeniden
-- çalıştırılmalı VE istemci eski hâline döndürülmeli; ikisi bir arada gider.

-- =========================================================================
-- 1) profiles — telefon <-> kullanıcı eşlemesi
-- =========================================================================
-- Supabase Auth'un kendi `phone` alanı KULLANILMIYOR: onu kullanmak bir SMS
-- sağlayıcısı bağlamayı ve numara doğrulamayı gerektirirdi. Numara burada
-- tutuluyor, girişte sunucu telefonu e-postaya çeviriyor.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  -- UNIQUE: bir numara tek hesaba ait olmalı, aksi halde "telefonla giriş"
  -- hangi hesabı açacağını bilemez.
  phone TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Sunucu da doğruluyor; burada ikinci kez (derinlemesine savunma).
  CONSTRAINT profiles_phone_format CHECK (phone ~ '^05[0-9]{9}$')
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- anon'un profiles üzerinde HİÇBİR yetkisi yok: bu tabloya yalnızca sunucu
-- (servis rolü) ve giriş yapmış kullanıcı kendi satırı için erişir.
REVOKE ALL ON public.profiles FROM anon;

-- authenticated'a verilen yetki BİLİNÇLİ ve dar. Proxy, kullanıcı verisini
-- kullanıcının KENDİ JWT'siyle okuyor (bkz. server/supabase.ts userClient):
-- böylece route'daki olası bir yetkilendirme hatasında bile RLS emniyet ağı
-- devrede kalıyor. Servis rolüyle okusaydık bu ağ tamamen kalkardı.
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Kullanıcı adını değiştirebilir; telefonunu ve id'sini DEĞİŞTİREMEZ.
-- Telefon giriş kimliği olduğu için değişimi sunucudan, doğrulamayla yapılmalı.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND phone = (SELECT p.phone FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_profiles_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.touch_profiles_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_profiles_updated_at();

-- =========================================================================
-- 2) auth_attempts — IP başına hız limiti
-- =========================================================================
-- Neden veritabanında: server.ts'teki mevcut sınırlayıcı bellek içi bir Map
-- ve Vercel'de işe yaramıyor — her serverless örneği kendi belleğine sahip,
-- saldırgan yeni bir örneğe düştüğü an sayaç sıfırlanıyor. Şifre denemesi
-- için bu kabul edilemez.

CREATE TABLE IF NOT EXISTS public.auth_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('login', 'signup')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_attempts_lookup
  ON public.auth_attempts (ip, kind, created_at DESC);

ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Hiçbir role yetki verilmiyor: yalnızca servis rolü (RLS'i baypas eder)
-- yazıp okuyor. Bu tablo IP adresi tuttuğu için kimseye açılmamalı.
REVOKE ALL ON public.auth_attempts FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.auth_attempts_id_seq FROM anon, authenticated;

-- Tablo sınırsız büyümesin: sayacın 24 saatten eski satıra ihtiyacı yok.
-- pg_cron kurulu değilse bu blok sessizce atlanır ve temizlik elle yapılır
-- (aşağıdaki DELETE'i ara sıra çalıştırmak yeterli).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'auth-attempts-temizlik',
      '0 * * * *',
      $cron$DELETE FROM public.auth_attempts WHERE created_at < now() - interval '24 hours'$cron$
    );
  END IF;
END $$;

-- Elle temizlik:
-- DELETE FROM public.auth_attempts WHERE created_at < now() - interval '24 hours';

-- =========================================================================
-- 3) anon yetkilerinin geri alınması — İŞİN ASIL AMACI
-- =========================================================================
-- Bunlar supabase-anon-lead-insert.sql'in verdiği yetkiler. Frontend artık
-- Supabase'e hiç gitmediği için gereksizler.

-- leads: anon'un INSERT'i ve politikası kalkıyor.
DROP POLICY IF EXISTS "anon_insert_leads" ON public.leads;
DROP POLICY IF EXISTS "anon_update_leads" ON public.leads;
REVOKE ALL ON public.leads FROM anon, authenticated;

-- testimonials: anon'un SELECT'i ve politikası kalkıyor.
-- Yorumlar artık /api/testimonials üzerinden, sunucudan okunuyor.
DROP POLICY IF EXISTS "anon_select_published_testimonials" ON public.testimonials;
REVOKE ALL ON public.testimonials FROM anon, authenticated;

-- update_lead_step2 artık YALNIZCA sunucudan çağrılıyor (servis rolü, EXECUTE
-- yetkisinden bağımsız çalışır). anon'un çalıştırma yetkisi kalkıyor: aksi
-- halde bilinen bir telefon numarasının kaydı dışarıdan üzerine yazılabilirdi.
REVOKE EXECUTE ON FUNCTION public.update_lead_step2(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

-- İleride eklenecek tablolar da kazara açılmasın.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;

-- =========================================================================
-- DOĞRULAMA (yukarıdaki bloktan sonra çalıştırın)
-- =========================================================================
-- select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee in ('anon','authenticated')
--   order by table_name, grantee, privilege_type;
-- -> anon: HİÇBİR SATIR OLMAMALI.
-- -> authenticated: yalnızca profiles üzerinde SELECT ve UPDATE.
