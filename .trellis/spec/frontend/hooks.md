# Hook Development Patterns

This document covers React hook patterns for state, effects, performance, and custom hooks.

## Built-in Hooks

### useState

For local component state:

```typescript
'use client';

import { useState } from 'react';

export function TogglePanel() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? 'Close' : 'Open'}
      </button>
      {isOpen && <div>Panel content</div>}
    </div>
  );
}
```

### useState with Complex State

```typescript
interface FormState {
  name: string;
  email: string;
  errors: Record<string, string>;
}

export function useContactForm() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    errors: {},
  });

  const updateField = (field: keyof Omit<FormState, 'errors'>, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: '' },
    }));
  };

  const setErrors = (errors: Record<string, string>) => {
    setForm((prev) => ({ ...prev, errors }));
  };

  return { form, updateField, setErrors };
}
```

### useEffect

For side effects and synchronization:

```typescript
'use client';

import { useEffect, useState } from 'react';

export function useWindowSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

### useEffect Cleanup

Always clean up subscriptions, timers, and event listeners:

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetch('/api/data', { signal: controller.signal })
    .then((res) => res.json())
    .then(setData)
    .catch((err) => {
      if (err.name !== 'AbortError') setError(err);
    });

  return () => controller.abort();
}, []);
```

### useCallback

Memoize functions passed as props or used in dependency arrays:

```typescript
import { useCallback } from 'react';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const search = useCallback(async (term: string) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
    const data = await res.json();
    setResults(data.results);
  }, []);

  return { query, setQuery, results, search };
}
```

### useMemo

Memoize expensive computations:

```typescript
import { useMemo } from 'react';

export function useFilteredItems(items: Item[], filter: string) {
  const filtered = useMemo(
    () => items.filter((item) => item.name.toLowerCase().includes(filter.toLowerCase())),
    [items, filter]
  );

  return filtered;
}
```

### useRef

For DOM references and mutable values that don't trigger re-renders:

```typescript
import { useRef, useEffect } from 'react';

export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

## Custom Hook Patterns

### Data Fetching Hook

```typescript
interface UseFetchOptions<T> {
  initialData?: T;
  enabled?: boolean;
}

export function useFetch<T>(url: string, options: UseFetchOptions<T> = {}) {
  const { initialData, enabled = true } = options;
  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [url, enabled]);

  return { data, error, isLoading };
}
```

### Toggle Hook

```typescript
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return { value, toggle, setTrue, setFalse };
}
```

### Debounce Hook

```typescript
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      // Fetch search results
    }
  }, [debouncedQuery]);
}
```

### Local Storage Hook

```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        window.localStorage.setItem(key, JSON.stringify(nextValue));
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue] as const;
}
```

## Best Practices

1. **Single Responsibility**: Each hook should have one clear purpose
2. **Consistent Naming**: `useXxx` prefix for all hooks
3. **Error Handling**: Always consider error states
4. **Loading States**: Expose loading states for UI feedback
5. **Cleanup**: Always clean up side effects in useEffect
6. **Type Safety**: Define proper TypeScript types for inputs and outputs

## Common Pitfalls

- Forgetting cleanup functions in useEffect
- Missing dependencies in useEffect/useCallback/useMemo
- Using useEffect for things that should be computed during render (use useMemo)
- Creating too many small hooks instead of composing them
- Not handling the SSR case (checking `typeof window`)
