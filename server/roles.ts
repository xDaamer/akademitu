import express from "express";
import { userClient } from "./supabase.js";
import { readAccessToken } from "./cookies.js";
import { auditLog } from "./audit.js";

/*
 * OTURUM VE ROL — /api/portal ve /api/teacher'ın ORTAK KAPISI
 * ===========================================================================
 * Portalda iki tür kullanıcı var ve ikisi farklı veri görüyor:
 *
 *   student -> kendi dersleri, denemeleri, ödemeleri  (/api/portal/*)
 *   teacher -> verdiği dersler ve o derslerin yorumları (/api/teacher/*)
 *
 * Bu dosya "kim olduğun" sorusunu isteğin EN BAŞINDA, TEK YERDE cevaplıyor.
 *
 * ROL NEREDEN OKUNUYOR (ve nereden OKUNMUYOR)
 * ---------------------------------------------------------------------------
 * İstemciden gelen HİÇBİR ŞEYDEN: ne gövdeden, ne sorgu parametresinden, ne
 * de bir başlıktan. Rol, çerezdeki jetonla açılan oturumun sahibine ait
 * `public.profiles.user_type` satırından okunuyor ve o satır kullanıcının
 * KENDİ jetonuyla (userClient -> RLS) çekiliyor.
 *
 * Kullanıcı kendi user_type'ını DEĞİŞTİREMEZ: profiles_update_own politikası
 * phone ile birlikte user_type'ı da sabitliyor (bkz. supabase-teacher-panel.sql
 * §1b). O politika olmasaydı buradaki okuma güvenilir olmazdı — herkes kendini
 * öğretmen yapabilirdi.
 *
 * JWT'ye ÖZEL TALEP (custom claim) KOYMA yoluna gidilmedi: Supabase'de bunun
 * için Auth Hook kurmak gerekiyor ve rol değişikliği jeton yenilenene kadar
 * eski değerde kalırdı. Veritabanından okumak istek başına bir sorgu daha
 * demek, ama her zaman güncel.
 *
 * NEDEN 403 DÖNMEK YETMEZ (ve neden yine de dönüyoruz)
 * ---------------------------------------------------------------------------
 * Buradaki kontroller GÜVENLİK SINIRININ TAMAMI DEĞİL. Asıl sınır RLS:
 * öğretmen `lessons` üzerinde ancak teacher_id'si kendisi olan satırları,
 * öğrenci ancak user_id'si kendisi olanları görüyor. Bu middleware kaldırılsa
 * bile kimse başkasının verisini okuyamaz.
 *
 * Yine de var, çünkü iki işi yapıyor: (1) yanlış paneldeki bir isteğe boş
 * liste yerine anlaşılır bir hata döndürüyor, (2) yanlış role ait bir ucu
 * yoklamayı denetim kaydına yazıyor.
 */

export type UserType = "student" | "teacher" | "admin";

const NO_SESSION = "Oturum bulunamadı.";
const INVALID_SESSION = "Oturum geçersiz.";
const NOT_CONFIGURED = "Panel şu anda kullanılamıyor.";
const FORBIDDEN = "Bu sayfaya erişim yetkiniz yok.";

/** requireSession'ın res.locals'a koyduğu, sonraki her katmanın okuduğu şey. */
export interface SessionLocals {
  accessToken: string;
  userId: string;
  userType: UserType;
  fullName: string | null;
}

/**
 * Oturumu açar ve rolü yükler. /api/portal ve /api/teacher'ın ilk katmanı.
 *
 * Jeton yoksa/geçersizse 401 — istemci bunu görünce bir kez
 * /api/auth/refresh deneyip tekrar sorar (bkz. src/lib/api.ts).
 *
 * getUser() BURADA, bir kez çağrılıyor. Eskiden portal.ts kendi içinde
 * çağırıyordu; rol kontrolü için ikinci bir çağrı eklemek yerine sonuç
 * res.locals'a konuyor ve route'lar onu kullanıyor. Yani iki katman, tek
 * tur.
 */
export async function requireSession(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const token = readAccessToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: NO_SESSION });
  }

  const supabase = userClient(token);
  if (!supabase) {
    return res.status(503).json({ success: false, error: NOT_CONFIGURED });
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return res.status(401).json({ success: false, error: INVALID_SESSION });
    }

    /*
     * `.eq("id", ...)` ŞART — filtresiz bırakılamaz.
     * Bu, portal.ts'teki "RLS zaten kendi satırını veriyor, filtre gereksiz"
     * notunun İSTİSNASI ve sebebi şu: profiles'ta artık ikinci bir SELECT
     * politikası var (profiles_select_as_teacher), öğretmene öğrencilerinin
     * satırlarını da açıyor. Filtresiz bir select öğretmen için kendi satırı
     * + tüm öğrencilerinin satırları döndürür; ilk satırı "ben" sanmak
     * yanlış role yol açardı.
     */
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type, full_name")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[Roles] profil okunamadı:", profileError.message);
      return res.status(502).json({ success: false, error: NOT_CONFIGURED });
    }

    /*
     * Profili olmayan bir kullanıcı panele giremez. Bu normalde girişte
     * eleniyor (telefon -> profil eşlemesi olmadan giriş yapılamıyor), ama
     * profil sonradan silinmişse oturum hâlâ geçerli olabilir. Rolsüz birini
     * varsayılan olarak 'student' saymak yanlış olurdu.
     */
    if (!profile) {
      return res.status(403).json({ success: false, error: FORBIDDEN });
    }

    const locals = res.locals as unknown as SessionLocals;
    locals.accessToken = token;
    locals.userId = userData.user.id;
    locals.userType = profile.user_type as UserType;
    locals.fullName = profile.full_name ?? null;

    next();
  } catch (err: any) {
    console.error("[Roles] oturum istisnası:", err?.message || err);
    return res.status(500).json({ success: false, error: NOT_CONFIGURED });
  }
}

/**
 * Rol kapısı. requireSession'DAN SONRA mount edilmeli — rol orada yükleniyor.
 *
 * Reddedilen istek denetim kaydına yazılıyor: "öğrenci hesabıyla
 * /api/teacher/* yoklandı" tek başına suç değil ama tekrarlanıyorsa
 * bilinmesi gereken bir şey. Başarısız girişlerin auth_attempts'te olduğu
 * gibi, burada da olay kaydı ucuz ve sonradan cevaplanamaz bir soruyu
 * cevaplıyor.
 */
export function requireUserType(...allowed: UserType[]) {
  return function roleGate(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) {
    const locals = res.locals as unknown as SessionLocals;

    if (!allowed.includes(locals.userType)) {
      auditLog(req, "FORBIDDEN_ROLE", {
        userId: locals.userId,
        /* Rol ve yol yazılıyor, gövde YAZILMIYOR: denetim kaydına kullanıcı
           girdisi koymak onu saldırganın yazabildiği bir yere çevirir. */
        detay: { rol: locals.userType, gereken: allowed, yol: req.baseUrl + req.path },
      });
      return res.status(403).json({ success: false, error: FORBIDDEN });
    }

    next();
  };
}
