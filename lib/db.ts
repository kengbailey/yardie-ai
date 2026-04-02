import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { dirname } from "path";

const DB_PATH = process.env.DB_PATH || "./data/emails.db";

// Ensure data directory exists
mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

export const insertEmail = db.prepare(
  "INSERT INTO emails (email) VALUES (?)"
);
export const getEmails = db.prepare(
  "SELECT * FROM emails ORDER BY submitted_at DESC"
);

export default db;
