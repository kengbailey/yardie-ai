# Yardie AI

Platform for democratizing AI access — managed OpenWebUI instances for the Jamaican community.

## Tech Stack

- **Portal**: Next.js 15 (App Router), React 19, TypeScript, TailwindCSS 4
- **Auth**: Better Auth (email/password, Argon2id, database sessions)
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **LLM Proxy**: LiteLLM → OpenRouter
- **AI Interface**: OpenWebUI (managed instances per tenant)
- **Reverse Proxy**: Traefik
- **Deployment**: Docker Compose (local), GCP (production)

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in values
cp .env.example .env

# 3. Start the full stack
docker compose up

# 4. Initialize the portal database
npm run db:init

# 5. Create the first sysadmin
npm run seed:admin -- --email admin@yardie.ai

# 6. Start the provisioning worker
npm run provisioning:worker
```

**Services:**
- Portal: http://localhost
- OpenWebUI (test): http://test.localhost
- Traefik Dashboard: http://localhost:8080

## Architecture

```
┌─────────────────────────────────────────────���───┐
│                   Traefik                       │
│         (subdomain routing + TLS)               │
└───┬──────────────┬──────────────────────────────┘
    │              │
    ▼              ▼
 Portal      OpenWebUI instances
(Next.js)    (cornwall, middlesex, ...)
    │              │
    │              ▼
    │         LiteLLM Proxy ──→ OpenRouter ──→ LLMs
    │              │
    ▼              ▼
 PostgreSQL      Redis
```

## Project Structure

```
app/
├── page.tsx                            # Landing page
├── (auth)/                             # Login, signup, verify, reset
├── (app)/
│   ├── dashboard/                      # User dashboard
│   ├── instances/[id]/manage/          # Manager dashboard
│   └── admin/                          # Sysadmin dashboard
└── api/
    ├── auth/[...all]/                  # Better Auth handler
    ├── submit-email/                   # Waitlist
    ├── health/                         # Health check
    ├── admin/                          # Sysadmin API routes
    └── instances/[id]/users/           # Instance management API
lib/
├── auth.ts                             # Better Auth config
├── auth-client.ts                      # Better Auth React client
├── db.ts                               # PostgreSQL pool
├── permissions.ts                      # RBAC (user/manager/sysadmin)
├── provisioning.ts                     # User provisioning pipeline
├── litellm-admin.ts                    # LiteLLM Admin API client
├── usage.ts                            # Usage stats queries
├── types.ts                            # Zod schemas + types
└── schema.sql                          # Database schema
scripts/
├── init-db.ts                          # Initialize database tables
├── seed-admin.ts                       # Create first sysadmin
├── process-provisioning.ts             # Provisioning queue worker
└── deploy-function.ts                  # Deploy OpenWebUI attribution function
litellm/
└── config.yaml                         # LiteLLM proxy configuration
openwebui/
├── user-attribution-function.py        # User identity injection filter
└── README.md                           # Instance configuration guide
```

## Roles

| Role | Access |
|------|--------|
| **User** | Dashboard, assigned OpenWebUI instance |
| **Manager** | Manage users/budgets within their instance(s) |
| **Sysadmin** | Global admin: all instances, all users, system config |

## Environment Variables

See `.env.example` for all required variables with descriptions.
