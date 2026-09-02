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

CREATE OR REPLACE FUNCTION public.update_lead_step2(
  p_phone TEXT,
  p_student_full_name TEXT,
  p_parent_full_name TEXT,
  p_user_role TEXT,
  p_grade_class TEXT,
  p_selected_subjects TEXT[],
  p_website TEXT
)
RETURNS void AS $$
BEGIN
  IF p_student_full_name IS NULL OR length(trim(p_student_full_name)) = 0 THEN
    RAISE EXCEPTION 'Öğrenci ad soyad zorunludur.';
  END IF;
  IF p_website IS NOT NULL AND p_website <> '' THEN
    RAISE EXCEPTION 'Geçersiz istek.';
  END IF;

  UPDATE public.leads
  SET
    student_full_name = p_student_full_name,
    parent_full_name = p_parent_full_name,
    user_role = p_user_role,
    grade_class = p_grade_class,
    selected_subjects = p_selected_subjects,
    website = p_website,
    step = 2,
    updated_at = now()
  WHERE phone = p_phone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Bu fonksiyon bilerek herkese açık bir RPC endpoint'i (rate-limit
-- trigger'ının aksine) — anon'un EXECUTE alması amaçlanan tasarım.
GRANT EXECUTE ON FUNCTION public.update_lead_step2(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT) TO anon;

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
