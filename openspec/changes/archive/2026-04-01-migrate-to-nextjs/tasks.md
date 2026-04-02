## 1. Project Scaffolding

- [x] 1.1 Initialize Next.js 15 project with TypeScript in the repo root (npm create next-app or manual setup with package.json, tsconfig.json, next.config.ts with `output: 'standalone'`)
- [x] 1.2 Install dependencies: react, react-dom, tailwindcss, @tailwindcss/postcss, better-sqlite3, @types/better-sqlite3, zod, clsx, tailwind-merge, lucide-react
- [x] 1.3 Configure TailwindCSS 4 in `app/globals.css` with `@import "tailwindcss"` and `@theme` directive defining custom colors (dark-900, primary, accent, etc.) and font families (Inter, Fira Code)
- [x] 1.4 Configure `next/font/google` for Inter and Fira Code in the root layout

## 2. Landing Page Components

- [x] 2.1 Create root layout (`app/layout.tsx`) with html/body, font classes, dark background, and metadata (title: "Yardie AI | Jamaican AI Solutions")
- [x] 2.2 Create the main page (`app/page.tsx`) as a Server Component composing Hero, Features, and CTA sections
- [x] 2.3 Build Hero section component with gradient brand text "Yardie AI" and tagline paragraph
- [x] 2.4 Build Features section with 6 feature cards in a responsive grid (1/2/3 cols), each with a lucide-react icon, title, and description
- [x] 2.5 Build CTA section ("Join the Waiting List") wrapping the EmailForm client component
- [x] 2.6 Add scroll animation using IntersectionObserver (Client Component wrapper) with staggered delays on feature cards

## 3. Email Waitlist Backend

- [x] 3.1 Create `lib/db.ts` — better-sqlite3 singleton, WAL mode, auto-create `emails` table (id, email, submitted_at)
- [x] 3.2 Create `lib/types.ts` — Zod schema for email submission input, API response types
- [x] 3.3 Create `app/api/submit-email/route.ts` — POST handler: parse body (JSON + form-urlencoded), validate with Zod, insert into SQLite, return success/error JSON with CORS header

## 4. Email Form Client Component

- [x] 4.1 Create `components/email-form.tsx` as a Client Component with email input, submit button, and success message
- [x] 4.2 Implement form submission: fetch POST to `/api/submit-email`, loading state ("Submitting..."), success state (green button, disabled input, success message), error handling (alert + reset)

## 5. Styling Parity

- [x] 5.1 Implement card styles: semi-transparent background, backdrop blur, border, hover translateY(-5px) with shadow
- [x] 5.2 Implement gradient button styles: indigo→purple gradient, hover lift, disabled state
- [x] 5.3 Implement form input styles: dark background, border, focus ring with primary color, disabled state
- [x] 5.4 Implement success message animation: fade-in with translateY transition
- [x] 5.5 Implement feature icon containers: 60×60px gradient background, rounded-2xl

## 6. Docker & CI

- [x] 6.1 Create new `Dockerfile`: multi-stage build (node:20-alpine with build tools → node:20-alpine production), copy standalone output + public + static, create /data directory, set PORT=3000
- [x] 6.2 Create `.dockerignore` to exclude node_modules, .next, .git, .trellis, openspec, etc.
- [x] 6.3 Verify `docker build` and `docker run -p 80:3000` serves the landing page correctly
- [x] 6.4 Update `.github/workflows/build-and-push.yml` if Dockerfile path or context changed

## 7. Cleanup

- [x] 7.1 Remove old files: `index.html`, `email_logger.py`, `supervisord.conf`
- [x] 7.2 Verify `npm run build` succeeds with no TypeScript or lint errors
- [x] 7.3 Test email form end-to-end in Docker: submit email → check SQLite file has the record
