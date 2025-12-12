import { Pool } from "pg";

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
