# Database Operations

This document covers database best practices using PostgreSQL with the `pg` driver.

## Connection Setup

Use a connection pool singleton stored on `globalThis` for Next.js hot-reload safety. Place in `lib/db.ts`.

```typescript
// lib/db.ts
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

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
```

**Database connection:**
- Development: `DATABASE_URL=postgresql://user:pass@localhost:5432/portal_db`
- Docker: `DATABASE_URL` set via docker-compose environment

## Schema Management

Schema is defined in `lib/schema.sql` and applied via `npm run db:init`. Use `CREATE TABLE IF NOT EXISTS` to make creation idempotent.

## Parameterized Queries (Prevent SQL Injection)

**Always use parameterized queries.** Never interpolate user input into SQL strings. PostgreSQL uses `$1`, `$2`, etc. for placeholders.

```typescript
// BAD - SQL injection vulnerability
await pool.query(`INSERT INTO emails (email) VALUES ('${email}')`);

// GOOD - Parameterized query
await pool.query("INSERT INTO emails (email) VALUES ($1)", [email]);
```

## Query Helpers

Use the `query` and `queryOne` helpers from `lib/db.ts`:

```typescript
import { query, queryOne } from "@/lib/db";

// Multiple rows
const rows = await query<EmailRow>("SELECT * FROM emails ORDER BY submitted_at DESC LIMIT $1", [50]);

// Single row (returns null if not found)
const row = await queryOne<EmailRow>("SELECT * FROM emails WHERE id = $1", [id]);
```

## CRUD Patterns

### Insert

```typescript
await pool.query("INSERT INTO emails (email) VALUES ($1)", [email]);
```

### Insert with RETURNING

```typescript
const result = await pool.query<EmailRow>(
  "INSERT INTO emails (email) VALUES ($1) RETURNING *",
  [email],
);
const created = result.rows[0];
```

### Select (single row)

```typescript
const result = await pool.query<EmailRow>(
  "SELECT * FROM emails WHERE id = $1",
  [id],
);
const row = result.rows[0];

if (!row) {
  return { success: false, reason: "Email not found" };
}
```

### Select (multiple rows)

```typescript
const result = await pool.query<EmailRow>(
  "SELECT * FROM emails ORDER BY submitted_at DESC LIMIT $1",
  [50],
);
const rows = result.rows;
```

### Update

```typescript
const result = await pool.query(
  "UPDATE emails SET email = $1 WHERE id = $2",
  [newEmail, id],
);
// result.rowCount - number of rows updated
```

### Delete

```typescript
const result = await pool.query("DELETE FROM emails WHERE id = $1", [id]);
// result.rowCount - number of rows deleted
```

## Transaction Patterns

Use a client from the pool for transactions.

### Basic Transaction

```typescript
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("INSERT INTO emails (email) VALUES ($1)", [email]);
  await client.query("INSERT INTO events (type, payload) VALUES ($1, $2)", ["email_submitted", email]);
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

## Conflict Handling

Use PostgreSQL's `ON CONFLICT` for upsert behavior.

```typescript
// Skip if email already exists
await pool.query(
  "INSERT INTO emails (email) VALUES ($1) ON CONFLICT DO NOTHING",
  [email],
);

// Upsert
await pool.query(
  "INSERT INTO emails (email) VALUES ($1) ON CONFLICT (email) DO UPDATE SET submitted_at = NOW()",
  [email],
);
```

## Type Safety

Define row interfaces and use them as generic parameters with `pool.query<T>()`:

```typescript
interface EmailRow {
  id: number;
  email: string;
  submitted_at: string;
}

const result = await pool.query<EmailRow>("SELECT * FROM emails");
const rows: EmailRow[] = result.rows; // Typed
```

## Performance Tips

1. **Use connection pooling** -- the Pool manages connections automatically
2. **Use parameterized queries** -- prevents SQL injection and allows query plan caching
3. **Use transactions for batch writes** -- group related operations atomically
4. **Use indexes** for frequently queried columns (defined in `lib/schema.sql`)
5. **Use `LIMIT`** on all SELECT queries that could return many rows
6. **All queries are async** -- always await them
