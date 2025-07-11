// server/vite.ts
import type { Express } from "express";
import type { Server } from "http";
import { createServer as createViteServer, createLogger } from "vite";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: { 
        middlewareMode: true,
        hmr: { server },
        allowedHosts: true
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // The catch-all route to serve index.html
  app.use("*", async (req, res, next) => {
    try {
      const url = req.originalUrl;
      const template = await vite.transformIndexHtml(url, `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}