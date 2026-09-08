// Vercel serverless function entry point: catches every /api/* request and
// hands it to the same Express app used by server.ts (see the VERCEL guard
// there — importing this module does not start a standalone server).
/*
 * `.js` uzantısı ZORUNLU — kaldırmayın.
 * ---------------------------------------------------------------------------
 * package.json'da "type": "module" var, dolayısıyla Vercel bu dosyayı ESM
 * olarak derleyip çalıştırıyor. Node'un ESM çözümleyicisi, CommonJS'in aksine
 * uzantı tahmin ETMEZ: uzantısız `"../server"` yazıldığında `/var/task/server`
 * diye bir dosya arar, bulamaz ve fonksiyon daha ilk satırda çöker.
 *
 * Gerçek belirti buydu: HER /api/* isteği 500 + FUNCTION_INVOCATION_FAILED
 * veriyordu — hiçbir route'a hiç girilmeden, cold start'ta. Vercel loglarındaki
 * karşılığı:
 *   ERR_MODULE_NOT_FOUND: Cannot find module '/var/task/server'
 *   imported from /var/task/api/[...path].js
 *
 * TypeScript kaynağı `server.ts` olmasına rağmen burada `.js` yazılır; derleyici
 * `.js` -> `.ts` eşlemesini kendisi yapar, emit edilen dosyada da doğru uzantı
 * kalır. (Bu, Node ESM projelerinde standart TypeScript kalıbıdır.)
 */
import app from "../server.js";

export default function handler(req: any, res: any) {
  // Express's app(req, res) is fire-and-forget — it doesn't return a
  // Promise, it just writes to `res` asynchronously. Returning that
  // (undefined) directly risks Vercel's Node runtime treating the
  // invocation as finished before Express has actually written a
  // response. Wrapping it so the handler's Promise only resolves once the
  // response actually finishes (or rejects on a genuine error) is the
  // standard, documented-safe way to run Express as a Vercel function.
  return new Promise<void>((resolve, reject) => {
    res.on("finish", resolve);
    res.on("error", reject);
    try {
      app(req, res);
    } catch (err: unknown) {
      reject(err);
    }
  });
}
