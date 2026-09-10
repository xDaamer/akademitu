-- =============================================================================
-- DENETİM KAYDI (audit_log)
-- =============================================================================
-- UYGULANDI: 2026-09-10, "akademITU Database" projesine (ccgqhzuleodwnjbfbjrg)
-- `create_audit_log` adlı migration olarak. Tekrar çalıştırmak zararsız —
-- tamamı IF NOT EXISTS / OR REPLACE. Yeni bir ortam kurarken (ör. ikinci bir
-- Supabase projesi) bu dosyayı SQL Editor'de bir kez çalıştırın.
--
-- NEDEN AYRI BİR TABLO (auth_attempts VARKEN):
-- ---------------------------------------------------------------------------
-- public.auth_attempts bir HIZ LİMİTİ SAYACIDIR. Anahtarı IP + kind, ve
-- sorgusu "son N dakikada kaç satır" — yani sık yazılan, sık okunan, kısa
-- ömürlü bir tablo. Denetim kaydının sorusu ise bambaşka: "şu KULLANICI ne
-- zaman ne yaptı". İkisini aynı tabloya sıkıştırmak, hız limiti sorgusunun
-- panel görüntüleme satırlarını da taramasına yol açardı ve saklama süreleri
-- de farklı (sayaç 30 gün, denetim 180).
--
-- NE YAZILIR, NE YAZILMAZ:
-- ---------------------------------------------------------------------------
-- Yazılır  : kim (user_id), ne (action), nereden (ip), hangi host, ne zaman.
-- YAZILMAZ : şifre, oturum jetonu, çerez, tam kart numarası, ödeme tutarı.
--            Denetim kaydının işi "kim ne yaptı"yı tespit etmek; içeriği
--            kopyalamak değil. Sızan bir log, sızan bir veritabanıdır.
--
-- ERİŞİM: anon ve authenticated rollerine HİÇBİR yetki verilmez. Tabloya
-- yalnızca servis rolü (RLS'i baypas eder) yazar. Bu, projedeki
-- leads/auth_attempts ile aynı desendir — RLS açık, politika yok, grant yok:
-- yani PostgREST üzerinden kimse ulaşamaz. Supabase güvenlik danışmanının
-- "RLS enabled, no policy" uyarısı bu tablo için de BEKLENEN durumdur.

create table if not exists public.audit_log (
  id          bigserial primary key,
  -- Başarısız girişte kullanıcı bilinmez; o yüzden null olabilir.
  -- on delete set null: hesap silinse de olayın kendisi kaybolmamalı
  -- (KVKK açısından da doğrusu bu: kayıt anonimleşir, silinmez).
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  ip          text,
  -- Hangi alan adından geldiği: akademitu.com mı portal.akademitu.com mı.
  -- İki host'lu kuruluma geçtikten sonra "giriş nereden yapıldı" sorusunun
  -- cevabı yalnızca burada.
  host        text,
  -- Olaya özel serbest alan (ör. başarısız girişte denenen telefon).
  -- Hassas veri KOYULMAZ.
  detay       jsonb,
  created_at  timestamptz not null default now()
);

-- "Bu kullanıcının son hareketleri" sorgusu için.
create index if not exists audit_log_user_idx
  on public.audit_log (user_id, created_at desc);

-- Temizlik ve "şu tarihte ne oldu" sorgusu için.
create index if not exists audit_log_created_idx
  on public.audit_log (created_at desc);

-- RLS açık ama politika YOK: hiçbir istemci rolü satır göremez/yazamaz.
alter table public.audit_log enable row level security;

-- Olur da daha önce verilmiş bir yetki varsa geri alınır.
revoke all on public.audit_log from anon, authenticated;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

-- =============================================================================
-- SAKLAMA SÜRESİ
-- =============================================================================
-- 180 gün. Süresiz saklamak, IP içeren bir tabloda gereksiz bir sorumluluk
-- olurdu (KVKK: veri saklama süresi belirlenmiş olmalı); çok kısa tutmak ise
-- bir olayı geriye dönük inceleme imkânını yok eder.
--
-- pg_cron BU PROJEDE KURULU DEĞİL (kontrol edildi) — bu yüzden temizlik
-- uygulama tarafında, fırsatçı olarak yapılıyor (bkz. server/audit.ts).
-- Aşağıdaki fonksiyon o temizliğin tek tanımı; pg_cron ileride kurulursa
-- doğrudan bu fonksiyon zamanlanabilir.
create or replace function public.prune_audit_log()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.audit_log
  where created_at < now() - interval '180 days';
$$;

revoke all on function public.prune_audit_log() from public, anon, authenticated;
