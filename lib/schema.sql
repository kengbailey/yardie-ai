-- Yardie AI Portal Database Schema
-- PostgreSQL 15+
--
-- Run with: npm run db:init
-- Or manually: psql $DATABASE_URL -f lib/schema.sql

-- ============================================================================
-- 1. Waitlist emails (migrated from SQLite)
-- ============================================================================

CREATE TABLE IF NOT EXISTS emails (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Better Auth tables
--    Better Auth auto-creates these, but we document the schema here so that
--    init-db.ts can pre-create them. Column names follow Better Auth conventions.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "user" (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  email             TEXT NOT NULL UNIQUE,
  "emailVerified"   BOOLEAN NOT NULL DEFAULT FALSE,
  image             TEXT,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  id              TEXT PRIMARY KEY,
  "expiresAt"     TIMESTAMPTZ NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress"     TEXT,
  "userAgent"     TEXT,
  "userId"        TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id                  TEXT PRIMARY KEY,
  "accountId"         TEXT NOT NULL,
  "providerId"        TEXT NOT NULL,
  "userId"            TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"       TEXT,
  "refreshToken"      TEXT,
  "idToken"           TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope               TEXT,
  password            TEXT,
  "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id            TEXT PRIMARY KEY,
  identifier    TEXT NOT NULL,
  value         TEXT NOT NULL,
  "expiresAt"   TIMESTAMPTZ NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Custom RBAC tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS instances (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  subdomain     TEXT NOT NULL UNIQUE,
  base_url      TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'provisioning')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instance_roles (
  user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  instance_id   TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'manager')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, instance_id)
);

CREATE TABLE IF NOT EXISTS global_roles (
  user_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('sysadmin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role)
);

-- ============================================================================
-- 4. Provisioning tasks (retry queue for user provisioning pipeline)
-- ============================================================================

CREATE TABLE IF NOT EXISTS provisioning_tasks (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  instance_id     TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  task_type       TEXT NOT NULL CHECK (task_type IN (
    'create_openwebui_account',
    'create_litellm_key',
    'send_welcome_email'
  )),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  last_error      TEXT,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_emails_submitted_at
  ON emails (submitted_at);

CREATE INDEX IF NOT EXISTS idx_session_user_id
  ON session ("userId");

CREATE INDEX IF NOT EXISTS idx_session_token
  ON session (token);

CREATE INDEX IF NOT EXISTS idx_account_user_id
  ON account ("userId");

CREATE INDEX IF NOT EXISTS idx_instance_roles_user_id
  ON instance_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_instance_roles_instance_id
  ON instance_roles (instance_id);

CREATE INDEX IF NOT EXISTS idx_global_roles_user_id
  ON global_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_provisioning_tasks_status
  ON provisioning_tasks (status, next_retry_at);

CREATE INDEX IF NOT EXISTS idx_provisioning_tasks_user_instance
  ON provisioning_tasks (user_id, instance_id);
