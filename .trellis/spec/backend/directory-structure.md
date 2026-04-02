# Directory Structure

This document describes the project organization for a Next.js 15 application using API Route Handlers.

## Project Structure

```
app/
├── api/
│   ├── submit-email/
│   │   └── route.ts           # POST handler for email submission
│   └── [other-routes]/
│       └── route.ts           # Additional route handlers
├── layout.tsx
└── page.tsx
lib/
├── db.ts                      # better-sqlite3 connection (singleton)
├── types.ts                   # Zod schemas and TypeScript types
└── utils.ts                   # Helper functions
public/
data/
└── emails.db                  # SQLite database file (Docker: /data/)
```

## File Responsibilities

### `lib/db.ts` - Database Connection

Singleton database connection using better-sqlite3.

```typescript
import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH || "./data/emails.db");
db.pragma("journal_mode = WAL");

export default db;
```

### `lib/types.ts` - Zod Schemas and Types

All Zod schemas and inferred TypeScript types for the application.

```typescript
import { z } from "zod";

// Input Schemas
export const submitEmailInputSchema = z.object({
  email: z.string().email(),
});

// Response Schemas
export const apiResponseSchema = z.object({
  success: z.boolean(),
  reason: z.string(),
});

// Type exports
export type SubmitEmailInput = z.infer<typeof submitEmailInputSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
```

### `lib/utils.ts` - Helper Functions

Shared utility functions.

```typescript
import { ZodError } from "zod";

/**
 * Format Zod validation errors into a readable string
 */
export function formatZodError(error: ZodError): string {
  return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
}
```

### `app/api/{route}/route.ts` - Route Handlers

Each API route is a Next.js Route Handler with Zod validation.

```typescript
// app/api/submit-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { submitEmailInputSchema } from "@/lib/types";
import { formatZodError } from "@/lib/utils";
import type { ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const parsed = submitEmailInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, reason: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const insert = db.prepare("INSERT INTO emails (email) VALUES (?)");
    insert.run(parsed.data.email);

    return NextResponse.json({
      success: true,
      reason: "Email submitted successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", msg: "Failed to submit email", error: message }));

    return NextResponse.json(
      { success: false, reason: "Internal server error" },
      { status: 500 },
    );
  }
}
```

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Route handlers | `route.ts` in named directory | `app/api/submit-email/route.ts` |
| Lib files | Noun-based, kebab-case | `db.ts`, `types.ts`, `utils.ts` |

### Exports

| Type | Convention | Example |
|------|------------|---------|
| Zod schemas | `{name}Schema` suffix | `submitEmailInputSchema` |
| Types | PascalCase | `SubmitEmailInput` |
| Helper functions | camelCase verb | `formatZodError` |
| Route handlers | HTTP method name | `POST`, `GET`, `PUT`, `DELETE` |

## When to Create New Routes

Create a new route directory when:

1. The endpoint serves a distinct purpose (submit email, get status, etc.)
2. A different HTTP method is needed for the same resource

Keep route handlers focused:

1. Validate input with Zod
2. Perform database operation
3. Return standardized response
