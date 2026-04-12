# Directory Structure

This document describes the project organization for a Next.js 15 application using API Route Handlers.

## Project Structure

```
app/
├── api/
│   ├── auth/
│   │   └── [...all]/
│   │       └── route.ts           # Better Auth catch-all handler
│   ├── submit-email/
│   │   └── route.ts               # POST handler for email submission
│   └── [other-routes]/
│       └── route.ts               # Additional route handlers
├── layout.tsx
└── page.tsx
lib/
├── auth.ts                        # Better Auth server config
├── auth-client.ts                 # Better Auth React client
├── db.ts                          # PostgreSQL connection pool (singleton)
├── permissions.ts                 # RBAC permission utilities
├── schema.sql                     # Database schema (all tables)
├── types.ts                       # Zod schemas and TypeScript types
└── utils.ts                       # Helper functions
scripts/
├── init-db.ts                     # Database initialization script
└── seed-admin.ts                  # First sysadmin creation CLI
middleware.ts                      # Route protection + RBAC
```

## File Responsibilities

### `lib/db.ts` - Database Connection

Singleton PostgreSQL connection pool using `pg`.

```typescript
import { Pool } from "pg";

export const pool: Pool = ...;  // Singleton via globalThis
export async function query<T>(text: string, params?: unknown[]): Promise<T[]>;
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null>;
```

### `lib/auth.ts` - Better Auth Server Config

Server-side Better Auth instance with PostgreSQL, Argon2id hashing, Resend email transport, and session/cookie configuration.

### `lib/auth-client.ts` - Better Auth Client

Client-side auth utilities for React components (signIn, signUp, signOut, useSession).

### `lib/permissions.ts` - RBAC Utilities

Functions to check user permissions: `getUserPermissions`, `canManageInstance`, `canAccessInstance`, `isSysadmin`.

### `lib/types.ts` - Zod Schemas and Types

All Zod schemas and inferred TypeScript types for the application.

### `middleware.ts` - Route Protection

Next.js middleware that protects `/dashboard/*`, `/instances/*`, and `/admin/*` routes.

### `app/api/{route}/route.ts` - Route Handlers

Each API route is a Next.js Route Handler with Zod validation.

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Route handlers | `route.ts` in named directory | `app/api/submit-email/route.ts` |
| Lib files | Noun-based, kebab-case | `db.ts`, `types.ts`, `auth-client.ts` |
| Scripts | Verb-noun, kebab-case | `init-db.ts`, `seed-admin.ts` |

### Exports

| Type | Convention | Example |
|------|------------|---------|
| Zod schemas | `{name}Schema` suffix | `emailSubmissionSchema` |
| Types | PascalCase | `EmailSubmission` |
| Helper functions | camelCase verb | `getUserPermissions` |
| Route handlers | HTTP method name | `POST`, `GET`, `PUT`, `DELETE` |
