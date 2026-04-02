# Next.js Frontend Development Guidelines

> Frontend development guidelines for a Next.js full-stack application with React + TypeScript + TailwindCSS.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 4
- **API**: fetch() to Next.js API Routes
- **Package Manager**: npm
- **Deployment**: Docker

---

## Documentation Files

| File                                                 | Description                                          | Priority      |
| ---------------------------------------------------- | ---------------------------------------------------- | ------------- |
| [components.md](./components.md)                     | Server/Client components, semantic HTML, next/image  | **Must Read** |
| [api-integration.md](./api-integration.md)           | fetch() patterns, error handling, loading states     | **Must Read** |
| [hooks.md](./hooks.md)                               | React hook patterns and custom hooks                 | Reference     |
| [state-management.md](./state-management.md)         | useState, useReducer, Context, URL search params     | Reference     |
| [directory-structure.md](./directory-structure.md)    | Project structure and file conventions               | Reference     |
| [type-safety.md](./type-safety.md)                   | TypeScript guidelines, Zod, forbidden patterns       | Reference     |
| [css-layout.md](./css-layout.md)                     | CSS patterns, flexbox, responsive, touch             | Reference     |
| [quality.md](./quality.md)                           | Pre-commit checklist and code quality standards      | Reference     |

---

## Quick Navigation by Task

### Before Starting Development

| Task                              | Document                                           |
| --------------------------------- | -------------------------------------------------- |
| Understand project structure      | [directory-structure.md](./directory-structure.md)  |
| Learn Server vs Client components | [components.md](./components.md)                   |

### During Development

| Task                        | Document                                           |
| --------------------------- | -------------------------------------------------- |
| Make API calls              | [api-integration.md](./api-integration.md)         |
| Create custom hooks         | [hooks.md](./hooks.md)                             |
| Manage application state    | [state-management.md](./state-management.md)       |
| Build UI components         | [components.md](./components.md)                   |
| Ensure type safety          | [type-safety.md](./type-safety.md)                 |
| Handle CSS & layout         | [css-layout.md](./css-layout.md)                   |

### Before Committing

| Task                    | Document                         |
| ----------------------- | -------------------------------- |
| Run quality checklist   | [quality.md](./quality.md)       |
| Verify CSS in both envs | [css-layout.md](./css-layout.md) |
| Check type safety       | [type-safety.md](./type-safety.md) |

---

## Core Rules Summary

| Rule                                                         | Reference                                          |
| ------------------------------------------------------------ | -------------------------------------------------- |
| **Default to Server Components**                             | [components.md](./components.md)                   |
| **Use `<button>` for clickable actions, not `<div>`**        | [components.md](./components.md)                   |
| **Always use `next/image` instead of `<img>`**               | [components.md](./components.md)                   |
| **Use shared types from `lib/types.ts`, never redefine**     | [type-safety.md](./type-safety.md)                 |
| **No `any` types or `@ts-expect-error` in new code**         | [type-safety.md](./type-safety.md)                 |
| **Use fetch() to API routes for data**                       | [api-integration.md](./api-integration.md)         |
| **Use `items-stretch` on main flex containers**              | [css-layout.md](./css-layout.md)                   |
| **Store shareable state in URL with useSearchParams**        | [state-management.md](./state-management.md)       |

---

## Architecture Overview

```
+--------------------------------------------------------------+
|                    Next.js Application                        |
|                                                               |
|  app/                          components/                    |
|  ├── layout.tsx                ├── ui/                        |
|  ├── page.tsx                  └── [feature]/                 |
|  ├── globals.css                                              |
|  ├── api/                      lib/                           |
|  │   └── [route]/route.ts      ├── db.ts                     |
|  └── (marketing)/              ├── utils.ts                   |
|      └── page.tsx              └── types.ts                   |
+-------------------------------+------------------------------+
                                |
              fetch() to API    |  Next.js API Routes
                                |
+-------------------------------+------------------------------+
|                    API Layer (Server)                         |
|  +-------------------+  +----------------------------------+ |
|  |   API Routes      |  |   Database / External Services   | |
|  |   (app/api/)      |  |   (lib/db.ts)                    | |
|  +-------------------+  +----------------------------------+ |
+--------------------------------------------------------------+
```

---

## Getting Started

1. **Read the Must-Read documents** - Components and API integration
2. **Set up your project structure** - Follow [directory-structure.md](./directory-structure.md)
3. **Configure TypeScript** - See [type-safety.md](./type-safety.md)
4. **Build components** - Follow [components.md](./components.md) and [hooks.md](./hooks.md)
5. **Before committing** - Complete the [quality.md](./quality.md) checklist

---

**Language**: All documentation is written in **English**.
