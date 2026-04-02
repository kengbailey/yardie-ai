# Backend Development Guidelines Index

> **Tech Stack**: Next.js 15 API Routes + better-sqlite3 + Zod

## Related Guidelines

| Guideline                 | Location     | When to Read                 |
| ------------------------- | ------------ | ---------------------------- |
| **Shared Code Standards** | `../shared/` | Always - applies to all code |

---

## Documentation Files

| File                                                 | Description                                        | When to Read                       |
| ---------------------------------------------------- | -------------------------------------------------- | ---------------------------------- |
| [directory-structure.md](./directory-structure.md)   | API route organization and directory layout         | Starting a new feature             |
| [type-safety.md](./type-safety.md)                   | Zod schemas, type narrowing, response patterns     | Type-related decisions             |
| [database.md](./database.md)                         | better-sqlite3 queries, transactions, SQL patterns | Database operations                |
| [logging.md](./logging.md)                           | Structured console logging                         | Debugging, observability           |
| [quality.md](./quality.md)                           | Pre-commit checklist for backend code              | Before committing                  |

---

## Quick Navigation

### API Route Structure

| Task                          | File                                               |
| ----------------------------- | -------------------------------------------------- |
| Project structure             | [directory-structure.md](./directory-structure.md) |
| Route handler pattern         | [directory-structure.md](./directory-structure.md) |
| Zod validation in routes      | [directory-structure.md](./directory-structure.md) |
| Helper functions              | [directory-structure.md](./directory-structure.md) |

### Type Safety

| Task                 | File                               |
| -------------------- | ---------------------------------- |
| Type safety patterns | [type-safety.md](./type-safety.md) |
| Discriminated unions | [type-safety.md](./type-safety.md) |
| Zod-first types      | [type-safety.md](./type-safety.md) |
| Zod error handling   | [type-safety.md](./type-safety.md) |
| Standard response    | [type-safety.md](./type-safety.md) |

### Database (better-sqlite3)

| Task                    | File                         |
| ----------------------- | ---------------------------- |
| Connection setup        | [database.md](./database.md) |
| Prepared statements     | [database.md](./database.md) |
| Parameterized queries   | [database.md](./database.md) |
| Transactions            | [database.md](./database.md) |
| Table creation          | [database.md](./database.md) |

### Logging

| Task                        | File                           |
| --------------------------- | ------------------------------ |
| Structured logging          | [logging.md](./logging.md)     |
| Error logging               | [logging.md](./logging.md)     |
| Log levels                  | [logging.md](./logging.md)     |

---

## Core Rules Summary

| Rule                                                             | Reference                                          |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| **Use parameterized queries** - prevent SQL injection             | [database.md](./database.md)                       |
| **Use structured logger** - not raw `console.log`                | [logging.md](./logging.md)                         |
| **No non-null assertions `!`** - use type narrowing              | [type-safety.md](./type-safety.md)                 |
| **All API inputs validated with Zod**                            | [type-safety.md](./type-safety.md)                 |
| **Standard response format** - always include `success`/`reason` | [type-safety.md](./type-safety.md)                 |
| **Use prepared statements** for repeated queries                 | [database.md](./database.md)                       |
| **Use transactions** for multi-step writes                       | [database.md](./database.md)                       |
| **Use structured context** in logs - no string interpolation     | [logging.md](./logging.md)                         |
| **Run pre-commit checklist** before committing                   | [quality.md](./quality.md)                         |

---

## Reference Files

| Feature              | Typical Location                |
| -------------------- | ------------------------------- |
| Database Connection  | `lib/db.ts`                     |
| Zod Schemas / Types  | `lib/types.ts`                  |
| Helper Functions     | `lib/utils.ts`                  |
| API Route Handlers   | `app/api/{route}/route.ts`      |

---

**Language**: All documentation must be written in **English**.
