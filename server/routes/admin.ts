import express from "express";
import { serviceClient } from "../supabase.js";
import { auditLog } from "../audit.js";
import { requireSession, requireUserType, type SessionLocals } from "../roles.js";

/*
 * YÖNETİM PANELİ — /api/admin/*
 * ===========================================================================
 * Hesap açma, ders atama, ücret girme. Bu ucları yalnızca user_type='admin'
 * olan kullanıcı görebiliyor.
 *
 * ---------------------------------------------------------------------------
 * BU MODÜL serviceClient() KULLANIYOR — VE BU, KURALIN İHLALİ DEĞİL İSTİSNASI
 * ---------------------------------------------------------------------------
 * portal.ts ve teacher.ts bilerek serviceClient() ÇAĞIRMIYOR; oradaki mantık
 * şu: veri kullanıcıya ait, dolayısıyla route'ta bir yetkilendirme hatası
 * olsa bile RLS "bu satır senin değil" diyerek emniyet ağı görevi görsün.
 *
 * Yönetim panelinde o ağın koruyacağı bir şey yok. Adminin meşru kapsamı
 * ZATEN her satır: bütün öğrencileri listelemek, herkese ders atamak,
 * herkesin ücretini girmek işin tanımı. "Başkasının satırı" diye bir kategori
 * olmadığı için RLS'in burada eleyeceği bir şey de yok.
 *
 * Ayrıca hesap açmanın BAŞKA YOLU YOK: auth.users'a şifre yazmak Supabase
 * Admin API'sini gerektiriyor (auth.admin.createUser) ve o da servis rolüyle
 * çalışıyor. Tabloya elle INSERT etmek — bcrypt'i elle üretip auth.identities
 * satırını da doğru kurmak — sürüme duyarlı ve sessizce bozulabilen bir iş;
 * eksik bir identities satırı "hesap açıldı ama giriş yapamıyor" olarak
 * ortaya çıkar. Dashboard'un kendi kullandığı yolu kullanıyoruz.
 *
 * DOLAYISIYLA BURADA SINIR ROUTE'UN KENDİSİ:
 *
 *   requireSession      -> oturumu çözer, rolü profiles'tan KULLANICININ
 *                          KENDİ jetonuyla okur (server/roles.ts)
 *   requireUserType     -> admin değilse 403
 *
 * Rol her istekte veritabanından yeniden okunuyor ve kullanıcı kendi
 * user_type'ını değiştiremiyor (profiles_update_own onu sabitliyor), yani
 * "kendini admin yapıp buraya gelmek" mümkün değil.
 *
 * KAYIP EMNİYET AĞININ KARŞILIĞI: her yazma denetim kaydına giriyor. Kim,
 * ne zaman, hangi hesabı açtı / hangi dersi sildi — servis rolüyle yapılan
 * bir işin geriye dönük tek cevabı bu (bkz. server/audit.ts).
 *
 * BU DOSYAYA YENİ BİR UÇ EKLERKEN: sorgunun WHERE'ini unutmak burada
 * RLS tarafından yakalanmaz. Servis rolü filtresiz bir UPDATE'i olduğu gibi
 * uygular.
 */

const router = express.Router();

router.use(requireSession);
router.use(requireUserType("admin"));

const GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
const NOT_CONFIGURED = "Yönetim servisi şu anda kullanılamıyor.";

const UUID_BICIMI = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLLER = new Set(["student", "teacher", "admin"]);
const DERS_TURLERI = new Set(["ders", "koclu"]);
const DERS_DURUMLARI = new Set(["scheduled", "completed", "cancelled"]);
const ODEME_DURUMLARI = new Set(["odendi", "bekliyor", "gecikti"]);

/** Sitenin geri kalanıyla aynı kanonik biçim: "05321234567". */
function telefonNormalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  const canonical = `0${digits}`;
  return /^05\d{9}$/.test(canonical) ? canonical : null;
}

function metin(value: unknown, maks = 200): string | null {
  if (typeof value !== "string") return null;
  const temiz = value.trim();
  if (!temiz || temiz.length > maks) return null;
  return temiz;
}

/** ISO tarih-saat. Geçersizse null — istemci `datetime-local` gönderiyor. */
function zaman(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Şifre uzunluğu SUNUCUDA da kontrol ediliyor. Supabase'in kendi alt sınırı
 * 6; burada 8 isteniyor çünkü bu şifreleri kullanıcı seçmiyor, yönetici
 * belirleyip kişiye iletiyor — kısa bir şifre kalıcı olarak kısa kalır.
 */
function sifre(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 72) return null; // 72: bcrypt sınırı
  return value;
}

/*
 * Hesabın e-postası TELEFONDAN TÜRETİLİYOR. Giriş telefonla yapılıyor
 * (sunucu telefonu e-postaya çeviriyor, bkz. routes/auth.ts), yani e-posta
 * kullanıcıya hiç görünmeyen bir iç kimlik. Telefondan türetmek benzersizliği
 * de garantiliyor — profiles.phone zaten UNIQUE.
 *
 * Yönetici isterse gerçek bir e-posta verebilir; o zaman bu kullanılmaz.
 */
function turetilmisEposta(telefon: string): string {
  return `${telefon}@hesap.akademitu.com`;
}

/*
 * Kullanıcı adı: küçük harf, 3-30, [a-z0-9._-]. '@' YASAK — girişte e-posta
 * diye bir kavram yok ve kullanıcı adının e-postaya benzemesi kullanıcıya
 * "hangisini yazacağım" sorusunu sordururdu. Aynı kalıp veritabanında da
 * CHECK olarak duruyor (profiles_username_format).
 *
 * null döner: biçim geçersiz. Boş string ise 'kaldır' anlamına geliyor ve
 * çağıran taraf onu ayrıca ele alıyor.
 */
function kullaniciAdiNormalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const temiz = value.trim().toLowerCase();
  return /^[a-z0-9._-]{3,30}$/.test(temiz) ? temiz : null;
}

function epostaNormalize(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const e = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/* ==================================================================== ÖZET */

/**
 * Panelin açılışta ihtiyaç duyduğu her şey: tüm hesaplar.
 * Dersler ve ödemeler ayrı uçlarda — onlar filtrelenerek çekiliyor ve
 * hesap listesinden çok daha hızlı büyüyor.
 */
router.get("/ozet", async (_req, res) => {
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  try {
    const { data: profiller, error } = await admin
      .from("profiles")
      .select("id, full_name, phone, username, user_type, created_at")
      .order("user_type", { ascending: true })
      .order("full_name", { ascending: true });

    if (error) {
      console.error("[Admin] profiller okunamadı:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    return res.json({
      success: true,
      accounts: (profiller ?? []).map((p) => ({
        id: p.id,
        fullName: p.full_name,
        phone: p.phone,
        username: p.username,
        userType: p.user_type,
        createdAt: p.created_at,
      })),
    });
  } catch (err: any) {
    console.error("[Admin] özet istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/* ================================================================= HESAPLAR */

/**
 * HESAP AÇ — POST /api/admin/hesaplar
 *
 * İki adım ve İKİSİ DE GEREKLİ (bkz. supabase-portal-auth.sql §1b):
 *   1. auth.users kaydı — Admin API ile, şifre hash'i Supabase'e bırakılıyor.
 *      `email_confirm: true` ŞART: doğrulanmamış bir hesap doğru şifreyle
 *      bile giriş yapamaz ve elle açılan hesapta doğrulama postası beklemenin
 *      anlamı yok.
 *   2. profiles satırı — telefon burada yaşıyor ve giriş bu satır üzerinden
 *      çözülüyor. Profili olmayan kullanıcı giriş YAPAMAZ.
 *
 * 1 olup 2 olmazsa ortada giriş yapamayan yetim bir auth kullanıcısı kalır;
 * o yüzden 2 başarısız olursa 1 GERİ ALINIYOR (aşağıdaki deleteUser).
 */
router.post("/hesaplar", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  const fullName = metin(req.body?.fullName, 120);
  const phone = telefonNormalize(req.body?.phone);
  const password = sifre(req.body?.password);
  const userType = typeof req.body?.userType === "string" ? req.body.userType : "";
  const email = req.body?.email ? epostaNormalize(req.body.email) : null;
  const username = req.body?.username ? kullaniciAdiNormalize(req.body.username) : null;

  if (!fullName) return res.status(400).json({ success: false, error: "Ad soyad gerekli." });
  if (!phone) {
    return res.status(400).json({ success: false, error: "Telefon 05 ile başlamalı ve 11 haneli olmalı." });
  }
  if (!password) {
    return res.status(400).json({ success: false, error: "Şifre en az 8 karakter olmalı." });
  }
  if (!ROLLER.has(userType)) {
    return res.status(400).json({ success: false, error: "Geçersiz hesap türü." });
  }
  if (req.body?.email && !email) {
    return res.status(400).json({ success: false, error: "E-posta biçimi geçersiz." });
  }
  if (req.body?.username && !username) {
    return res.status(400).json({
      success: false,
      error: "Kullanıcı adı 3-30 karakter olmalı; sadece küçük harf, rakam, nokta, alt çizgi ve tire.",
    });
  }

  try {
    /* Telefon çakışması ÖNCEDEN kontrol ediliyor: auth kullanıcısını açıp
       sonra profiles'ın UNIQUE kısıtına takılmak, geri alma gerektiren
       gereksiz bir tur demek. */
    const { data: mevcut } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", phone)
      .maybeSingle();

    if (mevcut) {
      return res.status(409).json({ success: false, error: "Bu telefon numarası zaten kayıtlı." });
    }

    /* Kullanıcı adı çakışması da ÖNCEDEN eleniyor; aynı gerekçe — auth
       kullanıcısını açıp sonra UNIQUE indekse takılmak geri alma gerektirir. */
    if (username) {
      const { data: adVar } = await admin
        .from("profiles")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (adVar) {
        return res.status(409).json({ success: false, error: "Bu kullanıcı adı zaten alınmış." });
      }
    }

    const { data: yeni, error: authHatasi } = await admin.auth.admin.createUser({
      email: email ?? turetilmisEposta(phone),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (authHatasi || !yeni?.user) {
      console.error("[Admin] auth kullanıcısı açılamadı:", authHatasi?.message);
      const cakisma = authHatasi?.message?.toLowerCase().includes("already");
      return res.status(cakisma ? 409 : 502).json({
        success: false,
        error: cakisma ? "Bu e-posta zaten kayıtlı." : GENERIC_ERROR,
      });
    }

    const { error: profilHatasi } = await admin
      .from("profiles")
      .insert({ id: yeni.user.id, full_name: fullName, phone, username, user_type: userType });

    if (profilHatasi) {
      /* GERİ ALMA: profil yazılamadıysa auth kullanıcısı da kalmamalı.
         Aksi halde o telefonla bir daha hesap açılamaz (e-posta çakışır) ve
         ortada hiçbir işe yaramayan bir kullanıcı durur. */
      console.error("[Admin] profil yazılamadı, auth kullanıcısı geri alınıyor:", profilHatasi.message);
      await admin.auth.admin.deleteUser(yeni.user.id).catch((e) =>
        console.error("[Admin] geri alma da başarısız:", e?.message || e),
      );
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    /* ŞİFRE DENETİM KAYDINA YAZILMIYOR — bkz. supabase-audit-log.sql. */
    auditLog(req, "ADMIN_ACCOUNT_CREATED", {
      userId: yapanId,
      detay: { hesapId: yeni.user.id, rol: userType },
    });

    return res.json({
      success: true,
      account: { id: yeni.user.id, fullName, phone, username, userType },
    });
  } catch (err: any) {
    console.error("[Admin] hesap açma istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** HESAP DÜZENLE — PATCH /api/admin/hesaplar/:id (ad / telefon / rol) */
router.patch("/hesaplar/:id", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) {
    return res.status(400).json({ success: false, error: "Hesap bulunamadı." });
  }

  const degisiklik: Record<string, unknown> = {};

  if (req.body?.fullName !== undefined) {
    const ad = metin(req.body.fullName, 120);
    if (!ad) return res.status(400).json({ success: false, error: "Ad soyad gerekli." });
    degisiklik.full_name = ad;
  }

  if (req.body?.phone !== undefined) {
    const tel = telefonNormalize(req.body.phone);
    if (!tel) {
      return res.status(400).json({ success: false, error: "Telefon 05 ile başlamalı ve 11 haneli olmalı." });
    }
    degisiklik.phone = tel;
  }

  if (req.body?.username !== undefined) {
    /* Boş string = kullanıcı adını KALDIR. Alanı boşaltmanın başka bir yolu
       olmazdı ve yanlış atanmış bir adı geri almak gerekebilir. */
    if (req.body.username === "" || req.body.username === null) {
      degisiklik.username = null;
    } else {
      const ad = kullaniciAdiNormalize(req.body.username);
      if (!ad) {
        return res.status(400).json({
          success: false,
          error: "Kullanıcı adı 3-30 karakter olmalı; sadece küçük harf, rakam, nokta, alt çizgi ve tire.",
        });
      }
      degisiklik.username = ad;
    }
  }

  if (req.body?.userType !== undefined) {
    if (!ROLLER.has(req.body.userType)) {
      return res.status(400).json({ success: false, error: "Geçersiz hesap türü." });
    }
    /*
     * KENDİ ROLÜNÜ DÜŞÜREMEZ. Tek admin kendini öğrenciye çevirirse panele
     * girebilecek kimse kalmaz ve geri dönüşün tek yolu SQL olur — bu
     * panelin var oluş sebebine aykırı.
     */
    if (id === yapanId && req.body.userType !== "admin") {
      return res.status(400).json({
        success: false,
        error: "Kendi yönetici rolünüzü kaldıramazsınız. Önce başka bir yönetici atayın.",
      });
    }
    degisiklik.user_type = req.body.userType;
  }

  if (Object.keys(degisiklik).length === 0) {
    return res.status(400).json({ success: false, error: "Değiştirilecek bir alan gönderilmedi." });
  }

  try {
    const { data, error } = await admin
      .from("profiles")
      .update(degisiklik)
      .eq("id", id)
      .select("id, full_name, phone, username, user_type")
      .maybeSingle();

    if (error) {
      console.error("[Admin] hesap güncellenemedi:", error.message);
      /* 23505 = UNIQUE ihlali. Telefon mu kullanıcı adı mı çakıştı, mesajdan
         ayırt ediliyor ki yönetici hangi alanı düzelteceğini bilsin. */
      const cakisma = error.code === "23505";
      const adCakismasi = cakisma && (error.message ?? "").includes("username");
      return res.status(cakisma ? 409 : 502).json({
        success: false,
        error: !cakisma
          ? GENERIC_ERROR
          : adCakismasi
            ? "Bu kullanıcı adı zaten alınmış."
            : "Bu telefon numarası zaten kayıtlı.",
      });
    }
    if (!data) return res.status(404).json({ success: false, error: "Hesap bulunamadı." });

    auditLog(req, "ADMIN_ACCOUNT_UPDATED", {
      userId: yapanId,
      /* Hangi ALANLARIN değiştiği yazılıyor, yeni DEĞERLER değil: denetim
         kaydı "kim ne yaptı"yı tespit eder, veriyi kopyalamaz. */
      detay: { hesapId: id, alanlar: Object.keys(degisiklik) },
    });

    return res.json({
      success: true,
      account: {
        id: data.id,
        fullName: data.full_name,
        phone: data.phone,
        username: data.username,
        userType: data.user_type,
      },
    });
  } catch (err: any) {
    console.error("[Admin] hesap güncelleme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/**
 * ŞİFRE SIFIRLA — POST /api/admin/hesaplar/:id/sifre
 * Sitede "şifremi unuttum" akışı yok (hesaplar elle açılıyor), yani şifresini
 * unutan biri için tek yol bu.
 */
router.post("/hesaplar/:id/sifre", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) {
    return res.status(400).json({ success: false, error: "Hesap bulunamadı." });
  }

  const yeniSifre = sifre(req.body?.password);
  if (!yeniSifre) {
    return res.status(400).json({ success: false, error: "Şifre en az 8 karakter olmalı." });
  }

  try {
    const { error } = await admin.auth.admin.updateUserById(id, { password: yeniSifre });
    if (error) {
      console.error("[Admin] şifre sıfırlanamadı:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    auditLog(req, "ADMIN_PASSWORD_RESET", { userId: yapanId, detay: { hesapId: id } });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Admin] şifre sıfırlama istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/* =================================================================== DERSLER */

/** Ders gövdesini doğrular. Hata varsa mesajı, yoksa satırı döndürür. */
async function dersGovdesi(
  admin: ReturnType<typeof serviceClient>,
  body: any,
): Promise<{ hata: string } | { satir: Record<string, unknown> }> {
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const teacherId = body?.teacherId ? String(body.teacherId) : null;
  const subject = metin(body?.subject, 120);
  const startsAt = zaman(body?.startsAt);
  const endsAt = body?.endsAt ? zaman(body.endsAt) : null;
  const kind = typeof body?.kind === "string" ? body.kind : "ders";
  const status = typeof body?.status === "string" ? body.status : "scheduled";

  if (!UUID_BICIMI.test(studentId)) return { hata: "Öğrenci seçilmedi." };
  if (teacherId && !UUID_BICIMI.test(teacherId)) return { hata: "Öğretmen seçimi geçersiz." };
  if (!subject) return { hata: "Ders konusu gerekli." };
  if (!startsAt) return { hata: "Başlangıç tarihi geçersiz." };
  if (body?.endsAt && !endsAt) return { hata: "Bitiş tarihi geçersiz." };
  if (endsAt && endsAt <= startsAt) return { hata: "Bitiş, başlangıçtan sonra olmalı." };
  if (!DERS_TURLERI.has(kind)) return { hata: "Geçersiz ders türü." };
  if (!DERS_DURUMLARI.has(status)) return { hata: "Geçersiz ders durumu." };

  /*
   * Seçilen kişilerin ROLLERİ doğrulanıyor. Veritabanı bunu kontrol etmiyor
   * (lessons.user_id yalnızca auth.users'a bakıyor), yani bu olmadan bir
   * öğretmen yanlışlıkla "öğrenci" alanına yazılabilir ve o ders kimsenin
   * panelinde doğru görünmezdi.
   */
  const { data: kisiler } = await admin!
    .from("profiles")
    .select("id, full_name, user_type")
    .in("id", teacherId ? [studentId, teacherId] : [studentId]);

  const ogrenci = (kisiler ?? []).find((k) => k.id === studentId);
  if (!ogrenci) return { hata: "Öğrenci bulunamadı." };
  if (ogrenci.user_type !== "student") return { hata: "Seçilen kişi öğrenci değil." };

  let ogretmenAdi: string | null = null;
  if (teacherId) {
    const ogretmen = (kisiler ?? []).find((k) => k.id === teacherId);
    if (!ogretmen) return { hata: "Öğretmen bulunamadı." };
    if (ogretmen.user_type !== "teacher") return { hata: "Seçilen kişi öğretmen değil." };
    ogretmenAdi = ogretmen.full_name;
  }

  return {
    satir: {
      user_id: studentId,
      teacher_id: teacherId,
      subject,
      /* teacher_name DENORMALİZE tutuluyor: öğrenci paneli bunu gösteriyor ve
         öğretmen hesabı silinse bile dersin kimden alındığı kalmalı
         (bkz. supabase-teacher-panel.sql'deki kolon yorumu). */
      teacher_name: ogretmenAdi,
      starts_at: startsAt,
      ends_at: endsAt,
      kind,
      status,
    },
  };
}

/** DERSLERİ LİSTELE — GET /api/admin/dersler?from=&to=&studentId=&teacherId= */
router.get("/dersler", async (req, res) => {
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  try {
    let sorgu = admin
      .from("lessons")
      .select("id, user_id, teacher_id, subject, teacher_name, starts_at, ends_at, kind, status")
      .order("starts_at", { ascending: false })
      .limit(200);

    const from = zaman(req.query.from);
    const to = zaman(req.query.to);
    if (from) sorgu = sorgu.gte("starts_at", from);
    if (to) sorgu = sorgu.lte("starts_at", to);
    if (typeof req.query.studentId === "string" && UUID_BICIMI.test(req.query.studentId)) {
      sorgu = sorgu.eq("user_id", req.query.studentId);
    }
    if (typeof req.query.teacherId === "string" && UUID_BICIMI.test(req.query.teacherId)) {
      sorgu = sorgu.eq("teacher_id", req.query.teacherId);
    }

    const { data: dersler, error } = await sorgu;
    if (error) {
      console.error("[Admin] dersler okunamadı:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    const kisiIdleri = [
      ...new Set(
        (dersler ?? []).flatMap((d) => [d.user_id, d.teacher_id]).filter(Boolean) as string[],
      ),
    ];
    const adlar = new Map<string, string>();
    if (kisiIdleri.length) {
      const { data: kisiler } = await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", kisiIdleri);
      for (const k of kisiler ?? []) adlar.set(k.id, k.full_name);
    }

    return res.json({
      success: true,
      lessons: (dersler ?? []).map((d) => ({
        id: d.id,
        studentId: d.user_id,
        studentName: adlar.get(d.user_id) ?? null,
        teacherId: d.teacher_id,
        teacherName: d.teacher_id ? (adlar.get(d.teacher_id) ?? d.teacher_name) : d.teacher_name,
        subject: d.subject,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        kind: d.kind,
        status: d.status,
      })),
    });
  } catch (err: any) {
    console.error("[Admin] ders listesi istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** DERS EKLE — POST /api/admin/dersler */
router.post("/dersler", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  const dogrulama = await dersGovdesi(admin, req.body);
  if ("hata" in dogrulama) return res.status(400).json({ success: false, error: dogrulama.hata });

  try {
    const { data, error } = await admin
      .from("lessons")
      .insert(dogrulama.satir)
      .select("id")
      .single();

    if (error) {
      console.error("[Admin] ders eklenemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    auditLog(req, "ADMIN_LESSON_WRITE", { userId: yapanId, detay: { dersId: data.id, islem: "olustur" } });
    return res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error("[Admin] ders ekleme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** DERS DÜZENLE — PATCH /api/admin/dersler/:id */
router.patch("/dersler/:id", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) return res.status(400).json({ success: false, error: "Ders bulunamadı." });

  const dogrulama = await dersGovdesi(admin, req.body);
  if ("hata" in dogrulama) return res.status(400).json({ success: false, error: dogrulama.hata });

  try {
    /* `.eq("id", id)` — servis rolüyle çalışıldığı için bunu unutmak TÜM
       dersleri güncellemek demek; RLS burada yakalamaz. */
    const { data, error } = await admin
      .from("lessons")
      .update(dogrulama.satir)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[Admin] ders güncellenemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }
    if (!data) return res.status(404).json({ success: false, error: "Ders bulunamadı." });

    auditLog(req, "ADMIN_LESSON_WRITE", { userId: yapanId, detay: { dersId: id, islem: "duzenle" } });
    return res.json({ success: true, id });
  } catch (err: any) {
    console.error("[Admin] ders güncelleme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** DERS SİL — DELETE /api/admin/dersler/:id (yorumu da CASCADE ile gider) */
router.delete("/dersler/:id", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) return res.status(400).json({ success: false, error: "Ders bulunamadı." });

  try {
    const { data, error } = await admin.from("lessons").delete().eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error("[Admin] ders silinemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }
    if (!data) return res.status(404).json({ success: false, error: "Ders bulunamadı." });

    auditLog(req, "ADMIN_LESSON_DELETED", { userId: yapanId, detay: { dersId: id } });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Admin] ders silme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/* =================================================================== ÖDEMELER */

function odemeGovdesi(body: any): { hata: string } | { satir: Record<string, unknown> } {
  const studentId = typeof body?.studentId === "string" ? body.studentId : "";
  const period = metin(body?.period, 60);
  const status = typeof body?.status === "string" ? body.status : "bekliyor";
  const currency = metin(body?.currency, 8) ?? "TRY";
  const dueOn = body?.dueOn ? String(body.dueOn) : null;

  /* Tutar Number()'a çevriliyor: istemci metin gönderebilir ("1500" ya da
     "1500,50"). Virgül noktaya çevriliyor çünkü Türkçe klavyede ondalık
     ayırıcı virgül. */
  const ham = typeof body?.amount === "string" ? body.amount.replace(",", ".") : body?.amount;
  const amount = Number(ham);

  if (!UUID_BICIMI.test(studentId)) return { hata: "Öğrenci seçilmedi." };
  if (!period) return { hata: "Dönem gerekli (örn. 2026-09 ya da Eylül 2026)." };
  if (!Number.isFinite(amount) || amount < 0) return { hata: "Tutar geçersiz." };
  if (!ODEME_DURUMLARI.has(status)) return { hata: "Geçersiz ödeme durumu." };
  if (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { hata: "Son ödeme tarihi geçersiz." };

  return {
    satir: { user_id: studentId, period, amount, currency, status, due_on: dueOn },
  };
}

/** ÖDEMELERİ LİSTELE — GET /api/admin/odemeler?studentId= */
router.get("/odemeler", async (req, res) => {
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  try {
    let sorgu = admin
      .from("payments")
      .select("id, user_id, period, amount, currency, status, due_on, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeof req.query.studentId === "string" && UUID_BICIMI.test(req.query.studentId)) {
      sorgu = sorgu.eq("user_id", req.query.studentId);
    }

    const { data: odemeler, error } = await sorgu;
    if (error) {
      console.error("[Admin] ödemeler okunamadı:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    const idler = [...new Set((odemeler ?? []).map((o) => o.user_id))];
    const adlar = new Map<string, string>();
    if (idler.length) {
      const { data: kisiler } = await admin.from("profiles").select("id, full_name").in("id", idler);
      for (const k of kisiler ?? []) adlar.set(k.id, k.full_name);
    }

    return res.json({
      success: true,
      payments: (odemeler ?? []).map((o) => ({
        id: o.id,
        studentId: o.user_id,
        studentName: adlar.get(o.user_id) ?? null,
        period: o.period,
        amount: Number(o.amount),
        currency: o.currency,
        status: o.status,
        dueOn: o.due_on,
      })),
    });
  } catch (err: any) {
    console.error("[Admin] ödeme listesi istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** ÖDEME EKLE — POST /api/admin/odemeler */
router.post("/odemeler", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  const dogrulama = odemeGovdesi(req.body);
  if ("hata" in dogrulama) return res.status(400).json({ success: false, error: dogrulama.hata });

  try {
    const { data, error } = await admin.from("payments").insert(dogrulama.satir).select("id").single();
    if (error) {
      console.error("[Admin] ödeme eklenemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }

    /* TUTAR DENETİM KAYDINA YAZILMIYOR — supabase-audit-log.sql ödeme
       detayını açıkça yasaklıyor. Hangi satırın dokunulduğu yeterli. */
    auditLog(req, "ADMIN_PAYMENT_WRITE", { userId: yapanId, detay: { odemeId: data.id, islem: "olustur" } });
    return res.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error("[Admin] ödeme ekleme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** ÖDEME DÜZENLE — PATCH /api/admin/odemeler/:id */
router.patch("/odemeler/:id", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) return res.status(400).json({ success: false, error: "Ödeme bulunamadı." });

  const dogrulama = odemeGovdesi(req.body);
  if ("hata" in dogrulama) return res.status(400).json({ success: false, error: dogrulama.hata });

  try {
    const { data, error } = await admin
      .from("payments")
      .update(dogrulama.satir)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[Admin] ödeme güncellenemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }
    if (!data) return res.status(404).json({ success: false, error: "Ödeme bulunamadı." });

    auditLog(req, "ADMIN_PAYMENT_WRITE", { userId: yapanId, detay: { odemeId: id, islem: "duzenle" } });
    return res.json({ success: true, id });
  } catch (err: any) {
    console.error("[Admin] ödeme güncelleme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/** ÖDEME SİL — DELETE /api/admin/odemeler/:id */
router.delete("/odemeler/:id", async (req, res) => {
  const { userId: yapanId } = res.locals as unknown as SessionLocals;
  const { id } = req.params;
  const admin = serviceClient();
  if (!admin) return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  if (!UUID_BICIMI.test(id)) return res.status(400).json({ success: false, error: "Ödeme bulunamadı." });

  try {
    const { data, error } = await admin.from("payments").delete().eq("id", id).select("id").maybeSingle();
    if (error) {
      console.error("[Admin] ödeme silinemedi:", error.message);
      return res.status(502).json({ success: false, error: GENERIC_ERROR });
    }
    if (!data) return res.status(404).json({ success: false, error: "Ödeme bulunamadı." });

    auditLog(req, "ADMIN_PAYMENT_DELETED", { userId: yapanId, detay: { odemeId: id } });
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Admin] ödeme silme istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

export default router;
