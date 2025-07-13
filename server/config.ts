import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// This file has one purpose: load environment variables.
// By importing it first, we ensure process.env is populated.

const __filename = fileURLToPath(import.meta.url);
// In dev, __dirname is /server. In prod, it's /dist.
const __dirname = path.dirname(__filename);

// Resolve path to the project root to find the .env file.
const envPath = path.resolve(__dirname, '..', '.env');

dotenv.config({ path: envPath });

// You can also add validation here to ensure critical variables are set
if (!process.env.DATABASE_URL) {
    throw new Error("FATAL: DATABASE_URL is not defined in the environment.");
}