## Why

The current app is a static HTML file served by Nginx with a Python HTTP server backend for email collection. This stack has no component model, no type safety, no build pipeline, and makes it difficult to iterate on features. Migrating to Next.js gives us a modern fullstack framework with React components, TypeScript, server-side rendering, and API routes — all in one codebase with a single Docker container.

## What Changes

- **BREAKING** Replace `index.html` with a Next.js 15 App Router application (React 19, TypeScript, TailwindCSS 4)
- **BREAKING** Replace `email_logger.py` (Python HTTP server + SQLite) with a Next.js API route using `better-sqlite3`
- **BREAKING** Replace the Nginx + supervisord Dockerfile with a Next.js standalone Docker build
- Update GitHub Actions workflow to build the new Dockerfile
- Preserve exact visual design (colors, layout, animations, typography) and email form behavior

## Capabilities

### New Capabilities
- `landing-page`: Marketing landing page built with React Server Components, TailwindCSS 4, and responsive layout matching the current design
- `email-waitlist`: Email collection API route with Zod validation, better-sqlite3 storage, and form submission handling
- `docker-deployment`: Dockerized Next.js standalone build with SQLite volume mount and GitHub Actions CI

### Modified Capabilities

## Impact

- **Code**: All existing application files replaced (`index.html`, `email_logger.py`, `supervisord.conf`)
- **Dockerfile**: Complete rewrite for Next.js standalone output (multi-stage build)
- **CI**: `.github/workflows/build-and-push.yml` updated for new Dockerfile
- **Dependencies**: Python removed, Node.js added (Next.js, React, TypeScript, TailwindCSS, better-sqlite3, Zod)
- **Database**: SQLite remains but accessed via `better-sqlite3` instead of Python `sqlite3`. Existing `emails.db` schema compatible.
- **Runtime**: Single Node.js process replaces Nginx + Python + supervisord
