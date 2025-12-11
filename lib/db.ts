// lib/db.ts
import { Pool, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Typed query helper for Postgres.
 * Wraps pg.Pool.query and returns just { rows } with a generic type.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const result = await pool.query<T>(text, params);
  return { rows: result.rows };
}
