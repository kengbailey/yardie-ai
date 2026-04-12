# Next.js Full-Stack Development Guidelines

Development guidelines for the Next.js 15 application with PostgreSQL backend and TailwindCSS frontend.

## Structure

### [Frontend](./frontend/index.md)

React 19 + Next.js 15 App Router frontend development patterns:

- [Directory Structure](./frontend/directory-structure.md)
- [Components](./frontend/components.md)
- [State Management](./frontend/state-management.md)
- [Hooks](./frontend/hooks.md)
- [API Integration](./frontend/api-integration.md)
- [CSS & Layout](./frontend/css-layout.md)
- [Type Safety](./frontend/type-safety.md)
- [Quality Checklist](./frontend/quality.md)

### [Backend](./backend/index.md)

Next.js Route Handlers + PostgreSQL + Better Auth backend development patterns:

- [Directory Structure](./backend/directory-structure.md)
- [Database](./backend/database.md)
- [Logging](./backend/logging.md)
- [Type Safety](./backend/type-safety.md)
- [Quality Checklist](./backend/quality.md)

### [Shared](./shared/index.md)

Cross-cutting concerns:

- [Dependencies](./shared/dependencies.md)
- [Code Quality](./shared/code-quality.md)
- [TypeScript Conventions](./shared/typescript.md)

### [Guides](./guides/index.md)

Development thinking guides:

- [Pre-Implementation Checklist](./guides/pre-implementation-checklist.md)
- [Cross-Layer Thinking Guide](./guides/cross-layer-thinking-guide.md)

### [Common Issues / Pitfalls](./big-question/index.md)

Common issues and solutions:

- [WebKit Tap Highlight](./big-question/webkit-tap-highlight.md)
- [Turbopack vs Webpack Flexbox](./big-question/turbopack-webpack-flexbox.md)

## Tech Stack

- **Frontend**: Next.js 15, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes (Route Handlers), PostgreSQL (pg), Better Auth, Zod
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 4 + clsx + tailwind-merge
- **Deployment**: Docker

## Usage

These guidelines can be used as:

1. **Reference Documentation** - Consult specific guides when implementing features
2. **Code Review Checklist** - Verify implementations against established patterns
3. **Onboarding Material** - Help new developers understand project conventions
