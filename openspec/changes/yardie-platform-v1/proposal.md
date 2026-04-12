## Why

Yardie AI currently serves a static landing page with an email waitlist. The vision is to become a platform that democratizes AI access for Jamaicans by hosting managed OpenWebUI instances for friends and family. Each instance lives at a subdomain (cornwall.yardie.ai, middlesex.yardie.ai) and is managed by a trusted person who controls user access and resource budgets. All LLM calls flow through a centralized proxy so the platform owner (sysadmin) controls total spend via a single OpenRouter account.

## What Changes

- **BREAKING** Replace the static landing page email form with a full authentication system (Better Auth + PostgreSQL)
- Add a user dashboard behind login showing usage stats, assigned instance, and budget remaining
- Add a manager dashboard for controlling users within an instance (add/remove users, set budgets, grant model access)
- Add a sysadmin dashboard for global management (instances, all users, total spend, system config)
- Deploy LiteLLM Proxy as a separate service for LLM request routing, per-user budgets, model access control, and usage tracking
- Deploy OpenWebUI instances with user attribution via built-in Functions (inject user_id/instance_id into proxy requests)
- Migrate database from SQLite to PostgreSQL (separate databases per service)
- Add Redis for session management, budget caching, and rate limiting
- Containerize the full stack via docker-compose for local development
- Implement user provisioning pipeline: signup → create OpenWebUI account → assign instance → send welcome email
- Add three-tier subscription model (Free/Standard/Pro) with tiered token budgets and model access

## Capabilities

### New Capabilities
- `portal-auth`: User authentication with Better Auth (email/password signup, login, sessions, email verification, password reset) backed by PostgreSQL
- `user-dashboard`: Authenticated dashboard showing usage stats (tokens used, chats, budget remaining, assigned instance)
- `instance-management`: Manager and sysadmin dashboards for managing OpenWebUI instances, users, roles, budgets, and model access
- `rbac`: Role-based access control with three tiers (user, manager, sysadmin) scoped to instances — including database schema for global_roles, instance_roles, and instances tables
- `llm-proxy`: LiteLLM Proxy configuration with OpenRouter, virtual keys per user, per-user budgets in USD, model allowlists, and streaming passthrough
- `user-provisioning`: Automated pipeline for creating users across Better Auth, OpenWebUI (via admin API), and LiteLLM (virtual key), with retry queue for failures
- `openwebui-integration`: OpenWebUI instance configuration, user attribution via Functions, per-instance API keys, model filtering, and disabled self-registration
- `docker-stack`: docker-compose configuration for local development running portal, LiteLLM, OpenWebUI, PostgreSQL, and Redis

### Modified Capabilities
- `landing-page`: Landing page remains as marketing homepage; authenticated routes added behind `/dashboard`
- `email-waitlist`: Email collection stays but moves to PostgreSQL; waitlist users can be invited to the platform later

## Impact

- **Database**: Full migration from SQLite to PostgreSQL (Cloud SQL in production). Separate databases: portal_db, litellm_db, openwebui_{instance}_db
- **Infrastructure**: 5 Docker services (portal, litellm, openwebui, postgres, redis) vs current single container
- **Dependencies**: Better Auth, pg driver, ioredis, Resend (email), LiteLLM (Python service), OpenWebUI (Docker image)
- **API surface**: New authenticated API routes for dashboard data, user management, instance management, provisioning
- **CI/CD**: GitHub Actions workflow needs updating for multi-service build
- **DNS**: Subdomain routing needed for OpenWebUI instances (nginx/traefik reverse proxy)
