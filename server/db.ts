// server/db.ts

import { Pool } from 'pg';
// Change 1: Use the correct drizzle adapter for the 'pg' driver
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";


if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Change 2: Export the pool so other files can use it
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Change 3: The syntax for node-postgres is slightly different
export const db = drizzle(pool, { schema });

