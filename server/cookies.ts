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
 * ÇEREZ ALAN ADI — İKİ HOST TEK OTURUM
 * ===========================================================================
 * Giriş akademitu.com/login'de yapılıyor, panel portal.akademitu.com'da
 * açılıyor. Çerez varsayılan olarak HOST'A ÖZELDİR (Domain yazılmazsa yalnızca
 * yazıldığı host'a gider), dolayısıyla Domain belirtilmezse kullanıcı giriş
 * yapar, portala geçer ve orada oturumu YOKMUŞ gibi karşılanır.
 *
 * Domain=".akademitu.com" çerezi tüm alt alan adlarında geçerli kılar. Bu,
 * kılavuzun A yöntemi: iki host aynı kayıtlı alan adı ve aynı sunucu altında
 * olduğu için tek kullanımlık "handoff token"a gerek yok — jeton hiçbir zaman
 * URL'de taşınmıyor, ki bu access log'lara sızma riskini de ortadan kaldırıyor.
 *
 * BUNUN BEDELİ: alt alan adı devralma. .akademitu.com altındaki HERHANGİ bir
 * host bu çerezi okuyabilir ve yazabilir. Yani:
 *   - Yeni bir alt alan adı açarken (blog, staging, ...) o host'un güvenliği
 *     artık panelin güvenliğidir.
 *   - Kullanılmayan DNS kayıtlarını bırakmayın (dangling CNAME -> devralma).
 * `__Host-` öneki bu riski kapatırdı ama tanımı gereği Domain ile birlikte
 * kullanılamaz; iki host'lu kurulumun kaçınılmaz takası bu.
 *
 * DEĞER NEREDEN GELİYOR: önce COOKIE_DOMAIN ortam değişkeni, yoksa isteğin
 * kendi host'undan türetiliyor. Türetme önemli, çünkü sabit ".akademitu.com"
 * yazmak Vercel önizlemelerini (*.vercel.app) ve localhost'u BOZARDI: tarayıcı,
 * isteğin host'unu kapsamayan bir Domain değeri taşıyan çerezi sessizce atar
 * ve oturum hiç açılmaz. Bu ortamlarda host'a özel çerez zaten doğru davranış.
 */
function cookieDomain(req: Request): string | undefined {
  const explicit = process.env.COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;

  const host = (req.get("host") || "").split(":")[0].toLowerCase();
  if (host === "akademitu.com" || host.endsWith(".akademitu.com")) {
    return ".akademitu.com";
  }

  /* localhost, *.vercel.app, IP ile erişim: host'a özel çerez. */
  return undefined;
}

/*
 * sameSite "lax": tarayıcı çerezi başka sitelerden gelen POST isteklerinde
 * göndermez, yani CSRF'in ana yolunu kapatır; kullanıcı e-postadaki bağlantıya
 * tıklayıp siteye geldiğinde ise oturumu açık kalır ("strict" bunu bozardı).
 * İkinci savunma katmanı için bkz. server/security.ts (Origin kontrolü).
 *
 * sameSite "lax" ALT ALAN ADINDA DA YETERLİ: SameSite kısıtlaması host'u değil
 * KAYITLI ALAN ADINI (eTLD+1) baz alır, dolayısıyla akademitu.com ile
 * portal.akademitu.com tarayıcı için "same-site"tir ve çerez aralarındaki
 * geçişte gider. `none`'a geçmek gereksiz yere CSRF yüzeyini büyütürdü.
 */
function baseOptions(req: Request, maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    domain: cookieDomain(req),
    maxAge: maxAgeSeconds * 1000,
  };
}

/**
 * Supabase'in verdiği oturumu çerezlere yazar.
 * `expiresIn` access token'ın ömrü (saniye, tipik 3600). Refresh token'ın
 * kendi sona erme bilgisi yanıtta gelmiyor; 30 gün pratik bir üst sınır.
 */
export function setSessionCookies(
  req: Request,
  res: Response,
  session: { access_token: string; refresh_token: string; expires_in?: number },
) {
  const accessMaxAge = session.expires_in ?? 3600;
  const refreshMaxAge = 60 * 60 * 24 * 30;

  /*
   * ESKİ HOST'A ÖZEL ÇEREZLERİ ÖNCE SİL — GEÇİŞ İÇİN ŞART.
   * -------------------------------------------------------------------------
   * Panel taşınmadan önce çerezler Domain'siz, yani www.akademitu.com'a ÖZEL
   * yazılıyordu. Domain'li bir çerez yazmak, aynı adı taşıyan host'a özel
   * çerezi EZMEZ: tarayıcı ikisini ayrı çerez sayar ve isteğe İKİSİNİ BİRDEN
   * ekler ("ak_at=eski; ak_at=yeni"). cookie-parser ilk değeri alır, hangisi
   * olduğu da tanımsızdır — yani daha önce giriş yapmış bir kullanıcı
   * ölü jetonla dolaşmaya başlayabilirdi.
   *
   * Bu satırlar o eski çerezleri süresi geçmiş olarak işaretler. Aynı yanıtta
   * hem silme hem yazma gitmesi sorun değil: Set-Cookie başlıkları farklı
   * Domain taşıdığı için tarayıcı ikisini ayrı ayrı uygular.
   *
   * Zamanla gereksizleşecek ama silinmesi güvenli değil: tarayıcısında eski
   * çerez duran her ziyaretçi için hâlâ gerekli.
   */
  if (cookieDomain(req)) {
    const legacy = { httpOnly: true, secure: isProduction(), sameSite: "lax" as const, path: "/" };
    res.clearCookie(ACCESS_COOKIE, legacy);
    res.clearCookie(REFRESH_COOKIE, legacy);
    res.clearCookie(SESSION_HINT_COOKIE, { ...legacy, httpOnly: false });
  }

  res.cookie(ACCESS_COOKIE, session.access_token, baseOptions(req, accessMaxAge));
  res.cookie(REFRESH_COOKIE, session.refresh_token, baseOptions(req, refreshMaxAge));

  /* İşaret çerezi JS tarafından okunabilmeli, o yüzden httpOnly değil. */
  res.cookie(SESSION_HINT_COOKIE, "1", {
    ...baseOptions(req, refreshMaxAge),
    httpOnly: false,
  });
}

/*
 * ÇIKIŞ HER İKİ ALAN ADINDAN BİRDEN.
 * ---------------------------------------------------------------------------
 * `domain` burada da geçilmek ZORUNDA: tarayıcı bir çerezi ancak ad + path +
 * DOMAIN üçlüsü birebir eşleşen bir tanımla siler. Domain'siz silme denemesi
 * ".akademitu.com" çerezine dokunmaz — kullanıcı "çıkış yaptım" görür, çerez
 * yerinde kalır ve panele geri döndüğünde hâlâ içeride olur.
 *
 * Doğru yazıldığında ise tek istek yeter: çerez zaten iki host'ta ortak
 * olduğu için portal.akademitu.com'dan yapılan çıkış ana siteyi de düşürür.
 * Sunucu tarafındaki Supabase oturumu da ayrıca iptal ediliyor
 * (bkz. server/routes/auth.ts).
 */
export function clearSessionCookies(req: Request, res: Response) {
  /* maxAge yerine aynı ad/path/flag'lerle temizlenmeli — tarayıcı çerezi
     ancak birebir eşleşen tanımla siler. */
  const options = {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    domain: cookieDomain(req),
  };
  res.clearCookie(ACCESS_COOKIE, options);
  res.clearCookie(REFRESH_COOKIE, options);
  res.clearCookie(SESSION_HINT_COOKIE, { ...options, httpOnly: false });

  /* Taşınmadan önce yazılmış host'a özel çerezler de düşmeli — aksi halde
     "çıkış yaptım" diyen kullanıcının tarayıcısında eski jeton kalır
     (aynı gerekçe setSessionCookies'te uzun uzun anlatılıyor). */
  if (options.domain) {
    const legacy = { ...options, domain: undefined };
    res.clearCookie(ACCESS_COOKIE, legacy);
    res.clearCookie(REFRESH_COOKIE, legacy);
    res.clearCookie(SESSION_HINT_COOKIE, { ...legacy, httpOnly: false });
  }
}

export function readAccessToken(req: Request): string | null {
  return (req.cookies?.[ACCESS_COOKIE] as string | undefined) || null;
}

export function readRefreshToken(req: Request): string | null {
  return (req.cookies?.[REFRESH_COOKIE] as string | undefined) || null;
}
