// Local-dev-only entry point. `npm run dev` runs THIS file (not server.ts
// directly) specifically so that `vite` — a dev-only dependency — never
// appears anywhere in server.ts's own import graph. api/[...path].ts (the
// Vercel serverless function for /api/*) imports server.ts directly, and
// Vercel's function bundler traces every import reachable from that file,
// static or dynamic, to decide what ships in the function. A `vite` import
// living in server.ts (even a conditional/dynamic one) was confirmed to
// break the deployed function at runtime. Keeping it here instead means
// it's structurally impossible for it to leak into the Vercel build.
import { createServer as createViteServer } from "vite";
import app from "./server";

const PORT = 3000;

async function startDevServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startDevServer();
