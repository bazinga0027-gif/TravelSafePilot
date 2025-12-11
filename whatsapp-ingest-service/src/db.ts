// whatsapp-ingest-service/src/db.ts
import { Pool, QueryResult, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Simple typed query helper for the WhatsApp ingest service.
 * Returns the full pg QueryResult so you can access rows, rowCount, etc.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();

  try {
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}
