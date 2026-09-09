import type { Response, Request } from "express";

/*
 * OTURUM ÇEREZLERİ
 * ===========================================================================
 * Bu katmanın en somut güvenlik kazancı burada: Supabase'in tarayıcı
 * istemcisi access/refresh token'ı localStorage'a yazar ve orada JavaScript'e
 * açıktır — sayfada tek bir XSS, oturumun çalınması demektir. Proxy'de token
 * hiç JS'e verilmiyor; httpOnly çerezde durup her istekte tarayıcı tarafından
 * kendiliğinden gönderiliyor.
 *
 * Bu yüzden /api/auth/* yanıtlarının GÖVDESİNDE ASLA token dönülmez. Gövdeye
 * bir kez token koyulursa httpOnly'nin anlamı kalmaz.
 */

export const ACCESS_COOKIE = "ak_at";
export const REFRESH_COOKIE = "ak_rt";

/*
 * OTURUM İŞARETİ — httpOnly DEĞİL, BİLEREK.
 * ---------------------------------------------------------------------------
 * Token'lar httpOnly olduğu için JavaScript "oturum var mı" sorusunu kendi
 * başına cevaplayamıyor. Bu yüzden istemci her sayfa açılışında /api/auth/me
 * çağırmak, 401 alınca /api/auth/refresh denemek ve tekrar denemek zorunda
 * kalıyordu: hiç giriş yapmamış bir ziyaretçi için üç boşa istek. Burası bir
 * pazarlama sitesi, ziyaretçilerin ezici çoğunluğu hiç giriş yapmıyor.
 *
 * Bu çerez JETON İÇERMEZ, yalnızca "bir oturum açıldı" bilgisini taşır ve
 * GÜVENLİK SINIRI DEĞİLDİR — kullanıcı elle uydurabilir, ama uydurmasının tek
 * sonucu bir 401 almaktır. Yetkiyi belirleyen tek şey httpOnly çerezdeki
 * jetondur.
 */
export const SESSION_HINT_COOKIE = "ak_session";

const isProduction = () => process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

/*
 * sameSite "lax": tarayıcı çerezi başka sitelerden gelen POST isteklerinde
 * göndermez, yani CSRF'in ana yolunu kapatır; kullanıcı e-postadaki bağlantıya
 * tıklayıp siteye geldiğinde ise oturumu açık kalır ("strict" bunu bozardı).
 * İkinci savunma katmanı için bkz. server/security.ts (Origin kontrolü).
 */
function baseOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds * 1000,
  };
}

/**
 * Supabase'in verdiği oturumu çerezlere yazar.
 * `expiresIn` access token'ın ömrü (saniye, tipik 3600). Refresh token'ın
 * kendi sona erme bilgisi yanıtta gelmiyor; 30 gün pratik bir üst sınır.
 */
export function setSessionCookies(
  res: Response,
  session: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const accessMaxAge = session.expires_in ?? 3600;
  const refreshMaxAge = 60 * 60 * 24 * 30;

  res.cookie(ACCESS_COOKIE, session.access_token, baseOptions(accessMaxAge));
  res.cookie(REFRESH_COOKIE, session.refresh_token, baseOptions(refreshMaxAge));

  /* İşaret çerezi JS tarafından okunabilmeli, o yüzden httpOnly değil. */
  res.cookie(SESSION_HINT_COOKIE, "1", {
    ...baseOptions(refreshMaxAge),
    httpOnly: false,
  });
}

export function clearSessionCookies(res: Response) {
  /* maxAge yerine aynı ad/path/flag'lerle temizlenmeli — tarayıcı çerezi
     ancak birebir eşleşen tanımla siler. */
  const options = { httpOnly: true, secure: isProduction(), sameSite: "lax" as const, path: "/" };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(SESSION_HINT_COOKIE, { ...options, httpOnly: false });
}

export function readAccessToken(req: Request): string | null {
  return (req.cookies?.[ACCESS_COOKIE] as string | undefined) || null;
}

export function readRefreshToken(req: Request): string | null {
  return (req.cookies?.[REFRESH_COOKIE] as string | undefined) || null;
}
