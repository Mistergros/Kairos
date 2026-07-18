import { Pool } from "pg";
import dotenv from "dotenv";

// Loaded here (not just by callers) because ES module imports are hoisted:
// a caller's dotenv.config() placed after `import { query } from "./db.js"`
// still runs after this module's top-level code, so DATABASE_URL would
// otherwise be undefined when the Pool below is constructed.
dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL!;
export const pool = new Pool({ connectionString });

export async function query<T = any>(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}
