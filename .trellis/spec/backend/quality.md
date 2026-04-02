# Pre-commit Checklist

Run through this checklist before committing backend code.

## Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build verification
npm run build
```

## Type Safety

- [ ] **No non-null assertions (`!`)** - Use local variables and conditionals for type narrowing
- [ ] **All API inputs validated with Zod** - Schemas defined in `lib/types.ts`
- [ ] **All API responses use `{ success, reason }` format**
- [ ] **Types inferred from Zod schemas** - Not duplicated as separate interfaces

## Database Operations

- [ ] **Parameterized queries used** - No string interpolation in SQL
- [ ] **Prepared statements for repeated queries** - Defined at module level
- [ ] **Transactions used for multi-step writes** - Wrap related operations
- [ ] **`IF NOT EXISTS` on table creation** - Idempotent migrations
- [ ] **Row results checked for undefined** - `.get()` can return `undefined`

## Logging

- [ ] **Structured logger used** - Import from `@/lib/logger`
- [ ] **Structured context passed** - Objects, not string interpolation
- [ ] **Errors logged with context** - Include relevant IDs and error messages
- [ ] **Sensitive data excluded** - No passwords, tokens, or full PII in logs

## Error Handling

- [ ] **Errors properly caught and logged**
- [ ] **Appropriate HTTP status codes returned** - 400, 404, 409, 500, etc.
- [ ] **Try/catch wraps route handler body** - No unhandled exceptions

## Code Organization

- [ ] **Route handlers in `app/api/{route}/route.ts`**
- [ ] **Zod schemas in `lib/types.ts`**
- [ ] **Database connection in `lib/db.ts`**
- [ ] **Helper functions in `lib/utils.ts`**

## Quick Reference

### Response Format
```typescript
return NextResponse.json({
  success: true,
  reason: "Operation completed successfully",
});
```

### Zod Validation Pattern
```typescript
const parsed = inputSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { success: false, reason: parsed.error.errors.map(e => e.message).join(", ") },
    { status: 400 },
  );
}
```

### Database Query Pattern
```typescript
const stmt = db.prepare("SELECT * FROM emails WHERE id = ?");
const row = stmt.get(id) as EmailRow | undefined;
if (!row) {
  return NextResponse.json(
    { success: false, reason: "Not found" },
    { status: 404 },
  );
}
```

### Logging Pattern
```typescript
logger.info("Operation completed", {
  operationId,
  itemCount: items.length,
});
```

### Error Pattern
```typescript
try {
  // ... operation
} catch (error) {
  logger.error("Operation failed", {
    error: error instanceof Error ? error.message : String(error),
  });
  return NextResponse.json(
    { success: false, reason: "Internal server error" },
    { status: 500 },
  );
}
```
