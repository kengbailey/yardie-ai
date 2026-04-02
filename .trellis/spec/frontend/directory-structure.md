# Directory Structure

This document describes the folder conventions for the Next.js application.

## Overview

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout
├── page.tsx                  # Home page
├── globals.css               # Global styles (Tailwind imports)
├── api/                      # API Routes
│   └── [route]/
│       └── route.ts          # Route handler (GET, POST, etc.)
├── (marketing)/              # Public marketing pages
│   └── page.tsx
├── dashboard/                # App pages
│   └── page.tsx
└── [other-routes]/
    └── page.tsx
components/                   # React components
├── ui/                       # Reusable UI components (Button, Card, Input)
└── [feature]/                # Feature-specific components
lib/                          # Shared utilities and configuration
├── db.ts                     # Database connection
├── utils.ts                  # Utility functions (cn, formatters, etc.)
└── types.ts                  # Shared TypeScript types
public/                       # Static assets
├── images/
└── fonts/
```

## App Directory

### Route Structure

Pages live in the `app/` directory following Next.js App Router conventions:

```
app/
├── layout.tsx                # Root layout (wraps all pages)
├── page.tsx                  # / (home)
├── loading.tsx               # Loading UI (optional)
├── error.tsx                 # Error UI (optional)
├── not-found.tsx             # 404 UI (optional)
├── api/
│   ├── users/
│   │   └── route.ts          # /api/users (GET, POST)
│   └── users/[id]/
│       └── route.ts          # /api/users/:id (GET, PUT, DELETE)
├── (marketing)/
│   ├── layout.tsx            # Marketing layout
│   ├── page.tsx              # Marketing home
│   └── about/
│       └── page.tsx          # /about
└── dashboard/
    ├── layout.tsx            # Dashboard layout
    ├── page.tsx              # /dashboard
    └── settings/
        └── page.tsx          # /dashboard/settings
```

### Route Groups

Use parentheses `()` for route groups that do not affect the URL:

```
app/
├── (marketing)/              # URL: / (no /marketing prefix)
│   ├── layout.tsx            # Shared marketing layout
│   └── page.tsx
└── (app)/                    # URL: / (no /app prefix)
    ├── layout.tsx            # Shared app layout
    └── dashboard/
        └── page.tsx          # URL: /dashboard
```

### API Routes

API routes use the `route.ts` convention:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Handle GET /api/users
  return NextResponse.json({ users: [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // Handle POST /api/users
  return NextResponse.json({ user: body }, { status: 201 });
}
```

## Components Directory

### UI Components

Reusable, generic UI components:

```
components/
├── ui/
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── index.ts              # Barrel export
```

### Feature Components

Components specific to a feature or page:

```
components/
├── dashboard/
│   ├── DashboardHeader.tsx
│   ├── StatsCard.tsx
│   ├── ActivityFeed.tsx
│   └── index.ts              # Barrel export
├── users/
│   ├── UserProfile.tsx
│   ├── UserList.tsx
│   └── index.ts
```

## Lib Directory

Shared utilities and configuration:

```
lib/
├── db.ts                     # Database connection/client
├── utils.ts                  # Utility functions
├── types.ts                  # Shared TypeScript types
├── constants.ts              # App-wide constants
└── validations.ts            # Zod schemas for validation
```

## Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with `use` prefix | `useUserProfile.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Constants | camelCase or SCREAMING_SNAKE_CASE | `constants.ts` |
| Types | camelCase | `types.ts` |
| API Routes | `route.ts` inside folder | `api/users/route.ts` |

### Exports

Use barrel exports (`index.ts`) for clean imports:

```typescript
// components/dashboard/index.ts
export { DashboardHeader } from './DashboardHeader';
export { StatsCard } from './StatsCard';
export { ActivityFeed } from './ActivityFeed';
```

```typescript
// Usage
import { DashboardHeader, StatsCard } from '@/components/dashboard';
```

## Import Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

Usage:

```typescript
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';
```

## Best Practices

1. **Colocation**: Keep related files close together
2. **Single Responsibility**: Each component/file should have one clear purpose
3. **Explicit Dependencies**: Import what you need, avoid implicit globals
4. **Barrel Exports**: Use `index.ts` for public APIs of component folders
5. **Private by Default**: Only export what needs to be shared

## Anti-Patterns to Avoid

- Deeply nested folder structures (max 3-4 levels)
- Circular dependencies between modules
- Mixing feature code with shared utilities
- Creating "utils" folders that become dumping grounds
- Putting business logic in API route files (extract to lib/)
