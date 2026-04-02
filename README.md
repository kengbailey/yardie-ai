# Yardie AI

Intelligent AI solutions crafted for the Jamaican community.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: TailwindCSS 4
- **Database**: SQLite (better-sqlite3)
- **Deployment**: Docker

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
docker build -t yardie-ai .
docker run -p 80:3000 -v yardie-data:/data yardie-ai
```

The SQLite database is stored at `/data/emails.db` inside the container. Use a volume mount to persist data across restarts.

## Project Structure

```
app/
├── layout.tsx                 # Root layout (fonts, metadata)
├── page.tsx                   # Landing page
├── globals.css                # TailwindCSS 4 theme
└── api/submit-email/route.ts  # Email waitlist API
components/
├── hero.tsx                   # Hero section
├── features.tsx               # Feature cards grid
├── cta.tsx                    # Call-to-action section
├── email-form.tsx             # Email signup form
└── animate-on-scroll.tsx      # Scroll animation wrapper
lib/
├── db.ts                      # SQLite connection
├── types.ts                   # Zod schemas
└── utils.ts                   # Utilities
```
