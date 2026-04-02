# API Integration

This document covers patterns for making API calls using fetch() to Next.js API routes.

## API Route Handlers

### Basic Route Handler

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@/lib/types';

export async function GET() {
  try {
    const users = await getUsers(); // Your data fetching logic
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const user = await createUser(body);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 400 }
    );
  }
}
```

### Dynamic Route Handler

```typescript
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
```

## Client-Side Fetch Patterns

### Type-Safe API Helper

Create a typed fetch wrapper in `lib/utils.ts` or a dedicated `lib/api.ts`:

```typescript
// lib/api.ts

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(
      data?.error || `HTTP ${res.status}`,
      res.status,
      data
    );
  }

  return res.json();
}
```

### GET Request

```typescript
import { api } from '@/lib/api';
import type { User } from '@/lib/types';

interface UsersResponse {
  users: User[];
}

// In a Client Component
const { users } = await api<UsersResponse>('/api/users');

// With query parameters
const params = new URLSearchParams({ status: 'active', page: '1' });
const { users } = await api<UsersResponse>(`/api/users?${params}`);
```

### POST Request

```typescript
import { api } from '@/lib/api';
import type { User, CreateUserInput } from '@/lib/types';

interface CreateUserResponse {
  user: User;
}

const { user } = await api<CreateUserResponse>('/api/users', {
  method: 'POST',
  body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
});
```

### PUT / DELETE Requests

```typescript
// Update
await api<{ user: User }>(`/api/users/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ name: 'Updated Name' }),
});

// Delete
await api<{ success: boolean }>(`/api/users/${id}`, {
  method: 'DELETE',
});
```

## Loading and Error States

### Hook Pattern for Data Fetching

```typescript
'use client';

import { useState, useEffect } from 'react';
import { api, ApiError } from '@/lib/api';

interface UseFetchResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchCount, setFetchCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    api<T>(url, { signal: controller.signal })
      .then(setData)
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'An error occurred');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [url, fetchCount]);

  const refetch = () => setFetchCount((c) => c + 1);

  return { data, error, isLoading, refetch };
}
```

### Usage in Components

```typescript
'use client';

import { useFetch } from '@/hooks/useFetch';
import type { User } from '@/lib/types';

interface UsersResponse {
  users: User[];
}

export function UserList() {
  const { data, error, isLoading } = useFetch<UsersResponse>('/api/users');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (!data) return null;

  return (
    <ul>
      {data.users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

## Mutation Pattern

### Submit Hook

```typescript
'use client';

import { useState, useCallback } from 'react';
import { api, ApiError } from '@/lib/api';

interface UseMutationResult<TData, TInput> {
  data: TData | null;
  error: string | null;
  isLoading: boolean;
  mutate: (input: TInput) => Promise<TData | null>;
  reset: () => void;
}

export function useMutation<TData, TInput>(
  url: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
): UseMutationResult<TData, TInput> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(
    async (input: TInput): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await api<TData>(url, {
          method,
          body: JSON.stringify(input),
        });
        setData(result);
        return result;
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'An error occurred';
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [url, method]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, error, isLoading, mutate, reset };
}
```

### Usage

```typescript
'use client';

import { useMutation } from '@/hooks/useMutation';
import type { User, CreateUserInput } from '@/lib/types';

export function CreateUserForm() {
  const { mutate, isLoading, error } = useMutation<
    { user: User },
    CreateUserInput
  >('/api/users');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
    });
    if (result) {
      // Success - redirect or show confirmation
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <input name="email" type="email" required />
      {error && <p className="text-red-600">{error}</p>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

## Server Component Data Fetching

In Server Components, fetch data directly without hooks:

```typescript
// app/dashboard/page.tsx (Server Component)
import { db } from '@/lib/db';

export default async function DashboardPage() {
  const stats = await db.getStats();

  return (
    <main>
      <h1>Dashboard</h1>
      <p>Total users: {stats.totalUsers}</p>
    </main>
  );
}
```

## Error Handling Patterns

### Consistent Error Response Format

```typescript
// lib/types.ts
export interface ApiErrorResponse {
  error: string;
  details?: Record<string, string[]>; // Field-level validation errors
}

export interface ApiSuccessResponse<T> {
  data: T;
}
```

### Error Handling in API Routes

```typescript
// app/api/users/route.ts
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const user = await createUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Best Practices

1. **Type Everything**: Define request/response types in `lib/types.ts`
2. **Centralize API Logic**: Use a shared `api()` helper for all client-side fetches
3. **Handle Loading States**: Always show feedback during API calls
4. **Handle Errors**: Display meaningful error messages to users
5. **Abort Requests**: Use AbortController to cancel stale requests
6. **Server Components First**: Fetch data in Server Components when possible
7. **Validate Input**: Use Zod schemas in API routes for request validation
