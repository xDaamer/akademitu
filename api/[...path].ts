// Vercel serverless function entry point: catches every /api/* request and
// hands it to the same Express app used by server.ts (see the VERCEL guard
// there — importing this module does not start a standalone server).
import app from "../server";

export default function handler(req: any, res: any) {
  return app(req, res);
}
