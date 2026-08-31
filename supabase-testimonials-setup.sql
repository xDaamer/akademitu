-- SUPABASE SQL: Testimonials (Yorumlar) Tablosu Oluşturma
-- Aşağıdaki kodu Supabase SQL Editor'ünde çalıştırın
--
-- GÜVENLİK NOTU: Bu dosyadaki anon SELECT / "authenticated all operations"
-- policy'leri artık KULLANILMIYOR. Yorumlar tarayıcıdan değil, server'ın
-- GET /api/testimonials rotası üzerinden (service_role ile) okunuyor.
-- Bu tabloyu ilk kez oluşturuyorsanız aşağıdaki CREATE TABLE/INSERT
-- kısımlarını çalıştırdıktan sonra mutlaka supabase-security-lockdown.sql
-- dosyasını da çalıştırın; o dosya anon/authenticated rollerinin bu
-- tablo üzerindeki TÜM izinlerini kaldırır (RLS + REVOKE).

CREATE TABLE public.testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  student_name TEXT NOT NULL,
  student_grade TEXT,
  content TEXT NOT NULL,
  rating INT DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_published BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0
);

-- Row Level Security Aktif Et
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- ARTIK ÇALIŞTIRMAYIN: aşağıdaki iki policy, tarayıcının Supabase'e
-- doğrudan (anon key ile) bağlandığı eski mimariden kalmadır. Okuma artık
-- sunucu üzerinden (service_role ile) yapıldığı için anon/authenticated
-- rollerine hiçbir policy verilmiyor — supabase-security-lockdown.sql bu
-- policy'leri zaten kaldırır.
--
-- CREATE POLICY "Allow public read published testimonials" ON public.testimonials
--   FOR SELECT TO anon USING (is_published = true);
--
-- CREATE POLICY "Allow authenticated all operations" ON public.testimonials
--   FOR ALL USING (auth.role() = 'authenticated');

-- Örnek Veriler Ekle
INSERT INTO public.testimonials (student_name, student_grade, content, rating, display_order) VALUES
('Ayşe Yıldız', '12. Sınıf', 'AkademITU sayesinde matematik konularını çok iyi anladım. Hocalar çok ilgi gösteriyor.', 5, 1),
('Mehmet Demir', 'LGS Hazırlık', 'Özel ders paketiyle hedefime ulaştım. Tavsiye ederim!', 5, 2),
('Zeynep Kaya', '11. Sınıf', 'Koçluk programı sayesinde çalışma metodumu buldum. Başarısı kat kat arttı.', 5, 3),
('Ali Şahin', 'YKS Hazırlık', 'Hocaların deneyimi ve sabırları takdire değer. Pil zamanımda böyle bir destek arıyordum.', 5, 4),
('Emine Çelik', '10. Sınıf', 'Haftalık revizyon ve planlama toplantıları bana çok yardımcı oluyor.', 5, 5);

-- İsteğe bağlı: Display Order'a göre index oluştur (performans için)
CREATE INDEX idx_testimonials_published_order ON public.testimonials(is_published, display_order);
