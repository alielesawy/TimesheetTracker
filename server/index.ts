import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import http from "http";
// DO NOT import modules that use environment variables here.

// --- CONFIGURATION FIRST ---
// Define paths and load environment variables immediately.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load variables from the .env file in the project root.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// --- THEN SETUP AND RUN THE APP ---
// We can now safely import other modules that might depend on the environment.
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Your logging middleware (no changes)
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson: Record<string, any>) {
    capturedJsonResponse = bodyJson;
    return originalResJson.call(res, bodyJson);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = http.createServer(app);

  // DYNAMICALLY import routes only after dotenv has run.
  // This is the key fix to prevent the race condition.
  const { registerRoutes } = await import("./routes");
  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(err);
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "development") {
    const projectRoot = path.resolve(__dirname, '..');
    await setupVite(app, server, projectRoot);
  } else {
    serveStatic(app, __dirname);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
