## Context

The current Yardie AI landing page is a single `index.html` with inline TailwindCSS (CDN), inline JavaScript, and a Python HTTP server (`email_logger.py`) for email collection. Nginx serves the static file and proxies `/submit-email` to the Python backend. Supervisord manages both processes. The entire stack runs in a single Docker container deployed to GCP.

The site is a marketing landing page with:
- Hero section with brand name and tagline
- Features grid (6 cards)
- Email waitlist signup form with success/error states
- Dark theme with purple/indigo gradient accents
- Scroll animations via IntersectionObserver

## Goals / Non-Goals

**Goals:**
- Migrate to Next.js 15 with App Router, React 19, TypeScript, TailwindCSS 4
- Replace Python backend with Next.js API route using better-sqlite3
- Single Dockerfile producing a standalone Next.js container
- Preserve exact visual design and all interactive behaviors
- Keep the email schema compatible (existing emails.db can be reused)

**Non-Goals:**
- Adding new pages or features beyond the current landing page
- Authentication, user accounts, or admin dashboard
- Switching from SQLite to PostgreSQL
- Setting up a monorepo or adding heavy libraries (oRPC, Drizzle, React Query)
- Internationalization or multi-language support
- Analytics or monitoring infrastructure

## Decisions

### 1. Single-page App Router structure (not Pages Router)

Use the App Router with a single marketing page. The page component is a Server Component (no client-side JS needed for static content). Only the email form is a Client Component.

**Why:** App Router is the default in Next.js 15, supports React Server Components for zero-JS static sections, and aligns with the project spec guidelines.

**Alternative:** Pages Router — rejected because it's legacy and doesn't support RSC.

### 2. TailwindCSS 4 with project config (not CDN)

Replace the CDN `<script src="cdn.tailwindcss.com">` with a proper TailwindCSS 4 installation using `@import "tailwindcss"` in CSS. Custom colors and fonts defined via `@theme` directive.

**Why:** CDN script is not suitable for production — it compiles in the browser and bloats the page. TailwindCSS 4 uses CSS-native config, no `tailwind.config.js` needed.

**Alternative:** Keep CDN — rejected for performance and build reasons.

### 3. better-sqlite3 with singleton pattern

Create a `lib/db.ts` module exporting a singleton database instance with WAL mode. Initialize the `emails` table on first import. Use prepared statements for queries.

**Why:** Synchronous API is simpler for Route Handlers. WAL mode allows concurrent reads. Singleton prevents multiple connections.

**Alternative:** sql.js (WASM-based SQLite) — rejected because better-sqlite3 is faster and the native Node.js addon works fine in Docker.

### 4. Next.js standalone output with multi-stage Docker build

Use `output: 'standalone'` in next.config to produce a minimal production bundle. Multi-stage Dockerfile: build stage (node:20-alpine + npm) → production stage (node:20-alpine + standalone output only). SQLite data stored at `/data/` volume mount.

**Why:** Standalone output produces a self-contained server without node_modules. Multi-stage build keeps the image small.

**Alternative:** Full node_modules in container — rejected for image size.

### 5. Google Fonts via next/font (not external stylesheet)

Replace the external Google Fonts `<link>` with `next/font/google` for Inter and Fira Code. This self-hosts fonts and eliminates the render-blocking external request.

**Why:** Better performance, no CORS/privacy issues, automatic font optimization.

### 6. Font Awesome icons replaced with inline SVGs or lucide-react

Replace the Font Awesome CDN dependency with either inline SVG icons or `lucide-react`. The current page uses 6 icons: language, bolt, robot, chart-line, plug, shield-alt, check-circle.

**Why:** Eliminates an external CDN dependency. Lucide is tree-shakeable and already in the project's dependency scope.

## Risks / Trade-offs

- **[Risk] SQLite native addon in Docker** — better-sqlite3 requires compilation. → Mitigation: Use `node:20-alpine` with build tools in the build stage only; the compiled addon carries into the production stage.
- **[Risk] Visual regression** — Migrating from inline styles + CDN Tailwind to proper TailwindCSS 4 could cause subtle differences. → Mitigation: Side-by-side comparison of old and new during development. Custom theme values match existing color hex codes exactly.
- **[Risk] Font rendering differences** — Self-hosted fonts via next/font may render slightly differently than CDN-loaded fonts. → Mitigation: Use the same font weights (300-700 for Inter, 400-500 for Fira Code).
- **[Trade-off] No SSG for the landing page** — Could statically generate but keeping it as a standard RSC page is simpler and the performance difference is negligible for a single page.
