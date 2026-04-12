/**
 * Read-only PostgreSQL connection pool for the LiteLLM database.
 *
 * Used to query LiteLLM_SpendLogs for usage stats on the dashboard.
 * Separate from the portal pool (lib/db.ts) to maintain clean separation.
 *
 * Environment variables:
 *   LITELLM_DATABASE_URL - PostgreSQL connection string for litellm_db
 *     e.g. postgresql://postgres:password@postgres:5432/litellm_db
 */
import { Pool } from "pg";

const LITELLM_DATABASE_URL = process.env.LITELLM_DATABASE_URL ?? "";

const globalForLitellm = globalThis as unknown as {
  litellmPool: Pool | undefined;
};

export const litellmPool: Pool =
  globalForLitellm.litellmPool ??
  new Pool({
    connectionString: LITELLM_DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForLitellm.litellmPool = litellmPool;
}

/**
 * Query the LiteLLM database (read-only).
 */
export async function litellmQuery<T extends Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await litellmPool.query<T>(text, params);
  return result.rows;
}
