import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- CONFIGURATION FIRST ---
// It is crucial to define paths and load environment variables before importing
// any other application modules that might depend on them.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure dotenv to load variables from the .env file in the project root.
const dotenvResult = dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Optional: Add a check to see if the .env file was loaded successfully in production.
if (dotenvResult.error && process.env.NODE_ENV === 'production') {
    console.error("Error loading .env file", dotenvResult.error);
    // In a real production scenario, you might want to exit if the config is missing.
    // process.exit(1);
}


// --- THEN IMPORT APPLICATION MODULES ---
// Now that environment variables are loaded, we can safely import other modules.
import express, { type Request, Response, NextFunction } from "express";
import http from "http";
import { registerRoutes } from "./routes";
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
