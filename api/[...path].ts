// Vercel serverless function entry point: catches every /api/* request and
// hands it to the same Express app used by server.ts (see the VERCEL guard
// there — importing this module does not start a standalone server).
import app from "../server";

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
