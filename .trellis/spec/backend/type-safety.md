# Type Safety Guidelines

This document covers TypeScript best practices and type safety patterns for backend development with Next.js API Route Handlers and Zod.

## Critical Rules

### 1. NO Non-null Assertions (`!`)

Never use the non-null assertion operator (`!`). It bypasses TypeScript's null checking and can lead to runtime errors.

```typescript
// BAD - Non-null assertion
const user = users.find(u => u.id === id);
await processUser(user!); // Dangerous!

// GOOD - Use local variable for type narrowing
const user = users.find(u => u.id === id);
if (!user) {
  return NextResponse.json(
    { success: false, reason: "User not found" },
    { status: 404 },
  );
}
// TypeScript now knows user is defined
await processUser(user);
```

### 2. All API Inputs Must Have Zod Schemas

Every API route handler must validate input using Zod schemas defined in `lib/types.ts`.

```typescript
// lib/types.ts
import { z } from "zod";

export const submitEmailInputSchema = z.object({
  email: z.string().email(),
});

export const updateSettingsInputSchema = z.object({
  theme: z.enum(["light", "dark"]).optional(),
  notifications: z.boolean().optional(),
});

export type SubmitEmailInput = z.infer<typeof submitEmailInputSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;
```

**Using schemas in route handlers:**

```typescript
// app/api/submit-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import { submitEmailInputSchema } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = submitEmailInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, reason: parsed.error.errors.map(e => e.message).join(", ") },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  // email is fully typed as string
  // ... implementation
}
```

### 3. Standard Response Format

All API responses must include `success` and `reason` fields for consistent error handling.

```typescript
// lib/types.ts
export const apiResponseSchema = z.object({
  success: z.boolean(),
  reason: z.string(),
  data: z.unknown().optional(),
});

export type ApiResponse = z.infer<typeof apiResponseSchema>;
```

```typescript
// Success response
return NextResponse.json({
  success: true,
  reason: "Operation completed successfully",
  data: result,
});

// Error response
return NextResponse.json(
  { success: false, reason: "Email already exists" },
  { status: 409 },
);
```

## Type Narrowing Patterns

### Array Operations

```typescript
// BAD - Assumes array has elements
const firstEmail = emails[0];
await processEmail(firstEmail!);

// GOOD - Check first
const firstEmail = emails[0];
if (!firstEmail) {
  return NextResponse.json(
    { success: false, reason: "No emails found" },
    { status: 404 },
  );
}
await processEmail(firstEmail);
```

### Optional Chaining with Fallback

```typescript
// BAD - Non-null assertion on optional property
const userName = user.profile!.name!;

// GOOD - Safe access with fallback
const userName = user.profile?.name ?? "Unknown";

// GOOD - When value is required, validate first
const profile = user.profile;
if (!profile?.name) {
  return NextResponse.json(
    { success: false, reason: "Profile name is required" },
    { status: 400 },
  );
}
const userName = profile.name;
```

### Database Row Results

better-sqlite3 `.get()` returns `undefined` when no row is found. Always handle this.

```typescript
interface EmailRow {
  id: number;
  email: string;
  submitted_at: string;
}

const row = db.prepare("SELECT * FROM emails WHERE id = ?").get(id) as EmailRow | undefined;

if (!row) {
  return NextResponse.json(
    { success: false, reason: "Email not found" },
    { status: 404 },
  );
}
// row is now guaranteed to be EmailRow
```

## Zod Schema Best Practices

### Reusable Base Schemas

```typescript
const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Compose into larger schemas
export const listEmailsInputSchema = paginationSchema.extend({
  search: z.string().optional(),
});
```

### Discriminated Unions

```typescript
export const notificationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("email"),
    recipient: z.string().email(),
    subject: z.string(),
  }),
  z.object({
    type: z.literal("sms"),
    phoneNumber: z.string(),
    message: z.string(),
  }),
]);

export type Notification = z.infer<typeof notificationSchema>;
```

### Transform and Refine

```typescript
// Transform input data
export const createItemInputSchema = z.object({
  name: z.string().transform(s => s.trim()),
  tags: z.string().transform(s => s.split(",").map(t => t.trim())),
});

// Add custom validation
export const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
}).refine(
  data => new Date(data.endDate) > new Date(data.startDate),
  { message: "End date must be after start date" },
);
```

## Error Handling in Route Handlers

Use standard HTTP status codes and the `{ success, reason }` response shape.

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // ... implementation
    return NextResponse.json({ success: true, reason: "Created" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, reason: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**Common HTTP status codes:**

| Status | Use Case |
|--------|----------|
| 200 | Success (read, update, delete) |
| 201 | Resource created |
| 400 | Validation error (Zod parse failure) |
| 404 | Resource not found |
| 409 | Conflict (duplicate entry) |
| 500 | Internal server error |

## Type Inference from Zod

Always derive TypeScript types from Zod schemas, not the other way around.

```typescript
// GOOD - Single source of truth
const emailSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  submitted_at: z.string(),
});
type Email = z.infer<typeof emailSchema>;

// BAD - Duplicated definition
interface Email {
  id: number;
  email: string;
  submitted_at: string;
}
```
