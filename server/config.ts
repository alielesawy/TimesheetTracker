import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to the project root to find the .env file.
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

// Export the calculated paths to be used by other parts of the application.
// In prod, CWD will be /dist. In dev, it will be /server.
export const CWD = __dirname;
export const PROJECT_ROOT = path.resolve(__dirname, '..');

// Validate that critical variables are now set.
if (!process.env.DATABASE_URL) {
    throw new Error("FATAL: DATABASE_URL is not defined in the environment.");
}
