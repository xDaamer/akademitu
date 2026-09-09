import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/*
 * SUNUCU TARAFI SUPABASE İSTEMCİLERİ
 * ===========================================================================
 * Üç ayrı istemci var ve hangisinin ne zaman kullanılacağı GÜVENLİK MODELİNİN
 * KENDİSİ. Karıştırılırsa RLS baypas edilir.
 *
 *   1) anonServerClient()  — auth çağrıları (giriş/kayıt/yenileme).
 *      anon anahtarı artık tarayıcıya HİÇ gitmiyor, yalnızca burada yaşıyor.
 *      persistSession/autoRefreshToken kapalı: sunucu durumsuz, oturumu
 *      tutan taraf tarayıcıdaki httpOnly çerez.
 *
 *   2) userClient(accessToken) — GİRİŞ YAPMIŞ KULLANICININ VERİSİ.
 *      İstek başına kurulur, kullanıcının kendi JWT'sini taşır, dolayısıyla
 *      RLS o kullanıcı olarak uygulanır. Kullanıcı verisine erişen her route
 *      BUNU kullanmalı.
 *
 *   3) serviceClient() — RLS'i TAMAMEN BAYPAS EDER.
 *      Yalnızca kullanıcıya ait olmayan, sunucunun kendi işleri için:
 *      lead kaydı (henüz kimse giriş yapmamış), yayınlanmış yorumların
 *      okunması, hız limiti sayacı ve girişte telefon -> e-posta çevirisi
 *      (oturum henüz yokken yapılması gereken tek şey).
 *
 * Kullanıcı verisini serviceClient() ile okumak, bu katmanın var oluş
 * sebebini ortadan kaldırır: route'daki tek bir yetkilendirme hatası tüm
 * tabloyu açar, çünkü altta hiçbir emniyet ağı kalmaz.
 */

/*
 * ENV HER ÇAĞRIDA OKUNUR, MODÜL DÜZEYİNDE DEĞİL — ZORUNLU.
 * ESM import'ları, import eden modülün gövdesinden ÖNCE çalışır: bu dosya
 * server.ts'in en üstünde import edildiği için, buradaki modül düzeyi bir
 * `process.env.X` okuması server.ts'teki dotenv.config()'ten önce gerçekleşir
 * ve .env henüz yüklenmemiş olduğu için hepsi boş çıkardı (yerel geliştirmede
 * üç istemci de sessizce null olurdu). Fonksiyon içinde okumak bu sıralama
 * tuzağını tamamen ortadan kaldırıyor.
 */
function env() {
  return {
    /*
     * VITE_ önekli adlar GERİYE DÖNÜK UYUMLULUK için okunuyor.
     * Dağıtımda uzun süredir yalnızca VITE_SUPABASE_URL ve
     * VITE_SUPABASE_ANON_KEY tanımlıydı; değerleri zaten bunlarla aynı, tek
     * fark ad. Sunucunun onları da kabul etmesi, dağıtımda değişken
     * yeniden adlandırma zorunluluğunu kaldırıyor.
     *
     * Bunları sunucuda okumak GÜVENLİK SORUNU DEĞİL: "VITE_" öneki yalnızca
     * "Vite bunu istemci bundle'ına gömebilir" demek ve artık `src/` içinde
     * hiçbir kod import.meta.env.VITE_SUPABASE_* okumuyor, dolayısıyla Vite
     * onları bundle'a hiç koymuyor (dist/ içinde arandı, yok).
     *
     * Yine de TERCİH EDİLEN adlar önekli olmayanlar: yeni bir istemci kodu
     * kazara VITE_ değişkenine dokunursa anahtar tekrar tarayıcıya sızardı.
     * SUPABASE_SERVICE_ROLE_KEY'in VITE_ karşılığı BİLEREK YOK — o anahtarın
     * bundle'a gömülebilir bir adla anılması bile istenmez.
     */
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

/* Sunucuda oturum saklamak anlamsız ve TEHLİKELİ olurdu: modül düzeyindeki
   bir istemci, tüm istekler arasında paylaşılır — bir kullanıcının oturumu
   diğerine sızabilirdi. */
const STATELESS_AUTH = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;

function isConfigured(url: string, key: string) {
  return Boolean(url && key && url.startsWith("http"));
}

/** Auth çağrıları için. Yapılandırılmamışsa null — çağıran fail-closed olur. */
export function anonServerClient(): SupabaseClient | null {
  const { url, anonKey } = env();
  if (!isConfigured(url, anonKey)) return null;
  try {
    return createClient(url, anonKey, STATELESS_AUTH);
  } catch (err: any) {
    console.error("[Supabase] anon istemcisi kurulamadı:", err?.message || err);
    return null;
  }
}

/**
 * Giriş yapmış kullanıcı adına çalışan istemci. Token her istekte çerezden
 * okunup buraya verilir; istemci istekler arasında paylaşılmaz.
 */
export function userClient(accessToken: string): SupabaseClient | null {
  const { url, anonKey } = env();
  if (!isConfigured(url, anonKey) || !accessToken) return null;
  try {
    return createClient(url, anonKey, {
      ...STATELESS_AUTH,
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
  } catch (err: any) {
    console.error("[Supabase] kullanıcı istemcisi kurulamadı:", err?.message || err);
    return null;
  }
}

/** RLS'i baypas eder — yalnızca yukarıdaki listede sayılan işler için. */
export function serviceClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = env();
  if (!isConfigured(url, serviceRoleKey)) return null;
  try {
    return createClient(url, serviceRoleKey, STATELESS_AUTH);
  } catch (err: any) {
    console.error("[Supabase] servis istemcisi kurulamadı:", err?.message || err);
    return null;
  }
}

/** Başlangıçta bir kez uyarmak için — her istekte log basmasın diye. */
export function describeConfiguration() {
  const { url, anonKey, serviceRoleKey } = env();
  return {
    url: Boolean(url),
    anonKey: Boolean(anonKey),
    serviceRoleKey: Boolean(serviceRoleKey),
  };
}
