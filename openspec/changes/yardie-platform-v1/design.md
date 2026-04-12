## Context

Yardie AI is a Next.js 15 landing page currently serving static marketing content with an email waitlist (SQLite + better-sqlite3). The goal is to transform it into a platform hosting managed OpenWebUI instances where friends/family act as instance managers controlling user access to AI tools. All LLM usage flows through a centralized proxy (LiteLLM → OpenRouter) for cost control and observability.

Key constraints from discovery:
- Docker-compose for local dev, K8s + Helm for future production
- PostgreSQL for all services (separate databases)
- Redis for sessions, budget caching, rate limiting
- Better Auth for portal auth (custom login/signup forms, no redirect)
- LiteLLM Proxy for LLM gateway (OpenRouter as sole provider)
- OpenWebUI Functions (not Pipelines) for user attribution
- Resend for transactional email
- Authentik deferred to Phase 2 (SSO for OpenWebUI instances)

## Goals / Non-Goals

**Goals:**
- Full auth system with email/password signup, verification, password reset
- Three-role RBAC: user (scoped to instance), manager (scoped to instance), sysadmin (global)
- User provisioning pipeline: signup → OpenWebUI account → LiteLLM virtual key → welcome email
- LLM proxy with per-user budgets ($1 default), model access control, usage tracking
- Manager dashboard to control users and budgets within their instance
- Sysadmin dashboard for global management
- User dashboard with usage stats
- docker-compose running the full stack locally
- Pin OpenWebUI to a specific version

**Non-Goals:**
- Authentik / SSO (Phase 2)
- OpenTelemetry instrumentation (Phase 2)
- Prompt/response logging to S3/Iceberg (start with PostgreSQL)
- Paid subscription billing integration (Stripe etc.)
- Multi-region deployment
- Kubernetes / Helm (future)
- Custom MCP development
- RAG configuration
- Mobile responsiveness for dashboards (basic responsive is fine)

## Decisions

### 1. Better Auth for portal authentication

Use Better Auth embedded in the Next.js app for signup, login, sessions, email verification, and password reset. Custom forms on yardie.ai — no redirect to external IdP.

**Why:** TypeScript-first, designed for Next.js App Router, PostgreSQL native, event hooks for provisioning, MIT license. Authentik deferred because it adds infrastructure complexity and we don't need SSO yet.

**Alternative rejected:** Auth.js v5 — weaker email/password support, no built-in signup flow, more custom code needed.

**Alternative deferred:** Authentik — needed for OpenWebUI SSO in Phase 2 but overkill for Phase 1.

### 2. Scoped role table for RBAC (not Better Auth's admin plugin alone)

Better Auth handles identity + sessions. Authorization uses custom tables: `global_roles` (sysadmin), `instance_roles` (user/manager per instance), `instances`.

**Why:** No auth library handles "manager of cornwall but user of middlesex" natively. Custom tables give full control. Simple to query, simple to extend.

**Alternative rejected:** Ory Keto (Zanzibar) — powerful but massive operational overhead for 5-10 instances.

### 3. LiteLLM Proxy as separate Docker service

LiteLLM handles OpenRouter routing, virtual key management, per-user budgets, model ACLs, rate limiting, and usage tracking. The portal manages LiteLLM via its Admin API.

**Why:** Covers ~80% of requirements out of the box. MIT license. Active maintenance. 5-10 days to integrate vs 20-30 days custom build.

**Alternative rejected:** Custom proxy — more work, same result. Reserved as fallback if LiteLLM becomes a constraint.

### 4. OpenWebUI Functions (not Pipelines) for user attribution

Deploy a Filter Function to each OpenWebUI instance via the admin API. The function injects `user_id`, `user_email`, and `instance_id` into the request metadata before it reaches LiteLLM.

**Why:** No extra container. Runs in-process (microseconds vs milliseconds). Deploy via API call during provisioning. Natural isolation per instance.

**Alternative rejected:** Pipelines (separate service) — overkill for simple metadata injection.

### 5. Separate PostgreSQL databases per service

Single PostgreSQL server, multiple databases: `portal_db`, `litellm_db`, `openwebui_cornwall_db`, etc.

**Why:** Data isolation between services. Independent backup/restore. Each service owns its schema. Shared server keeps infrastructure simple.

### 6. Admin assigns users to instances

After signup, users are in a "pending" state. A manager or sysadmin assigns them to an instance. The provisioning pipeline then creates their OpenWebUI account and LiteLLM virtual key, and sends a welcome email.

**Why:** The user wants manual control in Phase 1. Automated/rules-based assignment deferred to future.

### 7. Argon2id for password hashing

Configure Better Auth to use Argon2id instead of the default bcrypt.

**Why:** Memory-hard, winner of Password Hashing Competition. GCP has sufficient resources.

### 8. Budget in USD, $1 default for new users

Per-user budgets tracked in USD via LiteLLM's virtual key system. New users start with $1. Managers can increase. Sysadmin can set any amount.

**Why:** USD is simpler than tokens since costs vary by model. $1 lets new users try it without manual budget allocation.

### 9. First sysadmin via CLI seed command

`npm run seed:admin -- --email admin@yardie.ai` creates the first user with global sysadmin role directly in PostgreSQL.

**Why:** Secure, one-time, no special UI needed. Avoids "first signup is admin" risk.

### 10. Traefik as reverse proxy for subdomain routing

docker-compose includes Traefik for routing `yardie.ai` → portal, `cornwall.yardie.ai` → OpenWebUI instance, `api.yardie.ai` → LiteLLM (internal only).

**Why:** Traefik has native Docker integration (auto-discovers services via labels). Handles TLS termination. Lighter than nginx for this use case.

## Risks / Trade-offs

- **[Risk] Better Auth maturity** — younger project than Auth.js. → Mitigation: MIT license, we own the code, can fork if abandoned. Migration path to Auth.js documented.
- **[Risk] LiteLLM Admin API changes** — active project with frequent releases. → Mitigation: pin version, test upgrades explicitly.
- **[Risk] OpenWebUI version pinning** — pinning means missing features/security fixes. → Mitigation: scheduled upgrade testing cadence (monthly).
- **[Risk] User provisioning failure** — OpenWebUI API or LiteLLM could be down during provisioning. → Mitigation: retry queue with exponential backoff, logged failures, admin notification.
- **[Risk] Single LiteLLM instance is SPOF** — if proxy goes down, all AI access stops. → Mitigation: auto-restart via Docker, health checks. Hot standby deferred to when service is profitable.
- **[Trade-off] No SSO in Phase 1** — users have separate portal and OpenWebUI credentials. → Acceptable: OpenWebUI credentials are provisioned automatically, user doesn't choose them. SSO in Phase 2 eliminates this friction.
- **[Trade-off] Manual instance assignment** — sysadmin/manager must assign users. → Acceptable for friends/family scale. Automate later.
