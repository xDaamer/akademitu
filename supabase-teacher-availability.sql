-- =============================================================================
-- ÖĞRETMEN MÜSAİTLİĞİ + DENEME DERSİ — eklendi 2026-10-09
-- =============================================================================
-- HENÜZ UYGULANMADI. Supabase SQL Editor'de bir kez çalıştırın; tamamı
-- idempotent (IF NOT EXISTS / OR REPLACE), tekrar çalıştırmak zararsız.
-- Kod bu dosyaya bağımlı: uygulanmadan push edilirse öğretmen hesabı açma
-- ve ders atama 502 döner.
--
-- BU DOSYA NE YAPIYOR:
--   1. teacher_availability   — öğretmenin HAFTALIK müsait saat aralıkları
--   2. set_teacher_availability — bir öğretmenin aralıklarını TEK işlemde
--                                 değiştiren RPC
--   3. lessons.is_trial       — deneme dersi bayrağı (25 dk / normal 50 dk)
--
-- ---------------------------------------------------------------------------
-- NEDEN profiles'ta bir JSONB kolonu DEĞİL
-- ---------------------------------------------------------------------------
-- authenticated'ın profiles üzerinde TABLO seviyesinde UPDATE yetkisi var ve
-- profiles_update_own yalnızca phone ile user_type'ı sabitliyor. Oraya bir
-- kolon eklemek, öğretmenin kendi müsaitliğini PostgREST'ten doğrudan
-- yazabilmesi demekti. Ayrı tablo + yetki yok = yalnızca servis rolü yazar.
--
-- ---------------------------------------------------------------------------
-- SAATLER NASIL TUTULUYOR
-- ---------------------------------------------------------------------------
-- weekday: ISO, 1 = Pazartesi ... 7 = Pazar (sitedeki hafta pazartesi başlıyor).
-- start_minute / end_minute: gece yarısından itibaren DAKİKA, Türkiye saatiyle.
--   `time` yerine dakika: aralık kontrolü düz tamsayı karşılaştırması oluyor
--   ve gün sonu 1440 olarak yazılabiliyor (24:00).
-- Sınırlar 30 dakikanın katı: dersler saat başı ve buçukta başlıyor, müsaitlik
-- de aynı ızgarada. Bitiş dışlayıcı: 09:00-12:00 aralığında 50 dk'lık son
-- ders 11:00'de başlar (11:00+50 = 11:50 <= 12:00), 11:30'da başlayamaz.
--
-- Bir güne birden çok aralık girilebilir (09:00-12:00 ve 14:00-18:00).
-- Çakışan/bitişik aralıkları SUNUCU birleştirerek yazıyor
-- (server/routes/admin.ts > musaitlikNormalize), burada ayrıca bir exclusion
-- kısıtı yok.
-- =============================================================================


-- =========================================================================
-- 1) teacher_availability
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teacher_availability (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL,
  start_minute SMALLINT NOT NULL,
  end_minute SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_availability_weekday CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT teacher_availability_range
    CHECK (start_minute >= 0 AND end_minute <= 1440 AND end_minute > start_minute),
  CONSTRAINT teacher_availability_half_hour
    CHECK (start_minute % 30 = 0 AND end_minute % 30 = 0)
);

COMMENT ON TABLE public.teacher_availability IS
  'Öğretmenin haftalık müsait saatleri (Türkiye saati, dakika). Yalnızca servis rolü okur/yazar.';

CREATE INDEX IF NOT EXISTS teacher_availability_teacher
  ON public.teacher_availability (teacher_id, weekday);

-- leads/auth_attempts ile AYNI desen: RLS açık, politika yok, anon ve
-- authenticated'a yetki yok. Advisor'ın "RLS enabled, no policy" uyarısı
-- burada da İSTENEN durum. Okuyan/yazan tek yer /api/admin/* (servis rolü).
ALTER TABLE public.teacher_availability ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_availability FROM anon, authenticated;
GRANT ALL ON public.teacher_availability TO service_role;


-- =========================================================================
-- 2) set_teacher_availability — tek işlemde değiştir
-- =========================================================================
-- DELETE + INSERT iki ayrı istek olsaydı, arada bir hata öğretmeni HİÇ
-- müsaitliği olmayan bir hesap olarak bırakırdı (ve programında tek bir boş
-- saat görünmezdi). Fonksiyon gövdesi tek işlem: ya hepsi ya hiçbiri.
--
-- p_slots: [{"weekday":1,"startMinute":540,"endMinute":720}, ...]
-- Doğrulama sunucuda; buradaki CHECK kısıtları ikinci savunma hattı.
CREATE OR REPLACE FUNCTION public.set_teacher_availability(p_teacher UUID, p_slots JSONB)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.teacher_availability WHERE teacher_id = p_teacher;

  INSERT INTO public.teacher_availability (teacher_id, weekday, start_minute, end_minute)
  SELECT p_teacher,
         (s->>'weekday')::SMALLINT,
         (s->>'startMinute')::SMALLINT,
         (s->>'endMinute')::SMALLINT
  FROM jsonb_array_elements(p_slots) AS s;
END;
$$;

-- PostgREST public şemadaki her fonksiyonu RPC olarak yayınlıyor; servis
-- rolü dışında kimse çağıramamalı (update_lead_step2 ile aynı gerekçe).
REVOKE EXECUTE ON FUNCTION public.set_teacher_availability(UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_teacher_availability(UUID, JSONB) TO service_role;


-- =========================================================================
-- 3) lessons.is_trial
-- =========================================================================
-- Süre bu bayraktan TÜRETİLİYOR (deneme 25 dk, normal 50 dk) ve ends_at'e
-- sunucu yazıyor; istemci bitiş saati göndermiyor. Bayrak ayrıca tutuluyor
-- çünkü "bu bir deneme dersi miydi" sorusu süreden geriye okunamaz — eski
-- dersler elle girilmiş, keyfi bitiş saatleri taşıyor.
--
-- Öğretmenin lessons üzerindeki tek yazma yetkisi GRANT UPDATE (status)
-- (supabase-teacher-panel.sql §4b), yani bu kolonu değiştiremez.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.lessons.is_trial IS
  'Deneme dersi mi. true: 25 dk, false: 50 dk — ends_at sunucuda bundan hesaplanır.';


-- =========================================================================
-- DOĞRULAMA
-- =========================================================================
-- 1) anon/authenticated'ın yetkisi yok (0 satır):
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_schema='public' and table_name='teacher_availability'
--    and grantee in ('anon','authenticated');
--
-- 2) RPC yalnızca servis rolüne açık:
-- select grantee from information_schema.routine_privileges
--  where routine_schema='public' and routine_name='set_teacher_availability';
--
-- 3) Kolon yerinde:
-- select column_name, data_type, column_default from information_schema.columns
--  where table_schema='public' and table_name='lessons' and column_name='is_trial';
