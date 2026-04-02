# Logging

This document covers structured logging patterns for backend development.

## Logger Utility

Use a simple structured logger that outputs JSON to stdout/stderr. Place in `lib/logger.ts`.

```typescript
// lib/logger.ts
const logger = {
  info: (msg: string, data?: Record<string, unknown>) =>
    console.log(
      JSON.stringify({ level: "info", msg, ...data, timestamp: new Date().toISOString() }),
    ),
  warn: (msg: string, data?: Record<string, unknown>) =>
    console.warn(
      JSON.stringify({ level: "warn", msg, ...data, timestamp: new Date().toISOString() }),
    ),
  error: (msg: string, data?: Record<string, unknown>) =>
    console.error(
      JSON.stringify({ level: "error", msg, ...data, timestamp: new Date().toISOString() }),
    ),
  debug: (msg: string, data?: Record<string, unknown>) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        JSON.stringify({ level: "debug", msg, ...data, timestamp: new Date().toISOString() }),
      );
    }
  },
};

export default logger;
```

## Usage in Route Handlers

```typescript
// app/api/submit-email/route.ts
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... validation and processing

    logger.info("Email submitted", { email: parsed.data.email });

    return NextResponse.json({ success: true, reason: "Email submitted" });
  } catch (error) {
    logger.error("Failed to submit email", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { success: false, reason: "Internal server error" },
      { status: 500 },
    );
  }
}
```

## Critical Rule: Use Structured Context

Always pass data as structured objects, not string interpolation.

```typescript
// BAD - String interpolation
logger.info(`User ${userId} submitted email ${email}`);

// GOOD - Structured context
logger.info("Email submitted", { userId, email });
```

## Log Levels Guide

| Level | Use Case | Example |
|-------|----------|---------|
| `debug` | Development diagnostics | Variable values, flow tracing |
| `info` | Normal operations | Email submitted, server started |
| `warn` | Recoverable issues | Duplicate email attempted, invalid input |
| `error` | Failures requiring attention | Database error, unexpected exception |

## What to Log

**Always log:**
- Database write operations (insert, update, delete)
- Errors and exceptions with context
- Application startup and configuration

**Log with care (avoid sensitive data):**
- User inputs (sanitize PII)

**Never log:**
- Passwords or tokens
- Full email addresses in production (truncate or hash)
- API keys or secrets

## Error Logging Pattern

Always include relevant context when logging errors.

```typescript
try {
  const result = db.prepare("INSERT INTO emails (email) VALUES (?)").run(email);
  logger.info("Email inserted", { email, rowId: result.lastInsertRowid });
} catch (error) {
  logger.error("Failed to insert email", {
    email,
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}
```

## Docker Log Output

In Docker, JSON-formatted logs written to stdout/stderr are automatically captured by the Docker logging driver. No additional log file configuration is needed.

```bash
# View logs
docker logs <container-name>

# Follow logs
docker logs -f <container-name>
```
