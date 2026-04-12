/**
 * Seed the first sysadmin user.
 *
 * Usage:
 *   npm run seed:admin -- --email admin@yardie.ai
 *   npm run seed:admin -- --email admin@yardie.ai --name "Admin User"
 *
 * The command will prompt for a password, or you can pipe it:
 *   echo "mypassword" | npm run seed:admin -- --email admin@yardie.ai
 *
 * Environment variables:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

import * as argon2 from "argon2";
import { Pool } from "pg";

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { email: string; name: string } {
  let email = "";
  let name = "Admin";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--email" && next) {
      email = next;
      i++;
    } else if (arg === "--name" && next) {
      name = next;
      i++;
    }
  }

  if (!email) {
    console.error("Usage: npm run seed:admin -- --email <email> [--name <name>]");
    process.exit(1);
  }

  return { email, name };
}

// ---------------------------------------------------------------------------
// Read password from stdin
// ---------------------------------------------------------------------------

async function readPassword(): Promise<string> {
  // If stdin is not a TTY (piped input), read directly
  if (!process.stdin.isTTY) {
    return new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf-8");
      process.stdin.on("data", (chunk: string) => {
        data += chunk;
      });
      process.stdin.on("end", () => {
        resolve(data.trim());
      });
      process.stdin.on("error", reject);
    });
  }

  // Interactive prompt
  const rl = createInterface({
    input: process.stdin,
    output: process.stderr, // Use stderr so password prompt doesn't go to stdout
  });

  return new Promise((resolve) => {
    rl.question("Enter password for admin user: ", (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { email, name } = parseArgs(process.argv.slice(2));

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  console.info(`Creating sysadmin user: ${email}`);

  const password = await readPassword();

  if (password.length < 8) {
    console.error("ERROR: Password must be at least 8 characters.");
    process.exit(1);
  }

  // Hash password with Argon2id (same params as auth.ts)
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 4,
  });

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });

  try {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const userId = randomUUID();
      const now = new Date().toISOString();

      // Check if user already exists
      const existing = await client.query(
        `SELECT id FROM "user" WHERE email = $1`,
        [email],
      );

      if (existing.rows.length > 0) {
        const existingUser = existing.rows[0] as { id: string };

        // User exists: just ensure they have sysadmin role
        await client.query(
          `INSERT INTO global_roles (user_id, role, created_at)
           VALUES ($1, 'sysadmin', $2)
           ON CONFLICT (user_id, role) DO NOTHING`,
          [existingUser.id, now],
        );

        await client.query("COMMIT");
        console.info(
          `User ${email} already exists (id: ${existingUser.id}). Ensured sysadmin role.`,
        );
        return;
      }

      // Create user record (Better Auth format)
      await client.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, TRUE, $4, $5)`,
        [userId, name, email, now, now],
      );

      // Create account record (Better Auth email/password format)
      const accountId = randomUUID();
      await client.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ($1, $2, 'credential', $3, $4, $5, $6)`,
        [accountId, userId, userId, hashedPassword, now, now],
      );

      // Assign sysadmin global role
      await client.query(
        `INSERT INTO global_roles (user_id, role, created_at)
         VALUES ($1, 'sysadmin', $2)`,
        [userId, now],
      );

      await client.query("COMMIT");

      console.info(`Sysadmin user created successfully.`);
      console.info(`  User ID: ${userId}`);
      console.info(`  Email:   ${email}`);
      console.info(`  Name:    ${name}`);
      console.info(`  Role:    sysadmin`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to seed admin:", message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
