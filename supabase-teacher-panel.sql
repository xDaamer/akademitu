-- =============================================================================
-- ÖĞRETMEN PANELİ — FAZ 1: ŞEMA
-- =============================================================================
-- UYGULANDI: 2026-09-11, "akademITU Database" projesine (ccgqhzuleodwnjbfbjrg),
-- dört migration olarak:
--   teacher_panel_schema
--   teacher_panel_fix_profiles_policy_recursion
--   teacher_panel_move_helper_to_private_schema
--   teacher_can_mark_lesson_completed
-- Bu dosya o dördünün birleşmiş ve nihai hâli. Tamamı idempotent (IF NOT EXISTS
-- / OR REPLACE / DROP POLICY IF EXISTS), tekrar çalıştırmak zararsız. Yeni bir
-- ortam kurarken (ör. ikinci bir Supabase projesi) SQL Editor'de bir kez
-- çalıştırın.
--
-- BU DOSYA NE YAPIYOR:
--   1. profiles.user_type          — 'student' | 'teacher' | 'admin'
--   1b. profiles_update_own SIKILAŞTIRMASI — YETKİ YÜKSELTME KAPATILIYOR
--   2. lessons'a teacher_id / ends_at / status
--   3. lesson_comments             — ders başına TEK öğretmen yorumu
--   4. Öğretmen RLS politikaları   — asıl yetkilendirme sınırı burası
--      (4b ayrıca KOLON BAZLI yetki içeriyor: öğretmen yalnızca `status`
--       kolonunu yazabilir, dersin başka hiçbir alanını değil)
--
-- ---------------------------------------------------------------------------
-- ÖNCE: BU ŞEMA PLANDAKİNDEN NEDEN FARKLI
-- ---------------------------------------------------------------------------
-- Öğretmen paneli planı `lessons` tablosunda `teacher_id`, `student_id`,
-- `lesson_date`, `start_time`, `end_time`, `status` olduğunu varsayıyordu.
-- Canlı şemada bunların HİÇBİRİ yoktu; `lessons` şöyleydi:
--
--     id, user_id (-> auth.users, ÖĞRENCİ), subject, teacher_name (TEXT!),
--     starts_at, kind, created_at
--
-- Yani öğretmen bir SERBEST METİNDİ; ders ile öğretmen hesabı arasında
-- hiçbir bağ yoktu. Planın "öğretmen yalnızca kendi derslerini görsün" ve
-- "başkasının dersine yorum yazamasın" kuralları bu bağ olmadan
-- YAZILAMAZ — bu dosyanın 2. bölümü o bağı kuruyor.
--
-- `user_id` BİLEREK yeniden adlandırılmadı (plan `student_id` diyordu):
-- mevcut `lessons_select_own` politikası, `lessons_user_time` indeksi ve
-- server/routes/portal.ts'teki panel sorgusu bu ada bağlı. Bir kolon adı
-- için çalışan üç şeyi kırmanın karşılığı yok.
--
-- ---------------------------------------------------------------------------
-- YETKİLENDİRME NEREDE YAŞIYOR: ROUTE'TA DEĞİL, RLS'TE
-- ---------------------------------------------------------------------------
-- server/routes/portal.ts bilerek serviceClient() ÇAĞIRMIYOR; her sorgu
-- kullanıcının kendi JWT'siyle (userClient) çalışıyor, yani RLS altında.
-- Bunun sonucu şu: bir öğretmen, route'taki her şey doğru olsa bile,
-- politika ona izin vermedikçe TEK BİR SATIR göremez. Mevcut
-- `lessons_select_own` politikası "user_id = auth.uid()" diyor ve öğretmen
-- dersin user_id'si değil — yani politika eklenmeden öğretmen paneli boş
-- döner. 4. bölüm bu yüzden bu dosyanın en kritik parçası.
--
-- Buradaki tasarım kararı: route seviyesindeki kontroller (403 dönmek)
-- KULLANICI DENEYİMİ içindir, güvenlik için değil. Güvenlik politikalardan
-- gelir; route'taki bir hata bile başkasının verisini açmaz.
-- =============================================================================


-- =========================================================================
-- 1) profiles.user_type — kullanıcı hangi paneli görüyor
-- =========================================================================
-- Ayrı bir `teachers` tablosu yerine profiles'ta tek kolon: giriş zaten
-- telefon -> profiles üzerinden çözülüyor (bkz. server/routes/auth.ts), yani
-- her giriş bu satıra zaten uğruyor. İkinci bir tabloya JOIN atmanın
-- karşılığı olmazdı.
--
-- DEFAULT 'student': mevcut satırların hepsi öğrenci olarak gelir. Öğretmen
-- yapmak açık bir eylem olmalı, varsayılanla olmamalı.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'student';

-- CHECK ayrı ekleniyor: ADD COLUMN ... CHECK idempotent değil (kolon varsa
-- kısıt hiç eklenmez), bu blok ise her çalıştırmada doğru sonucu verir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass AND conname = 'profiles_user_type_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_type_check
      CHECK (user_type IN ('student', 'teacher', 'admin'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.user_type IS
  'Hangi panel: student | teacher | admin. Kullanıcı KENDİ değiştiremez (bkz. profiles_update_own).';

-- Öğretmenin ders listesi "bu öğretmenin dersleri" diye sorgulanacak;
-- öğretmen sayısı az olsa da tip filtresi yönetim sorgularında sık geçecek.
CREATE INDEX IF NOT EXISTS profiles_user_type ON public.profiles (user_type);


-- =========================================================================
-- 1b) YETKİ YÜKSELTME KAPATILIYOR  <-- BU BÖLÜMÜ ATLAMAYIN
-- =========================================================================
-- Mevcut `profiles_update_own` politikası kullanıcının kendi satırında
-- SADECE `phone`u sabitliyordu:
--
--     WITH CHECK (auth.uid() = id AND phone = (SELECT ... ))
--
-- `user_type` eklendiği anda bu bir YETKİ YÜKSELTME AÇIĞI hâline gelir:
-- authenticated rolünün profiles üzerinde UPDATE yetkisi var, dolayısıyla
-- herhangi bir öğrenci kendi satırında
--
--     update profiles set user_type = 'teacher' where id = auth.uid()
--
-- çalıştırıp öğretmen paneline geçebilirdi. Panel bir öğretmenin BAŞKA
-- öğrencilerin verisini görmesine izin verdiği için bu doğrudan veri
-- sızıntısıdır.
--
-- Çözüm: user_type'ı da phone gibi sabitle. Kullanıcı yalnızca full_name
-- değiştirebilir; kimliğini (telefon) ve rolünü (user_type) değiştiremez.
-- İkisi de sunucudan/yöneticiden, servis rolüyle değişir.

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND phone     = (SELECT p.phone     FROM public.profiles p WHERE p.id = auth.uid())
    AND user_type = (SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid())
  );


-- =========================================================================
-- 2) lessons — öğretmen bağı, bitiş saati, durum
-- =========================================================================

-- teacher_id: dersin sahibi öğretmen. NULL OLABİLİR ve bu bilinçli —
-- `teacher_name` serbest metin olarak girilmiş eski/dışarıdan gelen dersler
-- var olabilir ve onların bir hesabı yok. NOT NULL yapmak veri girişini
-- öğretmen hesabı açmaya bağımlı kılardı.
--
-- ON DELETE SET NULL (CASCADE DEĞİL): bir öğretmen hesabı silindiğinde
-- ÖĞRENCİNİN ders geçmişi silinmemeli. Ders öğrencinindir, öğretmenin değil.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.lessons.teacher_id IS
  'Dersi veren öğretmenin hesabı. NULL: hesaba bağlanmamış ders (teacher_name serbest metin kalır).';

COMMENT ON COLUMN public.lessons.teacher_name IS
  'Görüntüleme adı. teacher_id varken de tutulur: hesap silinse bile öğrenci dersi kimin verdiğini görebilsin.';

-- ends_at: haftalık program ızgarası dersin ne kadar sürdüğünü bilmeli.
-- NULL olabilir; arayüz NULL için varsayılan süreye düşer (bkz. Faz 3).
-- Geriye dönük uyumluluk için NOT NULL yapılmadı — mevcut satırlarda yok.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lessons'::regclass AND conname = 'lessons_ends_after_starts'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_ends_after_starts
      CHECK (ends_at IS NULL OR ends_at > starts_at);
  END IF;
END $$;

-- status: yorum yalnızca TAMAMLANMIŞ derse yazılabilir.
-- 'scheduled' varsayılan; ders bitince 'completed'a geçer.
--
-- GEÇİŞİ ÖĞRETMEN YAPIYOR (bkz. 4b). Bir süre bu geçişi yapan hiçbir arayüz
-- yoktu ve sonuç şuydu: yorum yazmak 'completed' olmaya bağlı olduğu için
-- pratikte HİÇ yorum yazılamıyordu. Admin paneli beklemek yerine işaretleme
-- dersi veren kişiye verildi — zaten dersin işlenip işlenmediğini bilen tek
-- kişi o.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'scheduled';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lessons'::regclass AND conname = 'lessons_status_check'
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT lessons_status_check
      CHECK (status IN ('scheduled', 'completed', 'cancelled'));
  END IF;
END $$;

-- Öğretmen panelinin ana sorgusu: "bu öğretmenin şu hafta arasındaki
-- dersleri". Mevcut lessons_user_time indeksi öğrenci sorgusuna göre
-- (user_id, starts_at) kurulu ve bu sorguya yaramaz.
CREATE INDEX IF NOT EXISTS lessons_teacher_time
  ON public.lessons (teacher_id, starts_at);

-- "Bu öğretmenin şu öğrenciyle dersi var mı" — profiles politikası (4d)
-- her satır için bunu soruyor, indekssiz bırakılırsa öğrenci adı çözümü
-- tam tarama olur.
CREATE INDEX IF NOT EXISTS lessons_teacher_student
  ON public.lessons (teacher_id, user_id);


-- =========================================================================
-- 3) lesson_comments — ders başına TEK yorum
-- =========================================================================
-- lesson_id UNIQUE: planın istediği davranış "her derse tek yorum, ikinci
-- kez yazılırsa üzerine yazılsın". Bunu uygulamanın doğru yolu Faz 4'te
-- ON CONFLICT (lesson_id) DO UPDATE — ve ON CONFLICT'in çalışması için
-- kısıtın VARLIĞI şart. DELETE + INSERT değil: tek atomik ifade, araya
-- ikinci bir istek girerse yarış durumu oluşmaz.
--
-- coach_notes İLE KARIŞTIRMAYIN. İkisi farklı soruları cevaplıyor:
--   coach_notes     -> öğrenci başına GENEL koç notu (tarihli, çok satır).
--   lesson_comments -> BELİRLİ BİR DERSE ait tek yorum.
-- coach_notes'a dokunulmadı; panelin mevcut "Koçun Notu" bölümü aynen
-- çalışmaya devam ediyor.

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ON DELETE CASCADE: ders silinirse yorumu da gider. Yorumun dersten
  -- bağımsız bir anlamı yok.
  lesson_id UUID NOT NULL UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,

  -- Yorumu KİM yazdı — bir denetim alanı. Yetkilendirme bu kolona DEĞİL,
  -- lessons.teacher_id'ye bakar (dersin sahibi orasıdır). Öğretmen hesabı
  -- silinince yorum kalsın diye ON DELETE SET NULL.
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  comment TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Sunucu da doğruluyor; burada ikinci kez (derinlemesine savunma).
  -- btrim: yalnızca boşluktan oluşan bir yorum boş yorumdur.
  CONSTRAINT lesson_comments_length CHECK (length(btrim(comment)) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE public.lesson_comments IS
  'Ders başına tek öğretmen yorumu. Öğrenci başına genel not için coach_notes ayrı tablodur.';

-- Öğrencinin "Koçun Yorumu" sayfası: kendi derslerinin yorumlarını
-- lesson_id listesiyle çekiyor.
CREATE INDEX IF NOT EXISTS lesson_comments_teacher
  ON public.lesson_comments (teacher_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_lesson_comments_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
-- SET search_path = public: sabitlenmemiş search_path, fonksiyonun çağıranın
-- şema sırasıyla çalışması demek. Supabase güvenlik denetimi de uyarır.
-- (Aynı gerekçe touch_profiles_updated_at'te de yazılı.)
$$ LANGUAGE plpgsql SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.touch_lesson_comments_updated_at()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lesson_comments_touch_updated_at ON public.lesson_comments;
CREATE TRIGGER lesson_comments_touch_updated_at
  BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_lesson_comments_updated_at();

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- 4) YETKİLER VE POLİTİKALAR — İŞİN ASIL GÜVENLİK KISMI
-- =========================================================================
-- anon'a hiçbir şey verilmiyor. supabase-portal-auth.sql'deki
-- ALTER DEFAULT PRIVILEGES zaten yeni tabloları anon'dan uzak tutuyor;
-- yine de açıkça yazılıyor, çünkü "kazara verilmemiş" ile "bilerek
-- verilmemiş" arasındaki farkı okuyan biri görmeli.
REVOKE ALL ON public.lesson_comments FROM anon;

-- authenticated'ın yetkisi DAR: okuma + ekleme + güncelleme. DELETE YOK —
-- yorumu silmek gereken bir akış tanımlı değil; gerekirse yorum boş
-- bırakılmak yerine üzerine yazılır. Verilmemiş yetki, unutulmuş politikadan
-- güvenlidir.
GRANT SELECT, INSERT, UPDATE ON public.lesson_comments TO authenticated;


-- --------------------------------------------------- 4a) lessons — OKUMA
-- Öğretmen kendi derslerini görebilsin. Mevcut lessons_select_own
-- politikası duruyor (öğrenci kendi derslerini görür); politikalar OR'lanır,
-- yani ikisi birlikte "kendi dersin ya da verdiğin ders" demek olur.
--
-- BURADA user_type KONTROLÜ YOK — VE OLMAMALI. "AND (profiles'ta user_type
-- = teacher)" eklemek cazip görünüyor ama profiles politikası da (4c)
-- lessons'a bakıyor: ikisi birbirini çağırınca PostgreSQL sonsuz özyineleme
-- hatası verir ve panelin tamamı çöker. Zaten gereksiz de: bir dersin
-- teacher_id'si olmak, o dersi görmek için yeterli ve doğru koşuldur.
-- user_type'ın işi ARAYÜZÜ yönlendirmek (Faz 2), satır filtrelemek değil.
DROP POLICY IF EXISTS "lessons_select_as_teacher" ON public.lessons;
CREATE POLICY "lessons_select_as_teacher" ON public.lessons
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());


-- ------------------------- 4b) lessons — "İŞLENDİ" İŞARETLEMESİ (UPDATE)
-- Öğretmen kendi dersini 'completed' yapabilsin (ve yanlışlıkla yaptıysa geri
-- alabilsin). Yorum yazmanın ön koşulu bu geçiş.
--
-- İKİ AYRI KISIT VE İKİSİ DE GEREKLİ — BİRİ OLMADAN DİĞERİ YETMEZ:
--
--   1. KOLON BAZLI YETKİ. RLS "hangi SATIRI" güncelleyebileceğini söyler,
--      "hangi KOLONU" güncelleyebileceğini SÖYLEMEZ. Aşağıdaki politika tek
--      başına bırakılsaydı öğretmen kendi dersinin subject'ini, starts_at'ini
--      ve hatta user_id'sini (dersi başka bir öğrenciye taşıyarak)
--      değiştirebilirdi. GRANT UPDATE (status) bunu Postgres'in kendi diliyle
--      kapatıyor: status dışındaki her kolon 42501 verir.
--
--   2. POLİTİKA. Hangi satır ve hangi değerler:
--      USING      -> yalnızca KENDİ dersi, ve yalnızca scheduled/completed
--                    olanlar. 'cancelled' bir ders öğretmence diriltilemez;
--                    iptal ücretlendirmeyi de ilgilendiren bir yönetim kararı.
--      WITH CHECK -> güncelleme SONRASI da aynı koşul. Bu olmasaydı öğretmen
--                    dersi 'cancelled' yapabilirdi.
--
-- Ölçüldü (supabase-teacher-panel-tests.sql): başka öğretmenin dersi 0 satır,
-- iptal dersi 0 satır, subject/user_id/teacher_id/starts_at değişimi 42501,
-- öğrencinin kendi dersini işaretlemesi 0 satır, DELETE 42501.
GRANT UPDATE (status) ON public.lessons TO authenticated;

DROP POLICY IF EXISTS "lessons_update_status_as_teacher" ON public.lessons;
CREATE POLICY "lessons_update_status_as_teacher" ON public.lessons
  FOR UPDATE TO authenticated
  USING (
    teacher_id = auth.uid()
    AND status IN ('scheduled', 'completed')
  )
  WITH CHECK (
    teacher_id = auth.uid()
    AND status IN ('scheduled', 'completed')
  );


-- -------------------------------------------------------- 4c) lesson_comments
-- Öğretmen: yalnızca KENDİ verdiği derslerin yorumlarını okur/yazar.
-- Route'taki 403 kontrolü (Faz 4) bunun kopyası değil, tamamlayıcısı:
-- route kullanıcıya anlamlı hata döndürür, politika ise route hatalı olsa
-- bile satırın yazılmasına izin vermez.
DROP POLICY IF EXISTS "lesson_comments_select_as_teacher" ON public.lesson_comments;
CREATE POLICY "lesson_comments_select_as_teacher" ON public.lesson_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_comments.lesson_id AND l.teacher_id = auth.uid()
    )
  );

-- INSERT: WITH CHECK, USING değil — henüz var olmayan satır için "hangi
-- satırları görüyorsun" sorusunun anlamı yok, "hangi satırı yazabilirsin"
-- sorusunun var.
DROP POLICY IF EXISTS "lesson_comments_insert_as_teacher" ON public.lesson_comments;
CREATE POLICY "lesson_comments_insert_as_teacher" ON public.lesson_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_comments.lesson_id AND l.teacher_id = auth.uid()
    )
  );

-- UPDATE hem USING hem WITH CHECK istiyor: USING "hangi satırı
-- güncelleyebilirsin", WITH CHECK "güncelledikten SONRA satır neye
-- benzemeli". WITH CHECK yazılmazsa öğretmen bir yorumu başka bir dersin
-- üstüne taşıyabilirdi (lesson_id'yi değiştirerek).
DROP POLICY IF EXISTS "lesson_comments_update_as_teacher" ON public.lesson_comments;
CREATE POLICY "lesson_comments_update_as_teacher" ON public.lesson_comments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_comments.lesson_id AND l.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_comments.lesson_id AND l.teacher_id = auth.uid()
    )
  );

-- Öğrenci: kendi dersinin yorumunu OKUR, yazamaz. Faz 5'in tamamı bu
-- politikanın üstünde duruyor — öğrenci başka öğrencinin lesson_id'sini
-- deneyse bile satır dönmez.
DROP POLICY IF EXISTS "lesson_comments_select_as_student" ON public.lesson_comments;
CREATE POLICY "lesson_comments_select_as_student" ON public.lesson_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.id = lesson_comments.lesson_id AND l.user_id = auth.uid()
    )
  );


-- --------------------------------------------------------------- 4d) profiles
-- Öğretmen panelinde program ızgarası ÖĞRENCİ ADI gösteriyor. Mevcut
-- profiles_select_own politikası yalnızca "kendi satırın" diyor, yani
-- öğretmen öğrencilerinin adını göremez ve ızgara isimsiz kalırdı.
--
-- Erişim DERSE BAĞLI, role değil: öğretmen bir öğrencinin profilini ancak
-- o öğrenciyle ARASINDA DERS VARSA görebilir. "user_type = teacher olan
-- herkes tüm profilleri görsün" demek, tek bir öğretmen hesabının tüm
-- öğrenci listesini (ad + telefon) açması demekti.
--
-- ---------------------------------------------------------------------------
-- NEDEN POLİTİKANIN GÖVDESİNDE ALT SORGU YOK  <-- ÖNEMLİ, BOZMAYIN
-- ---------------------------------------------------------------------------
-- Bu politika ilk hâlinde doğrudan alt sorgu içeriyordu:
--
--     USING (EXISTS (SELECT 1 FROM public.lessons l
--                    WHERE l.user_id = profiles.id AND l.teacher_id = auth.uid()))
--
-- Bu ÇALIŞMIYOR ve nasıl bozulduğu sinsi: profiles'ın UPDATE politikası
-- (profiles_update_own) phone ve user_type'ı sabitlemek için profiles'a
-- kendi alt sorgusunu atıyor. O alt sorgu profiles'ın SELECT politikalarını
-- tetikliyor; SELECT politikalarından biri de (bu politika) yeni bir alt
-- sorgu açınca PostgreSQL politika genişletmesini özyineleme sayıp
-- 42P17 "infinite recursion detected in policy" veriyor.
--
-- Sonuç sadece öğretmen tarafını değil, MEVCUT DAVRANIŞI da kırıyordu:
-- kullanıcının kendi adını değiştirmesi dahil profiles üzerindeki HER
-- UPDATE hata veriyordu. Ölçüldü, tahmin değil (bkz. aşağıdaki doğrulama 2).
--
-- Çözüm: alt sorguyu politikadan çıkarıp SECURITY DEFINER bir yardımcıya
-- taşımak. Planlayıcı fonksiyonun içini genişletmediği için özyineleme
-- oluşmuyor.
--
-- SECURITY DEFINER burada güvenli, çünkü fonksiyon parametresi ne olursa
-- olsun ÖĞRETMEN TARAFI auth.uid()'ye sabit: kişi yalnızca "şu kullanıcı
-- BENİM öğrencim mi" sorusunu sorabiliyor, "X, Y'nin öğrencisi mi"yi değil.
-- Dönen değer tek bir boolean; satır döndürmüyor.
--
-- ---------------------------------------------------------------------------
-- NEDEN `private` ŞEMASINDA, `public`'te DEĞİL
-- ---------------------------------------------------------------------------
-- PostgREST `public` şemasındaki her fonksiyonu RPC olarak da YAYINLAR. Bu
-- fonksiyon ilk sürümde public'teydi ve Supabase güvenlik danışmanı bunu
-- doğru şekilde işaretledi (0029): giriş yapmış herkes
-- /rest/v1/rpc/ogrencim_mi adresini çağırabiliyordu.
--
-- EXECUTE yetkisini kaldırmak çözüm DEĞİL: politika, sorguyu atan
-- kullanıcının yetkileriyle değerlendiriliyor, yani authenticated'ın EXECUTE
-- yetkisi ŞART. Yetkiyi alırsak politika da çalışmaz.
--
-- Doğru çözüm fonksiyonu API'ye açılmayan bir şemaya taşımak: politika onu
-- çağırmaya devam eder (politikalar şema sınırı tanımaz), dışarıdan HTTP ile
-- çağrılamaz. Danışman uyarısı da böylece gerçekten çözülür, susturulmaz.
CREATE SCHEMA IF NOT EXISTS private;

COMMENT ON SCHEMA private IS
  'PostgREST API''sine acilmayan sema. RLS politikalarinin cagirdigi SECURITY DEFINER yardimcilar burada durur; public''te olsalardi RPC olarak da yayinlanirlardi.';

-- Şema kullanımı authenticated'a açık ama içindeki nesnelere yetki TEK TEK
-- veriliyor; varsayılan olarak hiçbir şey erişilebilir değil.
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION private.ogrencim_mi(ogrenci UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons l
    WHERE l.user_id = ogrenci AND l.teacher_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION private.ogrencim_mi(UUID) IS
  'Cagiran ogretmenin bu ogrenciyle dersi var mi. SECURITY DEFINER: politika govdesinde alt sorgu birakmamak icin (42P17 ozyineleme). auth.uid() ile sinirli - baskasinin adina sorgulanamaz.';

REVOKE EXECUTE ON FUNCTION private.ogrencim_mi(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.ogrencim_mi(UUID) TO authenticated;

DROP POLICY IF EXISTS "profiles_select_as_teacher" ON public.profiles;
CREATE POLICY "profiles_select_as_teacher" ON public.profiles
  FOR SELECT TO authenticated
  USING (private.ogrencim_mi(profiles.id));

-- İlk sürümden kalmışsa temizle (idempotency).
DROP FUNCTION IF EXISTS public.ogrencim_mi(UUID);


-- =========================================================================
-- ÖĞRETMEN HESABI AÇMA — ELLE, TEK YOL BUDUR
-- =========================================================================
-- Kayıt ekranı ve /api/auth/signup ucu YOK (bkz. supabase-portal-auth.sql
-- §1b). Öğretmen hesabı da aynı iki adımla açılır, tek farkı user_type:
--
-- ADIM 1 — Authentication > Users > "Add user" > "Create new user"
--            Email: ogretmen@ornek.com, güçlü şifre,
--            "Auto Confirm User" İŞARETLİ (işaretlenmezse giriş yapamaz).
--
-- ADIM 2 — Profili bağla:
--
-- insert into public.profiles (id, full_name, phone, user_type)
-- values (
--   (select id from auth.users where email = 'ogretmen@ornek.com'),
--   'Ad Soyad',
--   '05321234567',
--   'teacher'
-- );
--
-- Mevcut bir hesabı öğretmene çevirmek (yalnızca SQL Editor'den; kullanıcı
-- kendi yapamaz, bkz. 1b):
-- update public.profiles set user_type = 'teacher' where phone = '05321234567';
--
-- Dersi bir öğretmene bağlamak:
-- update public.lessons set teacher_id = (
--   select id from public.profiles where phone = '05321234567' and user_type = 'teacher'
-- ) where id = '<ders-id>';


-- =========================================================================
-- DOĞRULAMA
-- =========================================================================
-- 1) anon'un hiçbir yetkisi olmamalı, authenticated dar kalmalı:
-- select grantee, table_name, privilege_type
--   from information_schema.role_table_grants
--   where table_schema='public' and grantee in ('anon','authenticated')
--   order by table_name, grantee, privilege_type;
-- -> anon: SIFIR satır.
-- -> authenticated: profiles(SELECT,UPDATE), lessons/exam_results/payments/
--    coach_notes(SELECT), lesson_comments(SELECT,INSERT,UPDATE).
--
-- 2) Yetki yükseltme kapalı mı VE mevcut davranış korunuyor mu.
-- Bu blok gerçek bir oturum gerektirmez; rol ve JWT taklit edilip
-- ROLLBACK'le geri alınır. 2026-09-11'de çalıştırıldı, altı testin altısı
-- geçti (bkz. 4c'deki 42P17 notu — ilk sürüm bu testte kırılmıştı):
--
-- begin;
-- create temp table sonuc (test text, sonuc text);
-- grant insert, select on sonuc to authenticated;
-- do $$
-- declare uid uuid; n int;
-- begin
--   select id into uid from public.profiles limit 1;
--   perform set_config('role','authenticated',true);
--   perform set_config('request.jwt.claims',
--     json_build_object('sub',uid,'role','authenticated')::text, true);
--
--   begin  -- BEKLENEN: 42501, WITH CHECK reddi
--     update public.profiles set user_type='teacher' where id=uid;
--     insert into sonuc values ('user_type', 'ACIK!');
--   exception when others then
--     insert into sonuc values ('user_type', 'engellendi: '||sqlstate);
--   end;
--
--   begin  -- BEKLENEN: 42501
--     update public.profiles set phone='05999999999' where id=uid;
--     insert into sonuc values ('phone', 'ACIK!');
--   exception when others then
--     insert into sonuc values ('phone', 'engellendi: '||sqlstate);
--   end;
--
--   begin  -- BEKLENEN: 1 satır (bu İZİN VERİLMELİ)
--     update public.profiles set full_name='Test' where id=uid;
--     get diagnostics n = row_count;
--     insert into sonuc values ('full_name', n||' satir');
--   exception when others then
--     insert into sonuc values ('full_name', 'BEKLENMEYEN RED: '||sqlstate);
--   end;
--
--   perform set_config('role','postgres',true);
-- end $$;
-- select * from sonuc; rollback;
--
-- 42P17 görürseniz politika gövdesine alt sorgu geri gelmiş demektir.
--
-- 3) Kısıtlar yerinde mi:
-- select conname from pg_constraint
--  where conrelid in ('public.profiles'::regclass,'public.lessons'::regclass,
--                     'public.lesson_comments'::regclass)
--    and contype in ('c','u') order by conname;
