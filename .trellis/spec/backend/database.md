# Database Operations

This document covers database best practices using better-sqlite3 with SQLite.

## Connection Setup

Use a singleton pattern for the database connection. Place in `lib/db.ts`.

```typescript
// lib/db.ts
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "./data/emails.db";

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma("journal_mode = WAL");

export default db;
```

**Database file location:**
- Development: `./data/emails.db` (project root)
- Docker: `/data/emails.db` (mounted volume, set via `DB_PATH` env var)

## Table Creation

Always use `IF NOT EXISTS` to make table creation idempotent. Run migrations on app startup or as a separate init step.

```typescript
// lib/db.ts (continued)
db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);
```

For multiple tables, create them all in the same `exec` call or in sequence:

```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    payload TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
```

## Parameterized Queries (Prevent SQL Injection)

**Always use parameterized queries.** Never interpolate user input into SQL strings.

```typescript
// BAD - SQL injection vulnerability
db.prepare(`INSERT INTO emails (email) VALUES ('${email}')`).run();

// GOOD - Parameterized query
db.prepare("INSERT INTO emails (email) VALUES (?)").run(email);

// GOOD - Named parameters
db.prepare("INSERT INTO emails (email) VALUES (@email)").run({ email });
```

## Prepared Statements

Use prepared statements for queries that run repeatedly. Store them as module-level constants.

```typescript
import db from "@/lib/db";

// Prepare once, use many times
const insertEmail = db.prepare("INSERT INTO emails (email) VALUES (?)");
const getEmails = db.prepare("SELECT * FROM emails ORDER BY submitted_at DESC");
const getEmailById = db.prepare("SELECT * FROM emails WHERE id = ?");
const deleteEmail = db.prepare("DELETE FROM emails WHERE id = ?");
```

## CRUD Patterns

### Insert

```typescript
const insert = db.prepare("INSERT INTO emails (email) VALUES (?)");
const result = insert.run("user@example.com");
// result.lastInsertRowid - the new row ID
// result.changes - number of rows affected (1)
```

### Select (single row)

```typescript
const getById = db.prepare("SELECT * FROM emails WHERE id = ?");
const row = getById.get(1) as { id: number; email: string; submitted_at: string } | undefined;

if (!row) {
  return { success: false, reason: "Email not found" };
}
```

### Select (multiple rows)

```typescript
const getAll = db.prepare("SELECT * FROM emails ORDER BY submitted_at DESC LIMIT ?");
const rows = getAll.all(50) as Array<{ id: number; email: string; submitted_at: string }>;
```

### Update

```typescript
const update = db.prepare("UPDATE emails SET email = ? WHERE id = ?");
const result = update.run("new@example.com", 1);
// result.changes - number of rows updated
```

### Delete

```typescript
const remove = db.prepare("DELETE FROM emails WHERE id = ?");
const result = remove.run(1);
// result.changes - number of rows deleted
```

## Transaction Patterns

Transactions ensure atomicity -- either all operations succeed or none do.

### Basic Transaction

```typescript
const insertEmail = db.prepare("INSERT INTO emails (email) VALUES (?)");
const insertEvent = db.prepare("INSERT INTO events (type, payload) VALUES (?, ?)");

const submitEmail = db.transaction((email: string) => {
  insertEmail.run(email);
  insertEvent.run("email_submitted", email);
});

// Use it -- automatically wrapped in BEGIN/COMMIT, rolls back on error
submitEmail("user@example.com");
```

### Transaction with Return Value

```typescript
const insertEmail = db.prepare("INSERT INTO emails (email) VALUES (?)");
const getById = db.prepare("SELECT * FROM emails WHERE id = ?");

const createEmail = db.transaction((email: string) => {
  const result = insertEmail.run(email);
  const created = getById.get(result.lastInsertRowid);
  return created;
});

const newEmail = createEmail("user@example.com");
```

### Batch Insert with Transaction

Wrap batch inserts in a transaction for performance (SQLite commits once instead of per-row).

```typescript
const insertEmail = db.prepare("INSERT INTO emails (email) VALUES (?)");

const insertMany = db.transaction((emails: string[]) => {
  for (const email of emails) {
    insertEmail.run(email);
  }
});

insertMany(["a@example.com", "b@example.com", "c@example.com"]);
```

## Conflict Handling

Use `INSERT OR IGNORE` or `INSERT OR REPLACE` for upsert-like behavior.

```typescript
// Skip if email already exists (requires UNIQUE constraint on email column)
const insertOrIgnore = db.prepare("INSERT OR IGNORE INTO emails (email) VALUES (?)");
insertOrIgnore.run("user@example.com");

// Replace if email already exists
const insertOrReplace = db.prepare("INSERT OR REPLACE INTO emails (email) VALUES (?)");
insertOrReplace.run("user@example.com");

// Upsert with ON CONFLICT (SQLite 3.24+)
const upsert = db.prepare(`
  INSERT INTO emails (email) VALUES (?)
  ON CONFLICT(email) DO UPDATE SET submitted_at = datetime('now')
`);
upsert.run("user@example.com");
```

## Type Safety with better-sqlite3

better-sqlite3 returns plain objects. Define interfaces for your rows and cast results.

```typescript
interface EmailRow {
  id: number;
  email: string;
  submitted_at: string;
}

const getAll = db.prepare("SELECT * FROM emails ORDER BY submitted_at DESC");
const rows = getAll.all() as EmailRow[];

const getById = db.prepare("SELECT * FROM emails WHERE id = ?");
const row = getById.get(1) as EmailRow | undefined;
```

## Performance Tips

1. **Use WAL mode** -- already set in connection setup, allows concurrent reads
2. **Use prepared statements** -- avoid re-parsing SQL on every call
3. **Wrap batch writes in transactions** -- dramatically faster than individual inserts
4. **Use indexes** for frequently queried columns:

```typescript
db.exec("CREATE INDEX IF NOT EXISTS idx_emails_submitted_at ON emails (submitted_at)");
```

5. **Use `LIMIT`** on all SELECT queries that could return many rows
6. **SQLite is synchronous** in better-sqlite3 -- this is intentional and fast; do not wrap in Promises unnecessarily
