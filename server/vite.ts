import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger, type ViteDevServer } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server, projectRoot: string) {
  const vite: ViteDevServer = await createViteServer({
    ...viteConfig,
    server: {
        middlewareMode: true,
        hmr: { server },
    },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // Use the passed-in projectRoot to find the client's index.html
      const template = await fs.promises.readFile(
        path.resolve(projectRoot, "client", "index.html"),
        "utf-8",
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express, buildOutputDirectory: string) {
  // The 'public' folder is expected to be inside the build output directory (e.g., 'dist/public')
  const publicPath = path.resolve(buildOutputDirectory, "public");

  if (!fs.existsSync(publicPath)) {
    throw new Error(
      `Could not find the build directory: ${publicPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(publicPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(publicPath, "index.html"));
  });
}