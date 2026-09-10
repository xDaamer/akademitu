import type { Request } from "express";
import { serviceClient } from "./supabase.js";

/*
 * DENETİM KAYDI
 * ============================================================================
 * "Kim, ne zaman, nereden, hangi işlemi yaptı." Tablo tanımı ve gerekçesi
 * supabase-audit-log.sql'de — o dosyayı Supabase SQL Editor'de bir kez
 * çalıştırmadan buradaki yazmalar sessizce başarısız olur (ve olmalıdır:
 * log yazamamak isteği bozmamalı).
 *
 * NEDEN winston/dosya DEĞİL: Vercel'de serverless fonksiyonun dosya sistemi
 * geçici ve her örnek ayrı. Diske yazılan bir audit.log, isteği karşılayan
 * örnekle birlikte kaybolur. Kalıcı tek yer zaten kullandığımız Postgres.
 *
 * SERVİS ROLÜ İLE YAZILIR — bilerek: kullanıcının kendi jetonuyla yazılsaydı,
 * kullanıcının kendi denetim kaydına yazma (dolayısıyla RLS'i esnetince
 * okuma/silme) yetkisi olurdu. Denetim kaydının değeri, konusu olan kişinin
 * ona dokunamamasıdır.
 *
 * HASSAS VERİ YAZILMAZ: şifre, jeton, çerez, ödeme detayı. Bkz. SQL dosyası.
 */

/*
 * BAŞARISIZ GİRİŞ BURAYA YAZILMAZ — zaten public.auth_attempts'te.
 * ---------------------------------------------------------------------------
 * Her giriş denemesi (başarılı/başarısız) IP, telefon ve sonuçla birlikte
 * oraya kaydediliyor (bkz. server/security.ts: recordAttempt +
 * markAttemptResult). Aynı olayı ikinci bir tabloya da yazmak, her başarısız
 * denemede fazladan bir yazma ve iki ayrı yerde tutulan iki ayrı "gerçek"
 * demek olurdu. "Şu numaraya kaç kez yanlış şifreyle girilmeye çalışıldı"
 * sorusu auth_attempts'e sorulur.
 *
 * Buradaki olaylar auth_attempts'in CEVAPLAYAMADIKLARI: hangi KULLANICI
 * (user_id) oturum açtı/kapattı ve kendi verisini ne zaman görüntüledi.
 */
export type AuditAction = "LOGIN_SUCCESS" | "LOGOUT" | "VIEW_PORTAL_SUMMARY";

function clientIp(req: Request): string {
  /* server.ts'te app.set("trust proxy", 1) var; req.ip X-Forwarded-For'u yansıtır. */
  return req.ip || "unknown";
}

/**
 * Olayı kaydeder. BEKLENMEZ (fire-and-forget) — çağıran taraf `void` ile
 * çağırır: denetim kaydı yazmak kullanıcıyı bekletmemeli ve yazılamaması
 * isteği başarısız etmemeli. Hatalar yalnızca sunucu log'una düşer.
 */
export function auditLog(
  req: Request,
  action: AuditAction,
  options: { userId?: string | null; detay?: Record<string, unknown> } = {},
): void {
  const supabase = serviceClient();
  if (!supabase) return;

  const row = {
    user_id: options.userId ?? null,
    action,
    ip: clientIp(req),
    /* Hangi alan adından geldiği: akademitu.com mı portal.akademitu.com mı.
       İki host'lu kurulumda "giriş nereden yapıldı" sorusunun tek cevabı. */
    host: (req.get("host") || "").split(":")[0].toLowerCase() || null,
    detay: options.detay ?? null,
  };

  void (async () => {
    try {
      const { error } = await supabase.from("audit_log").insert(row);
      if (error) {
        console.error("[Audit] kayıt yazılamadı:", error.message, action);
        return;
      }
      void pruneAuditLog();
    } catch (err: any) {
      console.error("[Audit] kayıt istisnası:", err?.message || err, action);
    }
  })();
}

/*
 * FIRSATÇI TEMİZLİK — auth_attempts'teki desenin aynısı ve aynı gerekçeyle:
 * pg_cron bu projede kurulu değil, o yüzden zamanlanmış bir iş yerine
 * yazmaların küçük bir kısmında temizlik tetikleniyor.
 *
 * Olasılık %2 değil %0,5: denetim kaydı auth_attempts'ten daha sık yazılıyor
 * (her panel açılışı bir satır) ve saklama süresi 6 kat uzun, yani temizliğin
 * bu kadar sık koşmasına gerek yok.
 */
async function pruneAuditLog(): Promise<void> {
  if (Math.random() >= 0.005) return;

  const supabase = serviceClient();
  if (!supabase) return;

  try {
    /* Silme kuralının tek tanımı SQL tarafında (prune_audit_log); süre iki
       yerde ayrı ayrı yazılırsa biri güncellenip diğeri unutulur. */
    const { error } = await supabase.rpc("prune_audit_log");
    if (error) console.error("[Audit] eski kayıtlar temizlenemedi:", error.message);
  } catch (err: any) {
    console.error("[Audit] temizlik istisnası:", err?.message || err);
  }
}
