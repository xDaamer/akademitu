import express from "express";
import { userClient } from "../supabase.js";
import { readAccessToken } from "../cookies.js";
import { auditLog } from "../audit.js";

/*
 * PANEL VERİSİ — /api/portal/*
 * ===========================================================================
 * Lead route'larından AYRI bir modül ve ayrı bir yetki modeli, bilerek:
 *
 *   /api/leads   -> ortada giriş yapmış kimse yok; sunucu servis rolüyle
 *                   yazıyor, yetkilendirmeyi kendisi yapıyor.
 *   /api/portal  -> veri KULLANICIYA AİT. Her istek çerezdeki jetonla
 *                   kurulan bir istemci kullanıyor (userClient), yani
 *                   sorgular RLS altında "yalnızca kendi satırın" kuralıyla
 *                   çalışıyor. Buradaki bir route hatası bile başkasının
 *                   verisini açamaz — servis rolü kullanılsaydı açardı.
 *
 * Bu yüzden bu dosyada serviceClient() ÇAĞRILMAZ. Çağrılırsa katmanın
 * güvenlik değeri sıfırlanır.
 */

const router = express.Router();

const GENERIC_ERROR = "Panel verileri alınamadı. Lütfen tekrar deneyin.";

/**
 * Oturum zorunluluğu. Jeton yoksa/geçersizse 401 — istemci bunu görünce
 * bir kez /api/auth/refresh deneyip tekrar sorar (bkz. src/lib/api.ts).
 */
function requireSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = readAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: "Oturum bulunamadı." });
  }
  res.locals.accessToken = token;
  next();
}

router.use(requireSession);

/*
 * Panelin ihtiyacı olan her şey TEK istekte dönüyor.
 * Dört ayrı uç olsaydı sayfa açılışında dört tur atılır, dördünde de ayrı ayrı
 * jeton doğrulanır ve dördü ayrı ayrı 401 olup ayrı ayrı yenileme tetikleyebilirdi.
 */
router.get("/ozet", async (req, res) => {
  const supabase = userClient(res.locals.accessToken as string);
  if (!supabase) {
    return res.status(503).json({ success: false, error: GENERIC_ERROR });
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return res.status(401).json({ success: false, error: "Oturum geçersiz." });
    }

    /*
     * Denetim kaydı (bkz. server/audit.ts). Panelin tek veri ucu burası
     * olduğu için bu satır "kullanıcı ödemelerine/derslerine baktı" demek.
     * Kılavuzun VIEW_PAYMENTS'ının karşılığı; ayrı bir ödeme ucu olmadığı
     * için olay da tek.
     *
     * Kimlik doğrulandıktan SONRA yazılıyor: 401 dönen bir istek bir
     * görüntüleme değildir, onu kaydetmek log'u gürültüyle doldururdu.
     * Beklenmiyor — panelin açılış hızını denetim kaydı belirlemesin.
     */
    auditLog(req, "VIEW_PORTAL_SUMMARY", { userId: userData.user.id });

    /*
     * Sorgularda `user_id` filtresi YOK — gerekmiyor, RLS zaten kullanıcının
     * kendi satırlarından başkasını döndürmüyor. Filtreyi elle eklemek,
     * güvenliğin oradan geldiği izlenimi verirdi; gelmiyor, politikadan
     * geliyor.
     *
     * Dört sorgu paralel: birbirini beklemelerinin sebebi yok.
     */
    const simdi = new Date();
    const haftaSonu = new Date(simdi.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [dersler, denemeler, odemeler, notlar] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, subject, teacher_name, starts_at, kind")
        .gte("starts_at", simdi.toISOString())
        .lte("starts_at", haftaSonu.toISOString())
        .order("starts_at", { ascending: true }),
      supabase
        .from("exam_results")
        .select("id, title, net, taken_on")
        .order("taken_on", { ascending: true })
        // Grafik son 8 denemeyi gösteriyor; tamamını çekmenin anlamı yok.
        .limit(8),
      supabase
        .from("payments")
        .select("id, period, amount, currency, status, due_on")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("coach_notes")
        .select("id, author_name, body, written_on")
        .order("written_on", { ascending: false })
        .limit(1),
    ]);

    const hata = dersler.error || denemeler.error || odemeler.error || notlar.error;
    if (hata) {
      console.error("[Portal] özet sorgusu başarısız:", hata.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    return res.json({
      success: true,
      lessons: dersler.data ?? [],
      examResults: denemeler.data ?? [],
      payments: odemeler.data ?? [],
      coachNote: notlar.data?.[0] ?? null,
    });
  } catch (err: any) {
    console.error("[Portal] özet istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

export default router;
