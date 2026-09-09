import express from "express";
import { anonServerClient, serviceClient, userClient } from "../supabase.js";
import {
  setSessionCookies,
  clearSessionCookies,
  readAccessToken,
  readRefreshToken,
} from "../cookies.js";
import { isRateLimited, recordAttempt } from "../security.js";

/*
 * PORTAL KİMLİK DOĞRULAMA
 * ===========================================================================
 * Giriş TELEFONLA, kayıt E-POSTAYLA (ürün kararı: kişi hesabını e-postasıyla
 * açar, her gün gireceği ekranda ezberindeki numarasını yazar).
 *
 * Supabase Auth'un kendi `phone` alanı KULLANILMIYOR: onu kullanmak SMS
 * sağlayıcısı bağlamayı ve numara doğrulamayı gerektiriyor. Bunun yerine
 * telefon `public.profiles` tablosunda kullanıcıya bağlı tutuluyor ve girişte
 * sunucu telefonu e-postaya çeviriyor.
 *
 * Yanıtların gövdesinde ASLA token dönmez — oturum yalnızca httpOnly çerezde.
 */

const router = express.Router();

/* Kanonik telefon biçimi sitenin geri kalanıyla aynı: "05321234567". */
function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "").replace(/^0+/, "");
  const canonical = `0${digits}`;
  return /^05\d{9}$/.test(canonical) ? canonical : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}

/*
 * Kimlik doğrulama hataları kullanıcıya AYRIŞTIRILMADAN döner: "böyle bir
 * numara yok" ile "şifre yanlış" ayrımı, saldırgana hangi numaraların kayıtlı
 * olduğunu tek tek sorgulatır (kullanıcı numarası sayımı). Gerçek sebep
 * yalnızca sunucu log'una yazılır.
 */
const INVALID_CREDENTIALS = "Telefon numarası veya şifre hatalı.";
const GENERIC_ERROR = "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
const NOT_CONFIGURED = "Giriş servisi şu anda kullanılamıyor.";

/** İstemciye dönen kullanıcı biçimi — hiçbir zaman ham Supabase nesnesi değil. */
function publicUser(user: { id: string; email?: string | null }, profile?: { full_name?: string | null; phone?: string | null } | null) {
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
  };
}

/*
 * KAYIT UCU BİLEREK YOK.
 * ---------------------------------------------------------------------------
 * Hesaplar elle açılıyor (bkz. supabase-portal-auth.sql'deki "Elle kullanıcı
 * ekleme" bölümü). Arayüzden kayıt formunu kaldırıp burada açık bir /signup
 * ucu bırakmak hiçbir şey korumazdı: isteyen doğrudan API'ye istek atıp hesap
 * açabilirdi. Kapı gerçekten kapalı olsun diye uç da kaldırıldı.
 *
 * Yeniden açılırsa: telefon <-> profil eşlemesi ve honeypot kontrolü geri
 * gelmeli, ayrıca auth_attempts'teki 'signup' hız limiti zaten hazır duruyor.
 */

/* ------------------------------------------------------------------ GİRİŞ */
router.post("/login", async (req, res) => {
  if (await isRateLimited(req, res, "login")) return;

  const { phone, password, website } = req.body ?? {};

  if (website) return res.status(400).json({ success: false, error: INVALID_CREDENTIALS });

  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || typeof password !== "string" || !password) {
    return res.status(400).json({ success: false, error: INVALID_CREDENTIALS });
  }

  const auth = anonServerClient();
  const admin = serviceClient();
  if (!auth || !admin) {
    console.error("[Auth] login: Supabase yapılandırılmamış.");
    return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  }

  await recordAttempt(req, "login");

  try {
    /*
     * Telefon -> e-posta çevirisi. Servis rolünün kullanıcı verisine dokunduğu
     * TEK yer ve gerekçesi şu: bu noktada ortada henüz oturum yok, dolayısıyla
     * RLS'e dayanan bir okuma mümkün değil. Okunan alan yalnızca e-posta ve
     * sonuç istemciye HİÇBİR ŞEKİLDE dönmüyor — bulunamazsa da şifre yanlışmış
     * gibi aynı mesaj veriliyor.
     */
    const { data: profile, error: lookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", cleanPhone)
      .maybeSingle();

    if (lookupError) {
      console.error("[Auth] login profil araması başarısız:", lookupError.message);
      return res.status(500).json({ success: false, error: GENERIC_ERROR });
    }

    if (!profile) {
      return res.status(401).json({ success: false, error: INVALID_CREDENTIALS });
    }

    const { data: userRecord, error: userError } = await admin.auth.admin.getUserById(profile.id);
    if (userError || !userRecord?.user?.email) {
      console.error("[Auth] kullanıcı e-postası bulunamadı:", userError?.message);
      return res.status(401).json({ success: false, error: INVALID_CREDENTIALS });
    }

    const { data, error } = await auth.auth.signInWithPassword({
      email: userRecord.user.email,
      password,
    });

    if (error || !data.session || !data.user) {
      console.error("[Auth] signInWithPassword başarısız:", error?.message, error?.status);
      return res.status(401).json({ success: false, error: INVALID_CREDENTIALS });
    }

    setSessionCookies(res, data.session);

    /* Profil bilgisi artık KULLANICININ KENDİ token'ıyla okunuyor: RLS
       "yalnızca kendi satırın" kuralını uyguluyor. */
    const scoped = userClient(data.session.access_token);
    const { data: fullProfile } = scoped
      ? await scoped.from("profiles").select("full_name, phone").eq("id", data.user.id).maybeSingle()
      : { data: null };

    return res.json({ success: true, user: publicUser(data.user, fullProfile) });
  } catch (err: any) {
    console.error("[Auth] login istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

/* ------------------------------------------------------------------ ÇIKIŞ */
router.post("/logout", async (req, res) => {
  const accessToken = readAccessToken(req);

  /* Çerezler her hâlükârda silinir — sunucu tarafı iptal başarısız olsa bile
     kullanıcı çıkış yapmış sayılmalı. */
  clearSessionCookies(res);

  if (accessToken) {
    try {
      const scoped = userClient(accessToken);
      await scoped?.auth.signOut();
    } catch (err: any) {
      console.error("[Auth] signOut istisnası:", err?.message || err);
    }
  }

  return res.json({ success: true });
});

/* --------------------------------------------------------------- YENİLEME */
router.post("/refresh", async (req, res) => {
  const refreshToken = readRefreshToken(req);
  if (!refreshToken) {
    return res.status(401).json({ success: false, error: "Oturum bulunamadı." });
  }

  const auth = anonServerClient();
  if (!auth) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  try {
    const { data, error } = await auth.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      /* Yenileme jetonu geçersizse çerezleri temizle: aksi halde istemci
         sonsuza kadar aynı ölü jetonla yeniden denemeye çalışır. */
      clearSessionCookies(res);
      return res.status(401).json({ success: false, error: "Oturum süresi doldu." });
    }

    setSessionCookies(res, data.session);
    return res.json({ success: true });
  } catch (err: any) {
    console.error("[Auth] refresh istisnası:", err?.message || err);
    clearSessionCookies(res);
    return res.status(401).json({ success: false, error: "Oturum süresi doldu." });
  }
});

/* ------------------------------------------------------------ OTURUM SAHİBİ */
router.get("/me", async (req, res) => {
  const accessToken = readAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ success: false, error: "Oturum bulunamadı." });
  }

  const scoped = userClient(accessToken);
  if (!scoped) return res.status(503).json({ success: false, error: NOT_CONFIGURED });

  try {
    const { data, error } = await scoped.auth.getUser();
    if (error || !data.user) {
      return res.status(401).json({ success: false, error: "Oturum geçersiz." });
    }

    const { data: profile } = await scoped
      .from("profiles")
      .select("full_name, phone")
      .eq("id", data.user.id)
      .maybeSingle();

    return res.json({ success: true, user: publicUser(data.user, profile) });
  } catch (err: any) {
    console.error("[Auth] me istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: GENERIC_ERROR });
  }
});

export default router;
