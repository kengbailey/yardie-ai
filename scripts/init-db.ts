/**
 * Database initialization script.
 *
 * Connects to PostgreSQL and runs lib/schema.sql to create all tables.
 *
 * Usage:
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/portal_db npm run db:init
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  console.error("Example: postgresql://user:password@localhost:5432/portal_db");
  process.exit(1);
}

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    console.info("Connecting to database...");
    const client = await pool.connect();

    try {
      const schemaPath = resolve(__dirname, "../lib/schema.sql");
      const schemaSql = readFileSync(schemaPath, "utf-8");

      console.info("Running schema.sql...");
      await client.query(schemaSql);
      console.info("Database initialized successfully.");
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to initialize database:", message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
