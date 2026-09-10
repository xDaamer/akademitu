import type { Request, Response, NextFunction } from "express";
import { serviceClient } from "./supabase.js";

/*
 * CSRF: ORIGIN KONTROLÜ
 * ===========================================================================
 * Çerez tabanlı oturuma geçtiğimiz an CSRF gerçek bir risk oluyor: tarayıcı
 * çerezi kendiliğinden gönderdiği için, başka bir sitedeki form bizim
 * /api/auth/* uçlarımıza kullanıcının oturumuyla istek attırabilir.
 *
 * server.ts'teki mevcut ALLOWED_ORIGINS kontrolü BUNU KARŞILAMIYOR: yalnızca
 * `Origin` başlığı VARSA bakıyor, yoksa isteği geçiriyor — yani başlığı hiç
 * göndermeyen bir istemci kontrolü tamamen atlıyor.
 *
 * Buradaki kural bunun tersi: durum değiştiren isteklerde `Origin` ZORUNLU.
 * Bu güvenli, çünkü tarayıcılar POST/PUT/PATCH/DELETE isteklerinde `Origin`
 * başlığını her zaman gönderir (aynı kaynaklı olanlarda bile) — Fetch
 * standardının gereği. Başlığı olmayan bir POST tarayıcıdan gelmiyor demektir.
 *
 * Çift gönderimli (double-submit) token EKLENMEDİ: sameSite=lax + zorunlu
 * Origin kontrolü aynı korumayı veriyor ve token'ı istemciye taşımak,
 * saklamak ve her istekte başlığa koymak fazladan kırılgan bir parça olurdu.
 * Tek eksiği alt alan adı devralma senaryosu; sitenin başka alt alan adı yok.
 */
export function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
  if (!isMutation) return next();

  const origin = req.get("origin");
  if (!origin) {
    return res.status(403).json({ success: false, error: "Geçersiz istek kaynağı." });
  }

  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  /*
   * ALLOWED_ORIGINS tanımlı değilse isteğin kendi host'una düşülür: yerel
   * geliştirmede (localhost:3000) ve tek alan adlı dağıtımda doğru davranış
   * budur. Liste tanımlıysa yalnızca listedekiler kabul edilir.
   */
  const sameOrigin = `${req.protocol}://${req.get("host")}`;
  const trusted = allowed.length > 0 ? allowed : [sameOrigin];

  if (!trusted.includes(origin)) {
    return res.status(403).json({ success: false, error: "Geçersiz istek kaynağı." });
  }

  next();
}

/*
 * HIZ SINIRI — VERİTABANI TABANLI
 * ===========================================================================
 * server.ts'teki mevcut sınırlayıcı bellek içi bir Map ve Vercel'de İŞE
 * YARAMIYOR: her serverless örneği kendi belleğine sahip, saldırgan yeni bir
 * örneğe düştüğü an sayaç sıfırdan başlıyor (ayrıca Map hiç budanmıyor).
 * Şifre denemesi için bu kabul edilemez, o yüzden sayaç Postgres'te.
 *
 * Sayaç servis rolüyle yazılır: henüz giriş yapmamış birinin isteğini
 * sayıyoruz, ortada kullanıcı oturumu yok. Tablonun anon/authenticated'a
 * hiçbir yetkisi yok (bkz. supabase-portal-auth.sql).
 */
type Limit = { windowSeconds: number; max: number };

const LIMITS: Record<string, Limit> = {
  login: { windowSeconds: 15 * 60, max: 10 },
  signup: { windowSeconds: 60 * 60, max: 5 },
  /* Lead formu: normal bir kişi bir oturumda bir kez, en fazla birkaç kez
     gönderir. 10 dakikada 5, gerçek kullanıcıyı hiç zorlamayacak kadar geniş
     ama bot için dar. */
  lead: { windowSeconds: 10 * 60, max: 5 },
};

function clientIp(req: Request): string {
  // server.ts'te app.set("trust proxy", 1) var, req.ip X-Forwarded-For'u yansıtır.
  return req.ip || "unknown";
}

/**
 * Sınır aşıldıysa true döner ve yanıtı kendisi yazar.
 * Veritabanına ulaşılamazsa isteği GEÇİRİR (fail-open): sayaç yüzünden
 * girişin tamamen kapanması, sınırın gevşemesinden daha kötü bir arıza.
 */
export async function isRateLimited(
  req: Request,
  res: Response,
  kind: keyof typeof LIMITS,
): Promise<boolean> {
  const supabase = serviceClient();
  if (!supabase) return false;

  const limit = LIMITS[kind];
  const since = new Date(Date.now() - limit.windowSeconds * 1000).toISOString();
  const ip = clientIp(req);

  try {
    const { count, error } = await supabase
      .from("auth_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("kind", kind)
      .gt("created_at", since);

    if (error) {
      console.error("[Auth] hız limiti okunamadı:", error.message);
      return false;
    }

    if ((count ?? 0) >= limit.max) {
      res.setHeader("Retry-After", String(limit.windowSeconds));
      res.status(429).json({
        success: false,
        error: "Çok fazla deneme yapıldı. Lütfen bir süre sonra tekrar deneyin.",
      });
      return true;
    }
  } catch (err: any) {
    console.error("[Auth] hız limiti istisnası:", err?.message || err);
    return false;
  }

  return false;
}

/**
 * Denemeyi kaydeder ve satırın id'sini döndürür (sonuç sonradan
 * markAttemptResult ile işlenebilsin diye). Başarısız olsa da isteği bozmaz.
 *
 * Kayıt SONUÇTAN ÖNCE atılıyor, bilerek: hız limiti mevcut satırları sayarak
 * karar veriyor, dolayısıyla deneme ancak yazıldıktan sonra sayılır. Sonuç
 * beklenip tek yazma yapılsaydı, aynı anda gönderilen bir istek yığını kontrol
 * ile kayıt arasındaki boşluktan toplu hâlde sızabilirdi.
 *
 * `phone` kayıtlı olmak zorunda değil — başarısız denemeler de raporlanmalı.
 * ŞİFRE KAYDEDİLMEZ: bkz. supabase-portal-auth.sql'deki gerekçe.
 */
export async function recordAttempt(
  req: Request,
  kind: keyof typeof LIMITS,
  phone?: string,
): Promise<number | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("auth_attempts")
      .insert({ ip: clientIp(req), kind, phone: phone ?? null })
      .select("id")
      .single();

    if (error) {
      console.error("[Auth] deneme kaydedilemedi:", error.message);
    } else {
      void pruneOldAttempts(supabase);
      return (data?.id as number) ?? null;
    }
  } catch (err: any) {
    console.error("[Auth] deneme kaydedilemedi:", err?.message || err);
  }

  return null;
}

/**
 * Denemenin sonucunu işler. recordAttempt'in döndürdüğü id ile çağrılır.
 * Sessizce başarısız olur — raporlama, girişin kendisini bozmamalı.
 */
export async function markAttemptResult(id: number | null, success: boolean) {
  if (id === null) return;

  const supabase = serviceClient();
  if (!supabase) return;

  try {
    await supabase.from("auth_attempts").update({ success }).eq("id", id);
  } catch (err: any) {
    console.error("[Auth] deneme sonucu işlenemedi:", err?.message || err);
  }
}

/*
 * FIRSATÇI TEMİZLİK
 * ---------------------------------------------------------------------------
 * Tablo sınırsız büyümesin diye eski satırlar siliniyor. Normalde bu iş
 * pg_cron'a verilirdi, ama bu projede pg_cron KURULU DEĞİL (kontrol edildi),
 * yani supabase-portal-auth.sql'deki cron bloğu sessizce atlanmış durumda ve
 * tablo hiçbir zaman temizlenmiyordu.
 *
 * Her istekte silmek gereksiz bir yazma daha demek; ~%2 olasılıkla çalıştırmak
 * yeterli — trafik arttıkça temizlik de sıklaşıyor. Beklenmiyor (void):
 * temizlik gecikmesi kullanıcıyı bekletmemeli.
 *
 * SAKLAMA SÜRESİ 30 GÜN: sayacın 24 saatten eskisine ihtiyacı yok ama rapor
 * için biraz geçmiş gerekiyor. Süresiz saklamak, IP ve telefon içeren bir
 * tabloda gereksiz bir sorumluluk olurdu.
 */
const SAKLAMA_GUNU = 30;

async function pruneOldAttempts(supabase: NonNullable<ReturnType<typeof serviceClient>>) {
  if (Math.random() >= 0.02) return;

  const cutoff = new Date(Date.now() - SAKLAMA_GUNU * 24 * 60 * 60 * 1000).toISOString();
  try {
    await supabase.from("auth_attempts").delete().lt("created_at", cutoff);
  } catch (err: any) {
    console.error("[Auth] eski denemeler temizlenemedi:", err?.message || err);
  }
}
