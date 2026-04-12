## 1. Database Migration (SQLite → PostgreSQL)

- [x] 1.1 Add `pg` driver and `@types/pg` to package.json, remove `better-sqlite3` and `@types/better-sqlite3`
- [x] 1.2 Create `lib/db.ts` with PostgreSQL connection pool (singleton, uses DATABASE_URL env var)
- [x] 1.3 Create `lib/schema.sql` with all portal tables: emails, users (Better Auth), sessions, accounts, verification, global_roles, instance_roles, instances, provisioning_tasks
- [x] 1.4 Create `scripts/init-db.ts` that runs schema.sql against the portal database
- [x] 1.5 Update `app/api/submit-email/route.ts` to use PostgreSQL instead of better-sqlite3
- [x] 1.6 Remove `data/` directory and SQLite references from Dockerfile

## 2. Better Auth Setup

- [x] 2.1 Install `better-auth` and `argon2` packages
- [x] 2.2 Create `lib/auth.ts` — Better Auth config with PostgreSQL, Argon2id hashing, email/password enabled, email verification required, 7-day sessions
- [x] 2.3 Create `lib/auth-client.ts` — Better Auth React client for use in client components
- [x] 2.4 Create `app/api/auth/[...all]/route.ts` — Better Auth catch-all handler
- [x] 2.5 Configure Resend as email provider for verification and password reset emails
- [x] 2.6 Create `middleware.ts` — protect `/dashboard/*`, `/instances/*`, `/admin/*` routes, redirect unauthenticated users to `/login`

## 3. Auth Pages

- [x] 3.1 Create `app/(auth)/login/page.tsx` — login form (email + password), "Forgot password?" link, link to signup
- [x] 3.2 Create `app/(auth)/signup/page.tsx` — signup form (name + email + password), link to login
- [x] 3.3 Create `app/(auth)/verify-email/page.tsx` — email verification handler (reads token from URL)
- [x] 3.4 Create `app/(auth)/forgot-password/page.tsx` — password reset request form
- [x] 3.5 Create `app/(auth)/reset-password/page.tsx` — new password form (reads reset token from URL)
- [x] 3.6 Style all auth pages to match the landing page dark theme (bg-dark-900, primary/accent gradients)

## 4. RBAC System

- [x] 4.1 Create `lib/permissions.ts` — getUserPermissions(), canManageInstance(), canAccessInstance(), isSysadmin() functions
- [x] 4.2 Create `lib/types.ts` — update with role types (GlobalRole, InstanceRole), instance types, permission types, Zod schemas for all
- [x] 4.3 Integrate RBAC checks into middleware.ts — `/admin/*` requires sysadmin, `/instances/:id/manage` requires manager or sysadmin
- [x] 4.4 Create `scripts/seed-admin.ts` — CLI command to create first sysadmin (`npm run seed:admin -- --email <email>`)

## 5. Landing Page Updates

- [x] 5.1 Add header/nav bar to landing page with "Sign In" link (unauthenticated) or "Dashboard" link (authenticated)
- [x] 5.2 Update `app/layout.tsx` to support both public and authenticated layouts

## 6. User Dashboard

- [x] 6.1 Create `app/(app)/dashboard/page.tsx` — Server Component showing user name, instance link, usage summary
- [x] 6.2 Create `lib/usage.ts` — functions to query LiteLLM database for user usage stats (tokens, cost, conversations)
- [x] 6.3 Create `components/dashboard/usage-stats.tsx` — display tokens used, budget remaining, conversation count, subscription tier
- [x] 6.4 Create `components/dashboard/instance-link.tsx` — link to user's OpenWebUI instance or "not assigned" message

## 7. Instance Management Dashboard

- [x] 7.1 Create `app/(app)/instances/[id]/manage/page.tsx` — manager view with user table, budget controls, model access
- [x] 7.2 Create `components/instance/user-table.tsx` — table of instance users with role, budget, usage, status
- [x] 7.3 Create `app/api/instances/[id]/users/route.ts` — API route to list users in an instance
- [x] 7.4 Create `app/api/instances/[id]/users/[userId]/budget/route.ts` — API route to update user budget (calls LiteLLM Admin API)
- [x] 7.5 Create `app/api/instances/[id]/users/[userId]/models/route.ts` — API route to update user model access (calls LiteLLM Admin API)

## 8. Sysadmin Dashboard

- [x] 8.1 Create `app/(app)/admin/page.tsx` — global overview: all instances, user counts, total spend
- [x] 8.2 Create `app/(app)/admin/instances/page.tsx` — list all instances with status, user count, link to manage
- [x] 8.3 Create `app/(app)/admin/instances/new/page.tsx` — form to register a new instance (name, subdomain, base_url)
- [x] 8.4 Create `app/(app)/admin/users/page.tsx` — all users across all instances, with assign/role actions
- [x] 8.5 Create `app/(app)/admin/waitlist/page.tsx` — view waitlist emails, invite action
- [x] 8.6 Create API routes for sysadmin actions: create instance, assign user to instance, update roles

## 9. User Provisioning Pipeline

- [x] 9.1 Create `lib/provisioning.ts` — functions to provision user in OpenWebUI (admin API), create LiteLLM virtual key (admin API), send welcome email (Resend)
- [x] 9.2 Create provisioning_tasks table and retry queue logic (enqueue, process, exponential backoff)
- [x] 9.3 Hook provisioning into the "assign user to instance" action — when sysadmin/manager assigns a user, trigger the pipeline
- [x] 9.4 Create `scripts/process-provisioning.ts` — worker that polls the provisioning_tasks table and processes pending tasks
- [x] 9.5 Add provisioning status to sysadmin dashboard (pending, completed, failed tasks)

## 10. LiteLLM Proxy Configuration

- [x] 10.1 Create `litellm/config.yaml` — LiteLLM configuration with OpenRouter models, PostgreSQL database URL, Redis cache
- [x] 10.2 Create `litellm/Dockerfile` (or use official image with config mounted)
- [x] 10.3 Configure virtual key creation via LiteLLM Admin API wrapper in `lib/litellm-admin.ts`
- [x] 10.4 Test: create virtual key, send chat completion, verify budget tracking works

## 11. OpenWebUI Integration

- [x] 11.1 Create `openwebui/user-attribution-function.py` — Filter Function that injects user_id, user_email, instance_id into request metadata
- [x] 11.2 Create `scripts/deploy-function.ts` — script to deploy the attribution function to an OpenWebUI instance via admin API
- [x] 11.3 Document OpenWebUI env var configuration: OPENAI_API_BASE_URLS, OPENAI_API_KEYS, ENABLE_SIGNUP=false, DATABASE_URL, WEBUI_SECRET_KEY, ENABLE_MODEL_FILTER
- [x] 11.4 Test: user chats in OpenWebUI → request reaches LiteLLM with user metadata → usage tracked correctly

## 12. Docker Compose Stack

- [x] 12.1 Create `docker-compose.yml` with all services: portal, litellm, openwebui-test, postgres, redis, traefik
- [x] 12.2 Create `postgres/init.sql` — init script to create portal_db, litellm_db, openwebui_test_db
- [x] 12.3 Create `.env.example` with all required environment variables documented
- [x] 12.4 Create traefik configuration for subdomain routing (localhost → portal, test.localhost → openwebui)
- [x] 12.5 Add health checks to all services
- [x] 12.6 Test full stack: `docker compose up`, signup, assign to instance, chat in OpenWebUI, verify usage on dashboard

## 13. Cleanup & Verification

- [x] 13.1 Remove old SQLite files and better-sqlite3 references
- [x] 13.2 Update Dockerfile for portal (PostgreSQL client libs, no SQLite build tools)
- [x] 13.3 Update .dockerignore for new project structure
- [x] 13.4 Verify `npm run build` passes with no TypeScript errors
- [x] 13.5 Update README.md with new architecture, setup instructions, and docker-compose usage
- [x] 13.6 End-to-end test: signup → verify email → login → get assigned to instance → chat → view usage stats
