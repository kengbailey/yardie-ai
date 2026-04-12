/**
 * PostgreSQL connection pool singleton.
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string
 *     e.g. postgresql://user:password@localhost:5432/portal_db
 */
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

/**
 * Global singleton pool. In development, Next.js hot-reloads modules, so we
 * store the pool on `globalThis` to avoid creating a new pool on every reload.
 */
const globalForPg = globalThis as unknown as { pgPool: Pool | undefined };

export const pool: Pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

/**
 * Execute a parameterized query and return all rows.
 *
 * Always use parameterized queries to prevent SQL injection:
 *   query("SELECT * FROM users WHERE id = $1", [userId])
 */
export async function query<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/**
 * Execute a parameterized query and return the first row or null.
 */
export async function queryOne<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const result = await pool.query<T>(text, params);
  return result.rows[0] ?? null;
}

export default pool;
