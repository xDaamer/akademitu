import express from "express";
import { userClient } from "../supabase.js";
import { auditLog } from "../audit.js";
import { requireSession, requireUserType, type SessionLocals } from "../roles.js";

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

/*
 * Oturum ve rol kontrolü ORTAK MODÜLDE (server/roles.ts): jetonu okuma,
 * kullanıcıyı çözme ve profiles'tan rolü yükleme işini /api/teacher ile
 * paylaşıyoruz.
 *
 * `student` KİLİDİ: bu uç öğrenci verisi döndürüyor. Bir öğretmen buraya
 * geldiğinde zaten boş liste alırdı (RLS onun user_id'siyle eşleşen satır
 * bulamaz), ama boş liste "veri yok" demek — oysa doğru cevap "burası senin
 * panelin değil". 403 bunu söylüyor.
 */
router.use(requireSession);
router.use(requireUserType("student"));

/*
 * Panelin ihtiyacı olan her şey TEK istekte dönüyor.
 * Dört ayrı uç olsaydı sayfa açılışında dört tur atılır, dördünde de ayrı ayrı
 * jeton doğrulanır ve dördü ayrı ayrı 401 olup ayrı ayrı yenileme tetikleyebilirdi.
 */
router.get("/ozet", async (req, res) => {
  const { accessToken, userId } = res.locals as unknown as SessionLocals;

  const supabase = userClient(accessToken);
  if (!supabase) {
    return res.status(503).json({ success: false, error: GENERIC_ERROR });
  }

  try {
    /*
     * auth.getUser() BURADA ARTIK ÇAĞRILMIYOR: requireSession onu bir kez
     * çağırıp sonucu res.locals'a koydu (bkz. server/roles.ts). İkinci kez
     * çağırmak her panel açılışına fazladan bir Supabase Auth turu eklerdi.
     *
     * Denetim kaydı (bkz. server/audit.ts). Panelin tek veri ucu burası
     * olduğu için bu satır "kullanıcı ödemelerine/derslerine baktı" demek.
     * Kılavuzun VIEW_PAYMENTS'ının karşılığı; ayrı bir ödeme ucu olmadığı
     * için olay da tek.
     *
     * Kimlik doğrulandıktan SONRA yazılıyor: 401 dönen bir istek bir
     * görüntüleme değildir, onu kaydetmek log'u gürültüyle doldururdu.
     * Beklenmiyor — panelin açılış hızını denetim kaydı belirlemesin.
     */
    auditLog(req, "VIEW_PORTAL_SUMMARY", { userId });

    /*
     * exam_results / payments / coach_notes'ta `user_id` filtresi YOK —
     * gerekmiyor, o üç tabloda tek bir SELECT politikası var ve o da
     * "user_id = auth.uid()" diyor. Filtreyi elle eklemek, güvenliğin oradan
     * geldiği izlenimi verirdi; gelmiyor, politikadan geliyor.
     *
     * lessons İSTİSNA VE FİLTRESİ VAR — sebebi öğretmen panelinin eklenmesi:
     * o tabloda artık İKİ SELECT politikası duruyor (lessons_select_own ve
     * lessons_select_as_teacher) ve politikalar OR'lanıyor. Yani RLS'in
     * açtığı küme "benim derslerim VEYA benim verdiğim dersler". Öğrenci
     * paneli bunlardan yalnızca ilkini soruyor. Filtresiz bırakılırsa, bir
     * veri girişi hatasıyla bu kullanıcının kimliği bir dersin teacher_id'sine
     * yazılmış olsaydı o ders öğrencinin "bu hafta" listesinde belirirdi.
     * RLS hâlâ başkasının verisini vermiyor; filtre, DOĞRU SORUYU sormak için.
     *
     * Dört sorgu paralel: birbirini beklemelerinin sebebi yok.
     */
    const simdi = new Date();
    const haftaSonu = new Date(simdi.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [dersler, denemeler, odemeler, notlar] = await Promise.all([
      supabase
        .from("lessons")
        .select("id, subject, teacher_name, starts_at, kind")
        .eq("user_id", userId)
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

/**
 * DERS YORUMLARI — GET /api/portal/yorumlar
 *
 * Öğrencinin tamamlanmış derslerini ve varsa öğretmen yorumlarını döndürür.
 *
 * AYRI BİR SAYFA, /ozet'e EKLENMİYOR: özet "bu hafta ne var" sorusunu tek
 * ekranda cevaplıyor ve dördü de kısa. Yorum listesi zamanla uzayan bir
 * geçmiş; özete koymak panelin ana ekranını dönem sonunda kullanılmaz hâle
 * getirirdi.
 *
 * `/api/student/...` DEĞİL: bu projede öğrenci verisinin ad alanı zaten
 * /api/portal. İkinci bir ad alanı açmak aynı rol için iki kapı demekti.
 *
 * coach_notes İLE KARIŞTIRMAYIN: o, öğrenci başına genel koç notu ve panelin
 * "Koçun Notu" bölümünde duruyor. Burası DERSE bağlı yorumlar.
 */
router.get("/yorumlar", async (_req, res) => {
  const { accessToken, userId } = res.locals as unknown as SessionLocals;

  const supabase = userClient(accessToken);
  if (!supabase) {
    return res.status(503).json({ success: false, error: GENERIC_ERROR });
  }

  try {
    /*
     * `.eq("user_id", userId)` — /ozet'teki lessons sorgusuyla aynı gerekçe:
     * lessons'ta iki SELECT politikası OR'lanıyor, filtresiz sorgu "benim
     * derslerim"den fazlasını sorar.
     *
     * Yalnızca 'completed': yorum zaten yalnızca tamamlanmış derse
     * yazılabiliyor (bkz. server/routes/teacher.ts). Planlanmış dersleri de
     * listelemek, öğrenciye henüz olmamış bir şey için "yorum yok" demek
     * olurdu.
     */
    const { data: dersler, error: derslerHatasi } = await supabase
      .from("lessons")
      .select("id, subject, teacher_name, starts_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("starts_at", { ascending: false })
      .limit(100);

    if (derslerHatasi) {
      console.error("[Portal] yorum listesi sorgusu başarısız:", derslerHatasi.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    const dersIdleri = (dersler ?? []).map((d) => d.id);
    const yorumlar = new Map<string, { text: string; updatedAt: string }>();

    if (dersIdleri.length > 0) {
      /*
       * Yorumlar ayrı sorguda: lesson_comments.lesson_id -> lessons.id
       * ilişkisi PostgREST'te gömülebilir olsa da, RLS'in iki tabloda ayrı
       * ayrı çalıştığını burada açıkça görmek daha iyi. Öğrencinin bu
       * satırlara erişimi lesson_comments_select_as_student politikasından
       * geliyor: "dersin user_id'si benim" — başka öğrencinin ders kimliğini
       * denemek boş sonuç döndürür.
       */
      const { data: yorumSatirlari, error: yorumHatasi } = await supabase
        .from("lesson_comments")
        .select("lesson_id, comment, updated_at")
        .in("lesson_id", dersIdleri);

      if (yorumHatasi) {
        console.error("[Portal] yorumlar okunamadı:", yorumHatasi.message);
        return res.status(502).json({ success: false, error: GENERIC_ERROR });
      }

      for (const y of yorumSatirlari ?? []) {
        yorumlar.set(y.lesson_id, { text: y.comment, updatedAt: y.updated_at });
      }
    }

    return res.json({
      success: true,
      lessons: (dersler ?? []).map((d) => ({
        id: d.id,
        subject: d.subject,
        teacherName: d.teacher_name,
        startsAt: d.starts_at,
        /* null: ders bitmiş ama öğretmen henüz yorum yazmamış. Arayüz bunu
           "henüz yorum eklenmedi" diye gösteriyor — boş bir kart yerine. */
        comment: yorumlar.get(d.id) ?? null,
      })),
    });
  } catch (err: any) {
    console.error("[Portal] yorum listesi istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

export default router;
