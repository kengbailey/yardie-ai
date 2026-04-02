# Dependencies & Versions

> Minimal dependency set for the Next.js 15 full-stack application with SQLite.

---

## Runtime Environment

| Dependency | Version | Description |
|------------|---------|-------------|
| Node.js | >=20 | JavaScript runtime |
| npm | ^10.x | Package manager |

---

## Core Framework

| Package | Version | Description |
|---------|---------|-------------|
| next | ^15.x | React framework (App Router) |
| react | ^19.x | UI library |
| react-dom | ^19.x | React DOM renderer |
| typescript | ^5.x | TypeScript language |

---

## Backend

### Database

| Package | Version | Description |
|---------|---------|-------------|
| better-sqlite3 | ^11.x | SQLite database driver |
| @types/better-sqlite3 | ^7.x | TypeScript types for better-sqlite3 |

### Validation

| Package | Version | Description |
|---------|---------|-------------|
| zod | ^3.x | Schema validation |

---

## Frontend

### Styling

| Package | Version | Description |
|---------|---------|-------------|
| tailwindcss | ^4.x | Utility-first CSS (v4 config format) |
| tailwind-merge | ^3.x | Tailwind class merging |
| clsx | ^2.x | Class name utility |

---

## Development Tools

### Code Quality

| Package | Version | Description |
|---------|---------|-------------|
| @biomejs/biome | ^2.x | Linter and formatter |

---

## Important Notes

1. **React 19**: Major version with breaking changes from React 18
2. **Next.js 15**: App Router is the primary routing pattern
3. **TailwindCSS 4**: Uses the new v4 configuration format (not `tailwind.config.js`)
4. **better-sqlite3**: Synchronous SQLite driver, no connection pooling needed
5. **Zod 3**: Stable version for schema validation and type inference
6. **No monorepo**: Single project, use `@/` path aliases for internal imports

---

## Updating Dependencies

When updating dependencies:

1. Check compatibility with React 19 and Next.js 15
2. Run `npm install` from the project root
3. Run `npm run type-check` to verify TypeScript compatibility
4. Run `npm run build` to ensure production build works

---

## Deployment

| Tool | Description |
|------|-------------|
| Docker | Container-based deployment |

The application is deployed as a Docker container. The SQLite database file is stored on a persistent volume mount.
