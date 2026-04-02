# Pre-commit Checklist

Complete this checklist before committing frontend code changes.

## Type Safety

- [ ] No `@ts-expect-error` or `@ts-ignore` comments added
- [ ] No `any` types in new code
- [ ] Types imported from `lib/types.ts` (not redefined)
- [ ] External data validated with Zod schemas
- [ ] `import type` used for type-only imports

## Component Development

- [ ] Server Components used by default; `'use client'` only when necessary
- [ ] Semantic HTML elements used (button, not div for clicks)
- [ ] `next/image` used instead of `<img>` tags
- [ ] Proper ARIA labels and accessibility attributes added
- [ ] Props have TypeScript interfaces defined

## API Integration

- [ ] API calls use the `api()` helper from `lib/api.ts`
- [ ] Loading and error states handled
- [ ] AbortController used for cleanup in useEffect fetches
- [ ] API routes validate input with Zod schemas

## State Management

- [ ] Shareable state stored in URL with useSearchParams
- [ ] Context used sparingly (not for server/fetched data)
- [ ] No duplicate state across different systems

## CSS & Layout

- [ ] `items-stretch` used on main flex containers (not `items-center`)
- [ ] Parent provides external styles; child provides internal layout
- [ ] Mobile touch: `WebkitTapHighlightColor: "transparent"` applied
- [ ] Touch targets are minimum 44x44px
- [ ] Responsive breakpoints tested

## Cross-Environment Testing

- [ ] Tested in development mode (`npm run dev`)
- [ ] Tested in production mode (`npm run build && npm run start`)
- [ ] No visual differences between dev and prod
- [ ] Animations respect `prefers-reduced-motion`

## Code Quality

- [ ] No console.log statements left in code
- [ ] Unused imports removed
- [ ] Components follow single responsibility principle
- [ ] File and function names follow conventions
- [ ] Barrel exports updated if new files added

## Documentation

- [ ] Complex logic has inline comments
- [ ] New hooks have JSDoc comments

---

## Quick Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format

# Build (catches production-only issues)
npm run build

# Run all checks
npm run lint && npm run type-check && npm run build
```

## Common Issues to Watch

### Type Safety
```typescript
// Bad
const data: any = await response.json();

// Good
const data = await response.json() as UsersResponse;
// Or better: validate with Zod
const data = usersResponseSchema.parse(await response.json());
```

### Components
```typescript
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button onClick={handleClick}>Click me</button>
```

### Images
```typescript
// Bad
<img src="/hero.jpg" alt="Hero" />

// Good
import Image from 'next/image';
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} />
```

### Layout
```typescript
// Bad - children won't fill height
<div className="flex h-screen items-center">

// Good - children fill available height
<div className="flex h-screen">
```

### Mobile Touch
```typescript
// Bad - shows tap highlight on mobile
<button onClick={handleClick}>Tap</button>

// Good - no tap highlight
<button
  onClick={handleClick}
  style={{ WebkitTapHighlightColor: 'transparent' }}
>
  Tap
</button>
```
