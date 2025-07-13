import path from "path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const initializeConfig = () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const envPath = path.resolve(__dirname, '..', '.env');
    dotenv.config({ path: envPath });

    if (!process.env.DATABASE_URL) {
        throw new Error("FATAL: DATABASE_URL is not defined in the environment.");
    }

    // Return a single object containing all config and paths.
    return {
        CWD: __dirname,
        PROJECT_ROOT: path.resolve(__dirname, '..')
    };
};

export const config = initializeConfig();
