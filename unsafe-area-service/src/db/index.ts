// unsafe-area-service/src/db/index.ts

import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Thin wrapper around pg's pool.query with generics.
 *
 * Usage:
 *   const result = await query<MyRowType>("SELECT * FROM foo WHERE id = $1", [id]);
 *   const rows = result.rows; // MyRowType[]
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export { pool };
