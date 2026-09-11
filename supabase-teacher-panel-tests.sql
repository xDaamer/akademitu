-- =============================================================================
-- ÖĞRETMEN PANELİ — RLS GÜVENLİK TESTLERİ
-- =============================================================================
-- Supabase SQL Editor'de OLDUĞU GİBİ çalıştırın. Tamamı BEGIN ... ROLLBACK
-- içinde: canlı veritabanında KALICI HİÇBİR DEĞİŞİKLİK BIRAKMAZ. Test
-- kullanıcıları, dersleri ve yorumları işlem içinde kurulur ve geri alınır.
--
-- SON ÇALIŞTIRMA: 2026-09-11 — 27 doğrulamanın 27'si GEÇTİ. (Ölçüm iki
-- turda yapıldı: 1-16 ilk sürümle, 17-27 ile 1/10'un yeni beklentileri
-- iptal dersi fixture'ı eklendikten sonra; dosyanın tamamı tek script
-- olarak henüz koşulmadı — SQL Editor'de bir kez çalıştırıp doğrulayın.)
--
-- ---------------------------------------------------------------------------
-- NEDEN BURADA, ARAYÜZDE DEĞİL
-- ---------------------------------------------------------------------------
-- Öğretmen panelinin güvenlik sınırı ARAYÜZDE DEĞİL, iki yerde:
--
--   1. Rol kapısı (server/roles.ts)  -> "burası senin panelin değil" (403)
--   2. RLS politikaları              -> "bu satır senin değil" (satır gelmez)
--
-- Birincisi kaldırılsa veri yine sızmaz; ikincisi kaldırılsa sızar. Bu yüzden
-- asıl testler burada: rol taklit edilip veritabanına doğrudan soruluyor.
-- Tarayıcıdan yapılan bir test, araya giren her katmanın doğru çalışmasına
-- bağlı olduğu için hangi katmanın koruduğunu SÖYLEYEMEZ.
--
-- Arayüz/HTTP tarafı (403'ler, yönlendirmeler) ayrıca elle test edilmeli —
-- yöntemi CLAUDE.md'de "Öğretmen paneli testleri" başlığı altında.
--
-- ---------------------------------------------------------------------------
-- ROL TAKLİDİ NASIL ÇALIŞIYOR
-- ---------------------------------------------------------------------------
-- Supabase'de auth.uid(), request.jwt.claims içindeki `sub` alanını okuyor.
-- set_config ile o alanı ve rolü ayarlamak, PostgREST'ten gelen gerçek bir
-- isteğin gördüğü koşulların aynısını üretiyor. Gerçek bir jeton veya şifre
-- gerekmiyor — RLS jetonu değil, jetonun içindeki kimliği kullanıyor.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE sonuc (no int, test text, beklenen text, alinan text, gecti bool);
-- authenticated rolüne geçtikten sonra da yazabilmek için gerekli; aksi halde
-- test kendi sonucunu kaydedemez (42501).
GRANT INSERT, SELECT ON sonuc TO authenticated;

CREATE TEMP TABLE k (ad text PRIMARY KEY, id uuid);
INSERT INTO k VALUES
  ('ogretmenA','aaaaaaaa-0000-0000-0000-000000000001'),
  ('ogretmenB','bbbbbbbb-0000-0000-0000-000000000002'),
  ('ogrenci1', 'cccccccc-0000-0000-0000-000000000003'),
  ('ogrenci2', 'dddddddd-0000-0000-0000-000000000004');

-- auth.users satırları yalnızca FK'ler için; şifre alanı anlamsız bir değer,
-- çünkü bu testte hiç giriş yapılmıyor.
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
SELECT id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
       ad || '@test.local', 'x', now(), now()
FROM k;

INSERT INTO public.profiles (id, full_name, phone, user_type) VALUES
  ((SELECT id FROM k WHERE ad='ogretmenA'), 'Ogretmen A',  '05550000001', 'teacher'),
  ((SELECT id FROM k WHERE ad='ogretmenB'), 'Ogretmen B',  '05550000002', 'teacher'),
  ((SELECT id FROM k WHERE ad='ogrenci1'),  'Ogrenci Bir', '05550000003', 'student'),
  ((SELECT id FROM k WHERE ad='ogrenci2'),  'Ogrenci Iki', '05550000004', 'student');

CREATE TEMP TABLE d (ad text PRIMARY KEY, id uuid);
INSERT INTO d VALUES ('A1','11111111-0000-0000-0000-000000000001'),
                     ('A2','11111111-0000-0000-0000-000000000002'),
                     ('AIPTAL','11111111-0000-0000-0000-000000000009'),
                     ('B1','22222222-0000-0000-0000-000000000001');

-- A1: A'nin tamamlanmis dersi | A2: A'nin planli dersi
-- AIPTAL: A'nin IPTAL dersi (ogretmen dokunamamali) | B1: B'nin dersi
INSERT INTO public.lessons (id, user_id, teacher_id, subject, starts_at, ends_at, status) VALUES
  ((SELECT id FROM d WHERE ad='A1'), (SELECT id FROM k WHERE ad='ogrenci1'),
   (SELECT id FROM k WHERE ad='ogretmenA'), 'Matematik',
   now() - interval '2 days', now() - interval '2 days' + interval '1 hour', 'completed'),
  ((SELECT id FROM d WHERE ad='A2'), (SELECT id FROM k WHERE ad='ogrenci1'),
   (SELECT id FROM k WHERE ad='ogretmenA'), 'Fizik',
   now() + interval '1 day', now() + interval '1 day' + interval '1 hour', 'scheduled'),
  ((SELECT id FROM d WHERE ad='AIPTAL'), (SELECT id FROM k WHERE ad='ogrenci1'),
   (SELECT id FROM k WHERE ad='ogretmenA'), 'Biyoloji',
   now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'cancelled'),
  ((SELECT id FROM d WHERE ad='B1'), (SELECT id FROM k WHERE ad='ogrenci2'),
   (SELECT id FROM k WHERE ad='ogretmenB'), 'Kimya',
   now() - interval '1 day', now() - interval '1 day' + interval '1 hour', 'completed');

DO $$
DECLARE
  tA uuid; tB uuid; s1 uuid; s2 uuid;
  dA1 uuid; dA2 uuid; dB1 uuid; dIptal uuid;
  n int;
BEGIN
  SELECT id INTO tA  FROM k WHERE ad='ogretmenA';
  SELECT id INTO tB  FROM k WHERE ad='ogretmenB';
  SELECT id INTO s1  FROM k WHERE ad='ogrenci1';
  SELECT id INTO s2  FROM k WHERE ad='ogrenci2';
  SELECT id INTO dA1 FROM d WHERE ad='A1';
  SELECT id INTO dA2 FROM d WHERE ad='A2';
  SELECT id INTO dB1 FROM d WHERE ad='B1';
  SELECT id INTO dIptal FROM d WHERE ad='AIPTAL';

  -- ======================================================== ÖĞRETMEN A GİBİ
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',tA,'role','authenticated')::text, true);

  SELECT count(*) INTO n FROM public.lessons;
  INSERT INTO sonuc VALUES (1,'OgretmenA kac ders goruyor','3 (A1, A2, iptal)', n::text, n=3);

  -- Planin 1. senaryosu: baska ogretmenin programina erisim.
  SELECT count(*) INTO n FROM public.lessons WHERE id = dB1;
  INSERT INTO sonuc VALUES (2,'OgretmenA, OgretmenB dersini goruyor mu','0', n::text, n=0);

  -- profiles_select_as_teacher: erisim ROLE degil DERSE bagli.
  SELECT count(*) INTO n FROM public.profiles WHERE id = s1;
  INSERT INTO sonuc VALUES (3,'OgretmenA kendi ogrencisinin profilini','1', n::text, n=1);

  SELECT count(*) INTO n FROM public.profiles WHERE id = s2;
  INSERT INTO sonuc VALUES (4,'OgretmenA baska ogrencinin profilini','0', n::text, n=0);

  BEGIN
    INSERT INTO public.lesson_comments (lesson_id, teacher_id, comment)
    VALUES (dA1, tA, 'Ilk yorum')
    ON CONFLICT (lesson_id) DO UPDATE SET comment = excluded.comment;
    INSERT INTO sonuc VALUES (5,'OgretmenA kendi dersine yorum','izin','izin', true);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (5,'OgretmenA kendi dersine yorum','izin','RED '||sqlstate, false);
  END;

  -- Planin 1./IDOR senaryosu: baska ogretmenin dersine yorum.
  BEGIN
    INSERT INTO public.lesson_comments (lesson_id, teacher_id, comment)
    VALUES (dB1, tA, 'Izinsiz yorum');
    INSERT INTO sonuc VALUES (6,'OgretmenA, OgretmenB dersine yorum','RED','IZIN VERILDI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (6,'OgretmenA, OgretmenB dersine yorum','RED','RED '||sqlstate, true);
  END;

  -- Planin 4. senaryosu: ayni derse tekrar yorum -> hep TEK satir.
  BEGIN
    INSERT INTO public.lesson_comments (lesson_id, teacher_id, comment)
    VALUES (dA1, tA, 'Ikinci yorum')
    ON CONFLICT (lesson_id) DO UPDATE SET comment = excluded.comment;
  EXCEPTION WHEN others THEN NULL;
  END;

  PERFORM set_config('role','postgres',true);
  SELECT count(*) INTO n FROM public.lesson_comments WHERE lesson_id = dA1;
  INSERT INTO sonuc VALUES (7,'Ayni derse 2 yorum sonrasi satir sayisi','1', n::text, n=1);

  SELECT count(*) INTO n FROM public.lesson_comments WHERE lesson_id = dA1 AND comment='Ikinci yorum';
  INSERT INTO sonuc VALUES (8,'Son yorum ustune yazildi mi','1', n::text, n=1);

  -- ======================================================== ÖĞRETMEN B GİBİ
  PERFORM set_config('role','authenticated',true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub',tB,'role','authenticated')::text, true);

  SELECT count(*) INTO n FROM public.lesson_comments WHERE lesson_id = dA1;
  INSERT INTO sonuc VALUES (9,'OgretmenB, A nin yorumunu goruyor mu','0', n::text, n=0);

  -- ========================================================= ÖĞRENCİ 1 GİBİ
  PERFORM set_config('request.jwt.claims', json_build_object('sub',s1,'role','authenticated')::text, true);

  SELECT count(*) INTO n FROM public.lessons;
  INSERT INTO sonuc VALUES (10,'Ogrenci1 kac ders goruyor','3 (kendi)', n::text, n=3);

  SELECT count(*) INTO n FROM public.lesson_comments WHERE lesson_id = dA1;
  INSERT INTO sonuc VALUES (11,'Ogrenci1 kendi dersinin yorumunu','1', n::text, n=1);

  -- Planin 5. senaryosu: baska ogrencinin lessonId'si.
  SELECT count(*) INTO n FROM public.lesson_comments WHERE lesson_id = dB1;
  INSERT INTO sonuc VALUES (12,'Ogrenci1 baskasinin ders yorumunu','0', n::text, n=0);

  BEGIN
    INSERT INTO public.lesson_comments (lesson_id, teacher_id, comment) VALUES (dA2, s1, 'Ogrenci yazdi');
    INSERT INTO sonuc VALUES (13,'Ogrenci yorum YAZABILIYOR mu','RED','YAZDI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (13,'Ogrenci yorum YAZABILIYOR mu','RED','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lesson_comments SET comment='Ogrenci degistirdi' WHERE lesson_id = dA1;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (14,'Ogrenci yorumu DEGISTIREBILIYOR mu','0 satir', n::text||' satir', n=0);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (14,'Ogrenci yorumu DEGISTIREBILIYOR mu','0 satir','RED '||sqlstate, true);
  END;

  -- Yetki yukseltme: user_type profiles_update_own ile sabitlenmis olmali.
  BEGIN
    UPDATE public.profiles SET user_type='teacher' WHERE id = s1;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (15,'Ogrenci kendini ogretmen yapabiliyor mu','RED', n::text||' satir', n=0);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (15,'Ogrenci kendini ogretmen yapabiliyor mu','RED','RED '||sqlstate, true);
  END;

  -- ================================ DERS DURUMU: "İŞLENDİ" İŞARETLEMESİ
  -- Bu blok iki kısıtı birlikte sınıyor: kolon bazlı GRANT UPDATE (status)
  -- ve lessons_update_status_as_teacher politikası. Politikayı bırakıp kolon
  -- yetkisini kaldırmak (ya da tersi) testlerden BİRİNİ geçirir, hepsini
  -- değil — ikisinin de gerekli olmasının ölçüsü bu.
  PERFORM set_config('request.jwt.claims', json_build_object('sub',tA,'role','authenticated')::text, true);

  BEGIN
    UPDATE public.lessons SET status='completed' WHERE id=dA2;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (17,'OgretmenA kendi dersini isledi yapma','1 satir', n||' satir', n=1);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (17,'OgretmenA kendi dersini isledi yapma','1 satir','RED '||sqlstate, false);
  END;

  BEGIN
    UPDATE public.lessons SET status='scheduled' WHERE id=dA2;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (18,'Geri alma (completed -> scheduled)','1 satir', n||' satir', n=1);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (18,'Geri alma (completed -> scheduled)','1 satir','RED '||sqlstate, false);
  END;

  BEGIN
    UPDATE public.lessons SET status='completed' WHERE id=dB1;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (19,'Baska ogretmenin dersini isaretleme','0 satir', n||' satir', n=0);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (19,'Baska ogretmenin dersini isaretleme','0 satir','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lessons SET status='completed' WHERE id=dIptal;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (20,'Iptal dersi diriltme','0 satir', n||' satir', n=0);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (20,'Iptal dersi diriltme','0 satir','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lessons SET status='cancelled' WHERE id=dA2;
    INSERT INTO sonuc VALUES (21,'Kendi dersini cancelled yapma','RED','GECTI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (21,'Kendi dersini cancelled yapma','RED','RED '||sqlstate, true);
  END;

  -- Kolon yetkisinin islevi: status DISINDAKI her kolon 42501.
  BEGIN
    UPDATE public.lessons SET subject='Ele gecirildi' WHERE id=dA2;
    INSERT INTO sonuc VALUES (22,'subject degistirme','RED','GECTI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (22,'subject degistirme','RED','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lessons SET user_id=tA WHERE id=dA2;
    INSERT INTO sonuc VALUES (23,'user_id degistirme (dersi tasima)','RED','GECTI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (23,'user_id degistirme (dersi tasima)','RED','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lessons SET teacher_id=tA WHERE id=dB1;
    INSERT INTO sonuc VALUES (24,'teacher_id degistirme (ders calma)','RED','GECTI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (24,'teacher_id degistirme (ders calma)','RED','RED '||sqlstate, true);
  END;

  BEGIN
    UPDATE public.lessons SET starts_at=now() WHERE id=dA2;
    INSERT INTO sonuc VALUES (25,'starts_at degistirme','RED','GECTI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (25,'starts_at degistirme','RED','RED '||sqlstate, true);
  END;

  BEGIN
    DELETE FROM public.lessons WHERE id=dA2;
    INSERT INTO sonuc VALUES (26,'Ogretmen ders silme','RED','SILDI!', false);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (26,'Ogretmen ders silme','RED','RED '||sqlstate, true);
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub',s1,'role','authenticated')::text, true);
  BEGIN
    UPDATE public.lessons SET status='completed' WHERE id=dA2;
    GET DIAGNOSTICS n = ROW_COUNT;
    INSERT INTO sonuc VALUES (27,'Ogrenci kendi dersini isledi yapma','0 satir', n||' satir', n=0);
  EXCEPTION WHEN others THEN
    INSERT INTO sonuc VALUES (27,'Ogrenci kendi dersini isledi yapma','0 satir','RED '||sqlstate, true);
  END;

  -- ========================================================= ÖĞRENCİ 2 GİBİ
  PERFORM set_config('request.jwt.claims', json_build_object('sub',s2,'role','authenticated')::text, true);

  SELECT count(*) INTO n FROM public.profiles;
  INSERT INTO sonuc VALUES (16,'Ogrenci2 kac profil goruyor','1 (kendi)', n::text, n=1);

  PERFORM set_config('role','postgres',true);
END $$;

SELECT no, test, beklenen, alinan,
       CASE WHEN gecti THEN 'GECTI' ELSE 'KALDI' END AS durum
FROM sonuc ORDER BY no;

-- KALICI DEĞİŞİKLİK YOK. Bu satırı COMMIT ile değiştirmeyin — test verisi
-- canlı veritabanında kalır ve 05550000xx numaralı sahte profiller oluşur.
ROLLBACK;
