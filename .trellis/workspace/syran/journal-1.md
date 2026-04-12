# Journal - syran (Part 1)

> AI development session journal
> Started: 2026-04-01

---



## Session 1: Migrate to Next.js 15

**Date**: 2026-04-01
**Task**: Migrate to Next.js 15

### Summary

(Add summary)

### Main Changes

## Summary
Migrated the Yardie AI landing page from static HTML + Python to a Next.js 15 fullstack application.

## What Was Done

| Area | Changes |
|------|---------|
| Bootstrap | Updated all `.trellis/spec/` guidelines to match minimal stack (Next.js 15, React 19, TypeScript, TailwindCSS 4, better-sqlite3) |
| Frontend | Built landing page with Server/Client Components: Hero, Features (6 cards), CTA, EmailForm, AnimateOnScroll |
| Backend | API route `POST /api/submit-email` with Zod validation + better-sqlite3 |
| Docker | Multi-stage Dockerfile with standalone Next.js output |
| Cleanup | Removed old files: index.html, email_logger.py, supervisord.conf |

## Key Files
- `app/page.tsx` - Landing page (Server Component)
- `components/email-form.tsx` - Email signup (Client Component)
- `app/api/submit-email/route.ts` - Email API route
- `lib/db.ts` - SQLite singleton with WAL mode
- `Dockerfile` - Multi-stage build for production

## Verified
- TypeScript: 0 errors
- Build: passes
- Docker: builds and serves correctly
- Email API: valid/invalid inputs tested


### Git Commits

| Hash | Message |
|------|---------|
| `0e70981` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Fix CI Docker build

**Date**: 2026-04-02
**Task**: Fix CI Docker build

### Summary

Removed COPY public from Dockerfile — empty public/ dir not tracked by git was failing the CI build.

### Main Changes



### Git Commits

| Hash | Message |
|------|---------|
| `c692292` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Platform V1: Auth, Dashboards, LLM Proxy, Docker Stack

**Date**: 2026-04-11
**Task**: Platform V1: Auth, Dashboards, LLM Proxy, Docker Stack

### Summary

(Add summary)

### Main Changes

## Summary
Built the full yardie.ai platform infrastructure in a single session. Went from static landing page to a multi-service platform with auth, dashboards, LLM proxy, and managed OpenWebUI instance.

## What Was Done

| Area | Changes |
|------|---------|
| Research | 3 deep spikes: OpenWebUI API, LLM proxy solutions, auth solutions (150KB+ of research docs) |
| Database | Migrated from SQLite to PostgreSQL, full schema with RBAC tables |
| Auth | Better Auth with Argon2id, email verification, password reset, 7-day sessions |
| RBAC | Three-tier roles (user/manager/sysadmin) scoped to instances |
| Pages | Login, signup, verify email, forgot/reset password — all dark themed |
| Dashboards | User dashboard, manager instance management, sysadmin global admin |
| LLM Proxy | LiteLLM configured with OpenRouter, virtual keys, budget tracking |
| Provisioning | User provisioning pipeline with retry queue |
| OpenWebUI | Attribution function, deploy script, instance configuration docs |
| Docker | docker-compose with 5 services (portal, litellm, openwebui, postgres, redis) |
| Bugs Fixed | Secure cookies on localhost, HOSTNAME=0.0.0.0 for container self-calls, LiteLLM health check endpoint, OpenRouter model IDs updated |

## Key Decisions
- Better Auth for portal auth (not Authentik — deferred SSO to Phase 2)
- LiteLLM Proxy as LLM gateway (not custom build)
- OpenWebUI Functions (not Pipelines) for user attribution
- Scoped role tables for RBAC (not library-built-in)
- Traefik removed for local dev (direct port mapping simpler)

## Remaining (2 tasks)
- 10.4: Test virtual key + budget tracking
- 11.4: Deploy and test OpenWebUI user attribution function


### Git Commits

| Hash | Message |
|------|---------|
| `811cc49` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
