// server/index.ts
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { createServer } from 'http';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  const server = await registerRoutes(app);

  if (isProduction) {
    // --- Production-only logic ---
    const distPath = path.resolve(import.meta.dirname, "..", "public");
    app.use(express.static(distPath));
    app.use("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else {
    // --- Development-only logic ---
    const { setupVite } = await import("./vite.js");
    await setupVite(app, server);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    console.log(`Server listening on port ${port}`);
  });
})();