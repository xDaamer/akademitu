-- SUPABASE SQL: Anon key ile doğrudan lead INSERT + testimonials SELECT
-- Run this in your Supabase project's SQL Editor (Dashboard > SQL Editor).
--
-- Neden: Vercel'deki serverless fonksiyon (api/[...path].ts -> server.ts)
-- production'da her istekte FUNCTION_INVOCATION_FAILED (500) veriyor, kök
-- nedeni Vercel loglarına erişim olmadan teşhis edilemedi. Bu dosya, lead
-- formunu (isim/telefon -> detaylar) ve testimonials okumasını Vercel
-- fonksiyonuna hiç bağımlı olmadan tarayıcıdan doğrudan Supabase'e (anon
-- key + RLS ile) çalışacak hale getirir. server.ts'deki /api/leads,
-- /api/leads/step2, /api/testimonials route'ları kod olarak kalır (artık
-- istemci tarafından çağrılmıyor) ve Vercel sorunu çözülürse yeniden
-- devreye alınabilir.
--
-- anon'un `leads` üzerindeki TEK yetkisi INSERT'tir — asla SELECT/UPDATE/
-- DELETE yok. Adım 2'nin güncellemesi (isim/telefon dışındaki detaylar) bir
-- SECURITY DEFINER Postgres fonksiyonu (update_lead_step2) üzerinden yapılır:
-- fonksiyon içeride yükseltilmiş yetkiyle UPDATE çalıştırır, bu yüzden
-- anon'a hiçbir SELECT/UPDATE grant'ı gerekmez. (Denendi ve reddedildi: ham
-- bir `.update().eq('phone', ...)` çağrısı Postgres'in "UPDATE'in WHERE
-- cümlesinde geçen her kolon için SELECT yetkisi de gerekir" kuralına
-- takılıyor — bu RLS'den bağımsız, standart Postgres davranışı. Kolon
-- bazlı bile olsa SELECT vermek, `?select=phone` ile tüm telefon
-- numaralarının toplu çekilebilmesi anlamına gelirdi.)
--
-- Bilinçli kabul edilen risk: RLS/PostgREST seviyesinde IP-bazlı gerçek bir
-- rate-limit yok (aşağıdaki trigger sadece kaba/global bir sınır, kararlı
-- bir bot'u tam durduramaz). update_lead_step2 fonksiyonu `phone` parametresi
-- doğru verildiği sürece herhangi bir satırı güncelleyebilir (auth olmadığı
-- için "bu satır gerçekten senin mi" diye doğrulanamaz) — ama SELECT hiç
-- olmadığı için veri okunamaz/sızdırılamaz, sadece teorik olarak bilinen/
-- tahmin edilen bir telefon numarasının kaydı üzerine yazılabilir.
--
-- phone artık UNIQUE değil: aynı numarayla ikinci bir başvuru artık ham bir
-- "duplicate key" Postgres hatasıyla reddedilmek yerine kabul edilir ve
-- is_repeat_submission/first_seen_lead_id ile işaretlenir (bkz. aşağıdaki
-- "tekrar başvuruya izin ver" bölümü).
--
-- Safe to run multiple times (idempotent).

-- =========================================================================
-- leads: honeypot kolonu + rate-limit trigger + INSERT policy
-- =========================================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS website TEXT;

CREATE OR REPLACE FUNCTION public.enforce_leads_insert_rate_limit()
RETURNS trigger AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT count(*) INTO recent_count FROM public.leads
  WHERE created_at > now() - interval '1 minute';
  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'Çok fazla istek gönderildi. Lütfen birkaç dakika sonra tekrar deneyin.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS leads_rate_limit_trigger ON public.leads;
CREATE TRIGGER leads_rate_limit_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_leads_insert_rate_limit();

-- SECURITY DEFINER functions in the public schema are auto-exposed by
-- PostgREST as public RPC endpoints unless EXECUTE is revoked. This one
-- only makes sense as a trigger (it references NEW), never as a direct
-- call — trigger execution is unaffected by this revoke.
REVOKE EXECUTE ON FUNCTION public.enforce_leads_insert_rate_limit() FROM PUBLIC, anon, authenticated;

REVOKE UPDATE, SELECT, DELETE ON public.leads FROM anon;
GRANT INSERT ON public.leads TO anon;

DROP POLICY IF EXISTS "anon_update_leads" ON public.leads;

DROP POLICY IF EXISTS "anon_insert_leads" ON public.leads;
CREATE POLICY "anon_insert_leads" ON public.leads
  FOR INSERT TO anon
  WITH CHECK (
    full_name IS NOT NULL AND length(trim(full_name)) > 0
    AND phone ~ '^0?5[0-9]{9}$'
    AND (website IS NULL OR website = '')
  );

-- =========================================================================
-- leads: adım 2 güncellemesi (RPC — bkz. dosya başındaki açıklama)
-- =========================================================================

-- phone artık UNIQUE değil (bkz. aşağıdaki "tekrar başvuruya izin ver"
-- bölümü), bu yüzden WHERE phone = p_phone aynı numarayla birden fazla
-- satıra çarpabilir. Bu fonksiyon bu telefon için en son eklenmiş ve henüz
-- adım 2'si tamamlanmamış (step = 1) satırı hedefler — normal akışta bu her
-- zaman az önce saveLeadStep1() ile eklenen satırdır.
--
-- p_exam_type sonradan eklendi: mobilde alttan açılan kısa ilk adım yalnızca
-- ad ve telefon soruyor (ekranın yarısına sığması için), hedef sınav ikinci
-- adımda soruluyor. Parametre olmadan bu başvurular veritabanına her zaman
-- step 1'in varsayılanı olan 'YKS' ile düşerdi.
--
-- Parametre eklemek CREATE OR REPLACE ile yapılamaz (yeni bir aşırı yükleme
-- oluşturur ve 7 argümanlı çağrı belirsiz kalır), bu yüzden eski imza önce
-- düşürülüyor. DEFAULT NULL sayesinde henüz güncellenmemiş bir istemci eski
-- 7 argümanlı çağrısını yapmaya devam edebilir.
DROP FUNCTION IF EXISTS public.update_lead_step2(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT);

CREATE OR REPLACE FUNCTION public.update_lead_step2(
  p_phone TEXT,
  p_student_full_name TEXT,
  p_parent_full_name TEXT,
  p_user_role TEXT,
  p_grade_class TEXT,
  p_selected_subjects TEXT[],
  p_website TEXT,
  p_exam_type TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  target_id UUID;
BEGIN
  IF p_student_full_name IS NULL OR length(trim(p_student_full_name)) = 0 THEN
    RAISE EXCEPTION 'Öğrenci ad soyad zorunludur.';
  END IF;
  IF p_website IS NOT NULL AND p_website <> '' THEN
    RAISE EXCEPTION 'Geçersiz istek.';
  END IF;

  SELECT id INTO target_id
  FROM public.leads
  WHERE phone = p_phone AND step = 1
  ORDER BY created_at DESC
  LIMIT 1;

  IF target_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.leads
  SET
    student_full_name = p_student_full_name,
    parent_full_name = p_parent_full_name,
    user_role = p_user_role,
    grade_class = p_grade_class,
    selected_subjects = p_selected_subjects,
    website = p_website,
    -- Tanınmayan ya da hiç gönderilmeyen bir değer step 1'de yazılanı ezmez.
    exam_type = CASE
      WHEN p_exam_type IN ('YKS', 'LGS', 'Diğer') THEN p_exam_type
      ELSE exam_type
    END,
    step = 2,
    updated_at = now()
  WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bu fonksiyon bilerek herkese açık bir RPC endpoint'i (rate-limit
-- trigger'ının aksine) — anon'un EXECUTE alması amaçlanan tasarım.
GRANT EXECUTE ON FUNCTION public.update_lead_step2(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT) TO anon;

-- =========================================================================
-- leads: aynı telefonla tekrar başvuruya izin ver, ama işaretle
-- =========================================================================
-- Eskiden phone UNIQUE'ti ve ikinci başvuru ham bir Postgres hatasıyla
-- (duplicate key value violates unique constraint) reddediliyordu — bu hata
-- doğrudan kullanıcıya sızıyordu. Artık tekrar başvurulara izin veriliyor;
-- bunun yerine satır is_repeat_submission=true ve first_seen_lead_id ile
-- işaretleniyor, böylece ekip aynı numarayla gelen tüm başvuruları görebilir.

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_phone_key;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_repeat_submission BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_seen_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- BEFORE INSERT, SECURITY DEFINER: anon'un leads üzerinde hiç SELECT'i
-- olmasa da bu numarayla daha önce kayıt var mı diye bakabilmek için.
CREATE OR REPLACE FUNCTION public.mark_leads_repeat_submission()
RETURNS trigger AS $$
DECLARE
  earliest_id UUID;
BEGIN
  SELECT id INTO earliest_id
  FROM public.leads
  WHERE phone = NEW.phone
  ORDER BY created_at ASC
  LIMIT 1;

  IF earliest_id IS NOT NULL THEN
    NEW.is_repeat_submission := true;
    NEW.first_seen_lead_id := earliest_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS leads_mark_repeat_trigger ON public.leads;
CREATE TRIGGER leads_mark_repeat_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.mark_leads_repeat_submission();

-- Sadece trigger olarak çalışması amaçlanmış (NEW'e referans veriyor) —
-- doğrudan RPC olarak asla çağrılmamalı.
REVOKE EXECUTE ON FUNCTION public.mark_leads_repeat_submission() FROM PUBLIC, anon, authenticated;

-- =========================================================================
-- testimonials: sadece yayınlanmış (is_published = true) satırları okuma
-- =========================================================================

GRANT SELECT ON public.testimonials TO anon;

DROP POLICY IF EXISTS "anon_select_published_testimonials" ON public.testimonials;
CREATE POLICY "anon_select_published_testimonials" ON public.testimonials
  FOR SELECT TO anon
  USING (is_published = true);

-- =========================================================================
-- Doğrulama (yukarıdaki bloktan sonra çalıştırın)
-- =========================================================================
-- select policyname, cmd, roles from pg_policies
--   where schemaname='public' and tablename in ('leads','testimonials');
--
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--   where table_schema='public' and table_name in ('leads','testimonials')
--   and grantee='anon' order by table_name, privilege_type;
-- -> leads: INSERT only. testimonials: SELECT only. Asla leads üzerinde
--    SELECT/UPDATE/DELETE yok.
