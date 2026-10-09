-- =============================================================================
-- ÖĞRETMEN AÇIKLAMASI — eklendi 2026-10-09
-- =============================================================================
-- HENÜZ UYGULANMADI. Supabase SQL Editor'de bir kez çalıştırın; tamamı
-- idempotent (IF NOT EXISTS), tekrar çalıştırmak zararsız.
--
-- Yönetim panelinde her öğretmenin altında görünen serbest metin: hangi
-- dersleri verdiği, yöneticinin notları. YALNIZCA YÖNETİCİLER görür —
-- öğretmen kendi açıklamasını da göremez.
--
-- Uygulanmadan deploy edilse de panel AÇILIR: /api/admin/ozet bu tabloyu
-- okuyamazsa açıklamasız devam ediyor (müsaitlik migration'ında yaşanan
-- "panel tamamen çöktü" durumu burada olmasın diye). Yalnızca açıklama
-- kaydetmek ve açıklamalı öğretmen hesabı açmak hata döner.
--
-- ---------------------------------------------------------------------------
-- NEDEN profiles'ta bir kolon DEĞİL
-- ---------------------------------------------------------------------------
-- Öğretmen profiles'taki KENDİ satırını okuyabiliyor (profiles_select_own) ve
-- authenticated'ın o tabloda tablo seviyesinde UPDATE yetkisi var. Oraya konan
-- bir açıklamayı öğretmen kendi jetonuyla PostgREST'ten doğrudan okurdu;
-- "yalnızca yönetici görür" kuralı arayüzde gizlemekle sağlanamaz.
-- teacher_availability ile aynı desen: RLS açık, politika yok, yetki yok.
-- Okuyan/yazan tek yer /api/admin/* (servis rolü).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_descriptions (
  teacher_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Son düzenleyen yönetici. Hesabı silinse de açıklama kalmalı.
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Boş açıklama satır olarak tutulmuyor: sunucu boş metni SİLME sayıyor.
  CONSTRAINT teacher_descriptions_length
    CHECK (char_length(description) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE public.teacher_descriptions IS
  'Öğretmen açıklaması (verdiği dersler, notlar). Yalnızca servis rolü okur/yazar; öğretmen göremez.';

-- Supabase public şemadaki yeni tablolara anon/authenticated için varsayılan
-- yetki veriyor; REVOKE bu yüzden ŞART, süs değil.
ALTER TABLE public.teacher_descriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.teacher_descriptions FROM anon, authenticated;
GRANT ALL ON public.teacher_descriptions TO service_role;

-- PostgREST şema önbelleği yeni tabloyu hemen görsün.
NOTIFY pgrst, 'reload schema';
