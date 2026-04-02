# Type Safety Guidelines

This document covers TypeScript best practices for maintaining type safety across the frontend application.

## Core Principles

1. **Use shared types from `lib/types.ts`**, never redefine them
2. **Use type inference wherever possible**
3. **Avoid type assertions and escape hatches**
4. **Validate external data with Zod**

## Shared Types

### Define Types in `lib/types.ts`

```typescript
// lib/types.ts

// Database / domain types
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

// API input types
export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateOrderInput {
  status: OrderStatus;
}
```

### DO: Import from Shared Types

```typescript
// Good: Import types from shared file
import type { User, Order } from '@/lib/types';
```

### DON'T: Redefine Types

```typescript
// Bad: Redefining types that exist in lib/types.ts
interface User {
  id: string;
  name: string;
  email: string;
}
```

## Type Inference

### Let TypeScript Infer When Possible

```typescript
// Good: TypeScript infers the return type
function formatUserName(user: User) {
  return `${user.name} (${user.email})`;
}

// Good: Infer state type from initial value
const [count, setCount] = useState(0); // inferred as number

// Explicit when the initial value doesn't represent the full type
const [user, setUser] = useState<User | null>(null);
```

### Awaited<ReturnType> Pattern

Infer types from function return values:

```typescript
// Infer the response type from a function
type DashboardData = Awaited<ReturnType<typeof getDashboardStats>>;

// Infer from API response
async function getUsers() {
  const res = await fetch('/api/users');
  return res.json() as Promise<{ users: User[] }>;
}
type UsersResult = Awaited<ReturnType<typeof getUsers>>;
```

## Forbidden Patterns

### NO @ts-expect-error for Custom Fields

```typescript
// Bad: Suppressing type errors
// @ts-expect-error - customField exists at runtime
const value = user.customField;

// Bad: Using any to bypass type checking
const value = (user as any).customField;
```

**Solution**: If a field exists at runtime but not in types, update the type definition in `lib/types.ts`.

### NO `any` Type

```typescript
// Bad
function processData(data: any) { ... }

// Good
function processData(data: unknown) {
  const parsed = dataSchema.parse(data);
  // Now properly typed
}
```

### NO Type Assertions Without Validation

```typescript
// Bad: Blind type assertion
const user = data as User;

// Good: Runtime validation with Zod
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string(),
});

const user = userSchema.parse(data);

// Good: Type guard
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}
```

## Zod Schemas

### Define Validation Schemas

```typescript
// lib/validations.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

export const updateOrderSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'cancelled']),
});

// Infer TypeScript types from schemas
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;
```

### Use in API Routes

```typescript
// app/api/users/route.ts
import { createUserSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // parsed.data is fully typed as CreateUserInput
  const user = await createUser(parsed.data);
  return NextResponse.json({ user }, { status: 201 });
}
```

## Discriminated Unions

Use discriminated unions for state that can be in different shapes:

```typescript
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle':
      return null;
    case 'loading':
      return <div>Loading...</div>;
    case 'success':
      return <div>{JSON.stringify(state.data)}</div>; // data is available
    case 'error':
      return <div>Error: {state.error}</div>; // error is available
  }
}
```

## Generic Patterns

### API Response Wrapper

```typescript
// Generic paginated response type
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Usage
type UserListResponse = PaginatedResponse<User>;
```

### Hook Return Types

```typescript
// Explicit return type for complex hooks
interface UseOrderActionsReturn {
  updateOrder: (id: string, data: UpdateOrderInput) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useOrderActions(): UseOrderActionsReturn {
  // Implementation
}
```

## import type

Always use `import type` for type-only imports:

```typescript
// Good: import type for types
import type { User, Order } from '@/lib/types';
import type { ReactNode } from 'react';

// Good: Mixed import
import { useState } from 'react';
import type { ChangeEvent } from 'react';
```

## View Model Types

When the frontend needs computed properties beyond the base type:

```typescript
// lib/types.ts or components/orders/types.ts
import type { Order } from '@/lib/types';

export interface OrderViewModel extends Order {
  formattedTotal: string;
  statusLabel: string;
  isEditable: boolean;
}

export function toOrderViewModel(order: Order): OrderViewModel {
  return {
    ...order,
    formattedTotal: `$${order.total.toFixed(2)}`,
    statusLabel: order.status.charAt(0).toUpperCase() + order.status.slice(1),
    isEditable: order.status === 'pending',
  };
}
```

## Working with External Data

### Validate External Data

```typescript
import { z } from 'zod';

const externalDataSchema = z.object({
  id: z.string(),
  value: z.number(),
});

async function fetchExternalData() {
  const response = await fetch('/api/external');
  const data = await response.json();
  return externalDataSchema.parse(data);
}
```

### Type-Safe Local Storage

```typescript
function getStoredValue<T>(key: string, schema: z.ZodType<T>): T | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    return schema.parse(JSON.parse(stored));
  } catch {
    return null;
  }
}
```

## TypeScript Configuration

Ensure strict mode is enabled in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true
  }
}
```

## Common Type Utilities

```typescript
// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

// Make specific properties optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make specific properties required
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Non-nullable fields
type NonNullableFields<T> = {
  [K in keyof T]: NonNullable<T[K]>;
};
```

## Checklist

Before committing, verify:

- [ ] No `@ts-expect-error` or `@ts-ignore` comments added
- [ ] No `any` types in new code
- [ ] Types imported from `lib/types.ts`, not redefined
- [ ] External data validated with Zod schemas
- [ ] `import type` used for type-only imports
