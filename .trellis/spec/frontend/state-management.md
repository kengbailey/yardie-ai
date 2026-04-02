# State Management

This document covers state management patterns using React built-in tools: useState, useReducer, Context, and URL search params.

## State Categories

| Category | Tool | When to Use |
|----------|------|-------------|
| Local UI State | useState | Transient UI (modals, dropdowns, form inputs) |
| Complex Local State | useReducer | Multiple related state transitions |
| Shared UI State | React Context | Cross-component UI state (theme, sidebar) |
| URL State | useSearchParams | Filters, pagination, shareable view state |

## useState

For simple, local component state:

```typescript
'use client';

import { useState } from 'react';

export function Tabs({ tabs }: { tabs: string[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <div>
      <div role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## useReducer

For state with complex transitions or multiple related values:

```typescript
'use client';

import { useReducer } from 'react';

interface FormState {
  values: Record<string, string>;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: string; value: string }
  | { type: 'SET_ERRORS'; errors: Record<string, string> }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_END' }
  | { type: 'RESET' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        values: { ...state.values, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: '' },
      };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors, isSubmitting: false };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, errors: {} };
    case 'SUBMIT_END':
      return { ...state, isSubmitting: false };
    case 'RESET':
      return { values: {}, errors: {}, isSubmitting: false };
    default:
      return state;
  }
}

export function useForm() {
  const [state, dispatch] = useReducer(formReducer, {
    values: {},
    errors: {},
    isSubmitting: false,
  });

  return { state, dispatch };
}
```

## URL State with useSearchParams

### Why URL State?

- Shareable: Users can share links with specific state
- Bookmarkable: Browser history navigation works
- Persistent: Survives page refreshes

### Basic Usage

```typescript
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function useUrlFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const status = searchParams.get('status');
  const page = Number(searchParams.get('page')) || 1;

  const setFilter = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    // Reset page when changing filters
    if (key !== 'page') {
      params.set('page', '1');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    router.push(pathname);
  };

  return { status, page, setFilter, resetFilters };
}
```

### Usage in Components

```typescript
'use client';

export function OrderFilters() {
  const { status, setFilter, resetFilters } = useUrlFilters();

  return (
    <div className="flex gap-2">
      <select
        value={status || ''}
        onChange={(e) => setFilter('status', e.target.value || null)}
      >
        <option value="">All</option>
        <option value="pending">Pending</option>
        <option value="completed">Completed</option>
      </select>
      <button onClick={resetFilters}>Reset</button>
    </div>
  );
}
```

### Multiple Parameters

```typescript
export function useProductFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    minPrice: Number(searchParams.get('minPrice')) || undefined,
    maxPrice: Number(searchParams.get('maxPrice')) || undefined,
    page: Number(searchParams.get('page')) || 1,
    sort: searchParams.get('sort') || 'newest',
  };

  const setFilters = (updates: Partial<typeof filters>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  return { filters, setFilters };
}
```

## React Context

### When to Use Context

- Theme/appearance settings
- User preferences
- Cross-cutting concerns (toast notifications, modals)
- Sidebar/layout state shared across components

### When NOT to Use Context

- API/server data (fetch in Server Components or use fetch in effects)
- Single-component state (use useState)
- State that should be in the URL (use useSearchParams)

### Context Pattern

```typescript
'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarState {
  collapsed: boolean;
}

interface SidebarContextValue extends SidebarState {
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  const toggle = () => setCollapsed((prev) => !prev);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
```

### Split Context for Performance

Separate frequently-changing values to prevent unnecessary re-renders:

```typescript
'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

interface DashboardState {
  sidebarCollapsed: boolean;
  activeWidget: string | null;
}

interface DashboardActions {
  toggleSidebar: () => void;
  setActiveWidget: (widget: string | null) => void;
}

const DashboardStateContext = createContext<DashboardState | null>(null);
const DashboardActionsContext = createContext<DashboardActions | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>({
    sidebarCollapsed: false,
    activeWidget: null,
  });

  const actions = useMemo(
    () => ({
      toggleSidebar: () =>
        setState((prev) => ({
          ...prev,
          sidebarCollapsed: !prev.sidebarCollapsed,
        })),
      setActiveWidget: (widget: string | null) =>
        setState((prev) => ({ ...prev, activeWidget: widget })),
    }),
    []
  );

  return (
    <DashboardStateContext.Provider value={state}>
      <DashboardActionsContext.Provider value={actions}>
        {children}
      </DashboardActionsContext.Provider>
    </DashboardStateContext.Provider>
  );
}

export function useDashboardState() {
  const context = useContext(DashboardStateContext);
  if (!context) throw new Error('Missing DashboardProvider');
  return context;
}

export function useDashboardActions() {
  const context = useContext(DashboardActionsContext);
  if (!context) throw new Error('Missing DashboardProvider');
  return context;
}
```

## State Debugging

### Context Debug Component

```typescript
function DebugContext() {
  const state = useDashboardState();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <pre className="fixed bottom-4 right-4 p-2 bg-black/80 text-white text-xs">
      {JSON.stringify(state, null, 2)}
    </pre>
  );
}
```

## Best Practices

1. **URL First**: Default to URL state for shareable/filterable data
2. **Minimal Context**: Keep context small and focused
3. **Separate Concerns**: Don't mix server data with UI state
4. **Type Everything**: Use TypeScript for all state types
5. **Default Values**: Always provide sensible defaults
6. **Single Source**: Avoid duplicating state across systems

## Anti-Patterns

- Storing fetched data in Context (fetch in Server Components or use effects)
- Using Context for form state (use useState/useReducer locally)
- Deep nesting of providers
- Not memoizing context actions
- Duplicating URL state in useState
