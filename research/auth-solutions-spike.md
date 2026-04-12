# Authentication Solutions Research Spike for yardie.ai

**Date**: 2026-04-08
**Author**: Research Agent
**Status**: Complete

---

## Key Findings

1. **Better Auth is the strongest fit for yardie.ai.** It is TypeScript-first, designed for Next.js App Router, supports PostgreSQL natively, includes built-in RBAC via plugins, provides event hooks for user provisioning, and is fully self-hosted. It is the most modern option with the best developer experience for this exact stack.

2. **Auth.js (NextAuth v5) is the safe fallback** with the largest community but has weaker RBAC support and requires more custom code for the provisioning pipeline. Its v5 release for App Router has had a rocky history with frequent breaking changes.

3. **For OIDC provider capability, a dedicated identity server (Authentik or Keycloak) is the most proven path**, though Better Auth's plugin system may support this in the future. If yardie.ai must become an OIDC provider that OpenWebUI trusts, pairing Better Auth (for the portal) with Authentik (as the IdP) is a pragmatic split.

4. **Cross-subdomain auth is achievable** with cookie domain settings (`.yardie.ai`) for the portal itself, but OpenWebUI instances run their own auth. The real solution is OIDC/SSO: portal is the IdP, OpenWebUI instances are relying parties.

5. **Scoped RBAC (manager-per-instance) requires a custom permissions table** regardless of which auth library is chosen. No off-the-shelf solution handles "manager of cornwall but user of middlesex" natively.

6. **The migration from SQLite to PostgreSQL should happen before or concurrently with auth implementation**, since every recommended solution uses PostgreSQL as its session/user store.

---

## Table of Contents

1. [Auth Solutions Comparison](#1-auth-solutions-comparison)
2. [Detailed Solution Evaluations](#2-detailed-solution-evaluations)
3. [OIDC/SSO Provider Capability](#3-oidcsso-provider-capability)
4. [Role-Based Access Control Patterns](#4-role-based-access-control-patterns)
5. [Webhook/Event Support for User Provisioning](#5-webhookevent-support-for-user-provisioning)
6. [Security Considerations](#6-security-considerations)
7. [Cross-Subdomain Authentication](#7-cross-subdomain-authentication)
8. [Recommendation for yardie.ai](#8-recommendation-for-yardieai)
9. [Open Questions](#9-open-questions)
10. [Sources](#10-sources)

---

## 1. Auth Solutions Comparison

### Summary Comparison Table

| Feature | Better Auth | Auth.js v5 | Lucia | Supabase Auth (OSS) | Ory Kratos+Keto | Clerk | Auth0 | WorkOS | Kinde |
|---------|------------|------------|-------|---------------------|-----------------|-------|-------|--------|-------|
| **Type** | Library | Library | Library (deprecated) | Platform | Platform | SaaS | SaaS | SaaS | SaaS |
| **Open Source** | Yes (MIT) | Yes (ISC) | Yes (MIT) | Yes (Apache 2.0) | Yes (Apache 2.0) | No | No (free tier) | No | No (free tier) |
| **Self-hosted** | Yes (embedded) | Yes (embedded) | Yes (embedded) | Yes (Docker) | Yes (Docker) | No | No | No | No |
| **TypeScript-first** | Yes | Partial | Yes | No (Go backend) | No (Go backend) | N/A (SDK) | N/A (SDK) | N/A (SDK) | N/A (SDK) |
| **Next.js 15 App Router** | First-class | First-class | Manual | Via SDK | Via SDK | First-class | Via SDK | Via SDK | Via SDK |
| **Email/Password** | Yes (built-in) | Via Credentials provider | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| **Social Login** | Yes (30+ providers) | Yes (80+ providers) | Manual | Yes (limited) | Yes (via OIDC) | Yes | Yes | Yes | Yes |
| **Magic Link** | Yes (plugin) | Yes (Email provider) | Manual | Yes | Yes | Yes | Yes | No | Yes |
| **MFA/2FA** | Yes (plugin) | Limited | Manual | Yes | Yes | Yes | Yes | Yes | Yes |
| **PostgreSQL** | Yes (native adapter) | Yes (Drizzle/Prisma adapter) | Yes (manual) | Required | Required | N/A | N/A | N/A | N/A |
| **RBAC** | Yes (plugin) | No (DIY) | No (DIY) | Via Postgres RLS | Yes (Keto) | Yes (basic) | Yes | Yes | Yes |
| **Session Strategy** | DB + cookies | JWT or DB sessions | DB sessions | JWT (GoTrue) | Session tokens | Managed | Managed | Managed | Managed |
| **OIDC Provider** | No (not yet) | No | No | No | No (consumer only) | No | Yes (enterprise) | Yes | No |
| **Webhook/Events** | Yes (hooks API) | Yes (callbacks/events) | No | Yes (webhooks) | Yes (webhooks) | Yes (webhooks) | Yes (hooks) | Yes (webhooks) | Yes (webhooks) |
| **GitHub Stars** | ~26k | ~26k | ~10k (archived) | ~80k (main repo) | ~13k (Kratos) | N/A | N/A | N/A | N/A |
| **Pricing** | Free | Free | Free | Free self-hosted | Free self-hosted | Free to 10k MAU | Free to 25k MAU | Free to 1M MAU | Free to 10.5k MAU |
| **Migration Difficulty** | Medium | Medium | N/A | Hard | Hard | Hard | Hard | Hard | Hard |

---

## 2. Detailed Solution Evaluations

### 2.1 Better Auth

**Repository**: https://github.com/better-auth/better-auth
**Docs**: https://www.better-auth.com
**License**: MIT
**Stars**: ~26,000 (as of early 2026)

#### Overview
Better Auth is a TypeScript-first authentication library that emerged in late 2024 and has rapidly grown in popularity. It was designed from the ground up for modern frameworks, with Next.js App Router as a primary target. It uses a plugin architecture and handles auth entirely within your application process (no external auth server).

#### Core Features
- **Email/password**: Built-in with configurable password hashing (bcrypt by default, argon2 optional)
- **Social login**: 30+ OAuth providers (Google, GitHub, Apple, Discord, etc.)
- **Magic link**: Available via plugin
- **MFA/2FA**: TOTP and backup codes via plugin
- **Email verification**: Built-in flow
- **Password reset**: Built-in flow
- **Organization/teams**: Plugin for multi-tenant structures
- **Session management**: Database-backed sessions with secure httpOnly cookies
- **Admin API**: Plugin for user management dashboard

#### Next.js 15 App Router Integration

Better Auth provides a dedicated Next.js integration. Setup involves:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
```

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});
```

Server-side session access in Server Components:

```typescript
// app/dashboard/page.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  return <div>Welcome, {session.user.name}</div>;
}
```

Middleware protection:

```typescript
// middleware.ts
import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

#### Database Requirements
- Creates its own tables: `user`, `session`, `account`, `verification`
- Native support for PostgreSQL (via `pg` or `postgres` driver), MySQL, SQLite, MongoDB
- Also works with Prisma, Drizzle, Kysely ORMs
- Tables are auto-created on first run (configurable)
- Schema is extendable -- you can add custom fields to user/session tables

#### RBAC Support
Better Auth has a built-in RBAC plugin (called "admin" or "access control" plugin):

```typescript
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["sysadmin", "manager"],
    }),
  ],
});
```

The `user` table gets a `role` column. For scoped roles (manager of a specific instance), you would need the **organization plugin** or custom tables.

#### Session Strategy
- Database-backed sessions by default (not JWT)
- Session token stored in httpOnly, secure, sameSite cookie
- Configurable session duration and refresh behavior
- Session table tracks device, IP, user agent
- Supports session revocation and listing active sessions

#### Pricing
- Completely free, MIT license
- No paid tier or hosted version
- Community support via Discord and GitHub

#### Maturity and Maintenance
- Created mid-2024, rapidly matured through 2025
- Very active development -- multiple releases per month
- Growing community (~26k GitHub stars)
- Primary maintainer is actively engaged
- Risk: younger project, API may still evolve
- Mitigant: large community and adoption momentum

#### Migration Difficulty
- If switching away FROM Better Auth: moderate. Data is in standard PostgreSQL tables you control
- If switching TO Better Auth: easy from scratch, moderate from existing auth

#### Verdict for yardie.ai
**Strong fit.** TypeScript-first, App Router native, PostgreSQL support, plugin-based RBAC, event hooks for provisioning. The main gap is no OIDC provider capability.

---

### 2.2 Auth.js (NextAuth v5)

**Repository**: https://github.com/nextauthjs/next-auth
**Docs**: https://authjs.dev
**License**: ISC
**Stars**: ~26,000

#### Overview
Auth.js (formerly NextAuth.js) is the most established auth library in the Next.js ecosystem. Version 5 was rebuilt for the App Router. It has the largest community but has had a difficult v4-to-v5 migration with frequent API changes.

#### Core Features
- **Email/password**: Via "Credentials" provider (limited -- no built-in signup flow, password hashing, or email verification)
- **Social login**: 80+ OAuth providers (the largest selection)
- **Magic link**: Via Email provider (requires email service)
- **MFA/2FA**: Not built-in (requires custom implementation)
- **Email verification**: Not built-in for credentials
- **Password reset**: Not built-in

#### Next.js 15 App Router Integration

```typescript
// auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        // YOU must implement: lookup user, verify password
        // Auth.js does NOT handle this
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.role = user.role; // custom field
      return session;
    },
  },
});
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
```

Server Component session access:

```typescript
import { auth } from "@/auth";

export default async function Page() {
  const session = await auth();
  if (!session) redirect("/login");
  return <div>Welcome {session.user.name}</div>;
}
```

#### Database Requirements
- Uses adapters: Drizzle, Prisma, TypeORM, etc.
- Creates tables: `users`, `accounts`, `sessions`, `verification_tokens`
- PostgreSQL well-supported via Drizzle or Prisma adapter
- Schema is somewhat rigid -- extending requires adapter customization

#### RBAC Support
- **No built-in RBAC.** You must:
  1. Add a `role` column to the users table manually
  2. Extend the session callback to include it
  3. Build your own authorization checks
  4. Build your own admin UI

#### Session Strategy
- **JWT strategy** (default): Session data encoded in a signed cookie. No database reads on every request. Cannot be revoked server-side without a blocklist.
- **Database strategy**: Session stored in DB, cookie holds session ID. Revocable, but requires DB read per request.
- Most Next.js deployments use JWT for simplicity.

#### Pricing
- Free, ISC license

#### Maturity and Maintenance
- Created 2020, largest Next.js auth community
- v5 has been in development/beta for years (started 2023)
- API instability during v4-to-v5 transition frustrated many developers
- As of 2026, v5 is stable but the Credentials provider is still considered a second-class citizen
- The library's strength is OAuth/social login, not email/password

#### Migration Difficulty
- Switching away: moderate (standard DB tables)
- The Credentials provider footgun: if you start with Auth.js for email/password, you end up building half of auth yourself anyway (signup, password hashing, reset, verification). You might as well use a more complete solution.

#### Verdict for yardie.ai
**Viable but suboptimal.** Auth.js is great for social-login-heavy apps. For yardie.ai, which needs email/password as the primary method plus RBAC, you would need to build significant custom code on top of Auth.js. The Credentials provider is intentionally bare-bones.

---

### 2.3 Lucia

**Repository**: https://github.com/lucia-auth/lucia
**Docs**: https://lucia-auth.com
**License**: MIT
**Stars**: ~10,000

#### Overview
Lucia was a lightweight, session-based auth library written in TypeScript. It provided session management primitives and left everything else to the developer.

#### Current Status: DEPRECATED
**Lucia was officially deprecated in early 2025.** The maintainer archived the repository and recommended migrating to other solutions (Better Auth was specifically recommended). The website now displays a deprecation notice.

The maintainer published guides for "rolling your own auth" using Lucia's patterns, which are educational but not a maintained library.

#### Verdict for yardie.ai
**Do not use.** Deprecated, archived, no security patches. Historical interest only. If you liked Lucia's approach (minimal, session-based), Better Auth is the spiritual successor with more features.

---

### 2.4 Supabase Auth (Self-hosted)

**Repository**: https://github.com/supabase/supabase
**Docs**: https://supabase.com/docs/guides/auth
**License**: Apache 2.0
**Stars**: ~80,000 (whole platform)

#### Overview
Supabase Auth is part of the Supabase platform, built on GoTrue (a Go-based auth server). You can self-host the entire Supabase stack via Docker, which includes auth, database (PostgreSQL), storage, and realtime.

#### Core Features
- Email/password, magic link, phone/SMS OTP
- Social login (Google, GitHub, Apple, etc.)
- MFA/TOTP
- Row Level Security (RLS) integration with PostgreSQL
- Anonymous sign-in
- SAML SSO (enterprise)

#### Self-Hosted Reality
Self-hosting Supabase means running:
- **GoTrue** (auth server) -- Go binary
- **PostgreSQL** (already needed)
- **PostgREST** (API server)
- **Kong** (API gateway)
- **Realtime** server
- **Storage** server
- **Studio** (admin UI)

This is a LOT of infrastructure for just auth. You would be deploying an entire platform to use one feature. The Docker Compose file for self-hosted Supabase includes 10+ containers.

Alternatively, you could run GoTrue standalone, but it is designed to work within the Supabase ecosystem and has limited documentation for standalone use.

#### Next.js 15 Integration
Supabase provides `@supabase/ssr` for Next.js server-side auth:

```typescript
// lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

#### RBAC Support
Supabase Auth does not have built-in RBAC. It provides:
- `app_metadata` field on user (set server-side, e.g., `{ role: "admin" }`)
- PostgreSQL Row Level Security for data access control
- Custom claims via database functions

You would still build your own role checking logic.

#### Session Strategy
- JWT-based (GoTrue issues JWTs)
- Access token + refresh token
- Tokens stored in cookies via `@supabase/ssr`
- Short-lived access tokens (default: 1 hour), refresh on expiry

#### Verdict for yardie.ai
**Overkill and poor fit.** Deploying the entire Supabase stack for auth is like buying a fleet of trucks to deliver a letter. You already plan to use PostgreSQL directly. Running GoTrue standalone is underdocumented. If you are not using Supabase for your database, this adds unnecessary complexity. The JWT-based session model also means you cannot instantly revoke sessions.

---

### 2.5 Ory (Kratos + Keto)

**Repository**: https://github.com/ory/kratos (identity), https://github.com/ory/keto (permissions)
**Docs**: https://www.ory.sh/docs
**License**: Apache 2.0
**Stars**: ~13,000 (Kratos), ~5,000 (Keto)

#### Overview
Ory is an enterprise-grade identity and permissions platform. Kratos handles identity management (signup, login, MFA, account recovery), and Keto handles permissions (based on Google's Zanzibar paper). Both are Go services that run alongside your application.

#### Core Features
- **Kratos**: Email/password, social login (OIDC), MFA (TOTP, WebAuthn), passwordless, identity schemas, self-service flows, account recovery, email verification
- **Keto**: Fine-grained permissions (Zanzibar-style relation tuples), namespace-based, check/expand/list APIs

#### Architecture
Ory components run as separate Docker containers:
- Kratos (identity) -- exposes admin and public APIs
- Keto (permissions) -- exposes read and write APIs
- Oathkeeper (optional, API gateway/proxy)

Your Next.js app communicates with these via HTTP APIs. You do NOT embed Ory in your code; it is a sidecar service.

#### Next.js 15 Integration
Ory provides a JavaScript SDK (`@ory/client`), but the integration is more work than library-based solutions:

```typescript
// lib/ory.ts
import { Configuration, FrontendApi } from "@ory/client";

export const ory = new FrontendApi(
  new Configuration({
    basePath: process.env.ORY_SDK_URL,
    baseOptions: { withCredentials: true },
  })
);
```

You build your own login/signup forms and call Ory's API. Ory provides self-service UI reference implementations, but they need customization to match your design.

#### RBAC/Permissions
Keto is extremely powerful for permissions:

```
// Relation tuples (Zanzibar style)
instance:cornwall#manager@user:alice
instance:middlesex#user@user:alice
organization:yardie#sysadmin@user:bob
```

Check permissions:
```typescript
const allowed = await ketoClient.checkPermission({
  namespace: "instance",
  object: "cornwall",
  relation: "manager",
  subjectId: "alice",
});
```

This is the most sophisticated permissions model of any option evaluated -- it natively handles scoped roles like "manager of cornwall."

#### Verdict for yardie.ai
**Powerful but heavy.** Ory is the right choice for organizations with dedicated DevOps teams running complex identity infrastructure. For yardie.ai (a small team, early stage), the operational overhead of running Kratos + Keto + Oathkeeper as separate containers, managing their configuration YAML files, and building custom UI is significant. However, if the RBAC requirements become very complex (many instances, hierarchical roles, delegated admin), Ory Keto's Zanzibar model is unmatched.

Consider Ory as a future migration target if yardie.ai's permissions model outgrows simpler solutions.

---

### 2.6 Clerk (Managed SaaS)

**Docs**: https://clerk.com/docs
**Pricing**: Free up to 10,000 MAU, then $0.02/MAU

#### Overview
Clerk is a managed authentication and user management platform with excellent Next.js integration. It provides pre-built UI components (sign-in, sign-up, user profile) and a dashboard for user management.

#### Next.js 15 Integration
Clerk has the best Next.js DX of any managed solution:

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";
export default clerkMiddleware();
```

```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html><body>{children}</body></html>
    </ClerkProvider>
  );
}
```

#### Why Not for yardie.ai
- **Not self-hostable**: All data lives on Clerk's servers
- **Vendor lock-in**: Migrating away means rebuilding auth entirely
- **Cost at scale**: $0.02/MAU adds up with many users across instances
- **Data sovereignty**: User data on third-party infrastructure
- **Subdomain complexity**: Cross-subdomain auth requires Clerk's multi-domain feature (enterprise plan)

#### RBAC
Clerk has basic roles via Organizations feature. Supports custom roles and permissions. However, scoped roles (manager of a specific instance) require their Organization model, which maps reasonably well but adds Clerk-specific coupling.

#### Verdict for yardie.ai
**Not recommended.** The managed nature conflicts with self-hosting requirements and adds cost/vendor-lock-in that is unacceptable for a platform managing other self-hosted services (OpenWebUI).

---

### 2.7 Auth0 (Managed SaaS)

**Docs**: https://auth0.com/docs
**Pricing**: Free up to 25,000 MAU, then usage-based (expensive at scale)

#### Overview
Auth0 (owned by Okta) is the most established managed auth platform. Enterprise-grade features including SAML, OIDC provider capability, MFA, anomaly detection.

#### Key Advantage: OIDC Provider
Auth0 can act as an OIDC provider -- other applications (like OpenWebUI) can use Auth0 as their identity provider. This is a key requirement for yardie.ai's future SSO vision.

#### Why Not for yardie.ai
- **Not self-hostable** (the open-source version, Auth0 Deploy CLI, is just for config management)
- **Expensive at scale**: Enterprise features (like OIDC provider, custom domains) require paid plans
- **Vendor lock-in**: Deep integration makes switching painful
- **Latency**: Auth requests go to Auth0's cloud, adding latency for self-hosted deployments

#### Verdict for yardie.ai
**Not recommended for primary auth.** However, Auth0's OIDC provider capability is worth noting. If yardie.ai grows and needs a managed IdP, Auth0 could serve that role. For now, it is overkill and conflicts with the self-hosted philosophy.

---

### 2.8 WorkOS (Managed SaaS)

**Docs**: https://workos.com/docs
**Pricing**: Free up to 1 million MAU (generous), enterprise SSO add-ons paid

#### Overview
WorkOS focuses on enterprise SSO (SAML, OIDC) and directory sync. Its AuthKit product provides user management with enterprise-ready features.

#### Key Features
- User management with email/password and social login
- Enterprise SSO (SAML, OIDC) -- for enterprises using yardie.ai
- Directory sync (SCIM)
- Very generous free tier (1M MAU)

#### Why Not for yardie.ai
- Not self-hostable
- Primary value is enterprise SSO (connecting to customer IdPs), not being an IdP yourself
- Less relevant for a platform managing its own users across OpenWebUI instances

#### Verdict for yardie.ai
**Not the right fit.** WorkOS would be relevant if yardie.ai's customers were enterprises wanting to connect their corporate IdP. That is not the current use case.

---

### 2.9 Kinde (Managed SaaS)

**Docs**: https://kinde.com/docs
**Pricing**: Free up to 10,500 MAU

#### Overview
Kinde is a newer managed auth platform with good Next.js support, built-in feature flags, and a focus on developer experience.

#### Key Features
- Email/password, social login, passwordless
- MFA
- Organizations and roles
- Feature flags (unique feature)

#### Why Not for yardie.ai
- Not self-hostable
- Smaller community and less proven at scale
- Same vendor lock-in concerns as other SaaS options

#### Verdict for yardie.ai
**Not recommended.** Same issues as other managed solutions, with less maturity than Auth0 or Clerk.

---

## 3. OIDC/SSO Provider Capability

This is a critical future requirement: yardie.ai may need to act as the identity provider that OpenWebUI instances trust for SSO login.

### What OpenWebUI Needs from an OIDC Provider

OpenWebUI supports OAuth/OIDC login via environment variables:

```bash
# OpenWebUI OIDC configuration
ENABLE_OAUTH_SIGNUP=true
OAUTH_PROVIDER_NAME=yardie-ai
OAUTH_CLIENT_ID=openwebui-cornwall
OAUTH_CLIENT_SECRET=secret-here
OPENID_PROVIDER_URL=https://auth.yardie.ai/.well-known/openid-configuration
OAUTH_SCOPES=openid email profile
```

OpenWebUI expects a standard OIDC provider that exposes:
- `/.well-known/openid-configuration` -- discovery document
- `/authorize` -- authorization endpoint
- `/token` -- token endpoint
- `/userinfo` -- user info endpoint
- JWKS endpoint for token verification

### Which Solutions Can Act as OIDC Provider?

| Solution | OIDC Provider? | Notes |
|----------|---------------|-------|
| Better Auth | No | Consumer only. No plans announced for provider mode |
| Auth.js v5 | No | Consumer only |
| Lucia | No | Deprecated |
| Supabase Auth | No | Consumer only |
| Ory Hydra | **Yes** | Dedicated OIDC/OAuth2 provider server. Separate from Kratos |
| Keycloak | **Yes** | Full-featured IdP with OIDC provider, SAML, LDAP |
| Authentik | **Yes** | Modern IdP with OIDC provider, proxy auth, great UI |
| Auth0 | **Yes** | Managed OIDC provider (paid for custom domains) |
| Dex | **Yes** | Lightweight OIDC provider (CNCF, used by Kubernetes) |

### Recommended OIDC Provider Options for yardie.ai

#### Option A: Authentik (Recommended)

**Repository**: https://github.com/goauthentik/authentik
**Docs**: https://docs.goauthentik.io
**License**: Open source (startup-friendly license)
**Stars**: ~15,000+

Authentik is a modern identity provider that can:
- Act as OIDC provider for OpenWebUI instances
- Manage users, groups, and permissions
- Provide self-service user portal
- Handle MFA, social login, SAML
- Run as Docker containers (server + worker + PostgreSQL + Redis)

Architecture with yardie.ai:
```
User -> yardie.ai (Next.js portal)
         |
         +-- Auth via Better Auth (portal sessions)
         |
         +-- Provisions user in Authentik (API call)
         |
User -> cornwall.yardie.ai (OpenWebUI)
         |
         +-- OIDC login via Authentik
         |
         +-- Authentik verifies identity, returns token
```

Authentik Docker deployment:
```yaml
# docker-compose.yml (partial)
services:
  authentik-server:
    image: ghcr.io/goauthentik/server:latest
    command: server
    environment:
      AUTHENTIK_SECRET_KEY: ${AUTHENTIK_SECRET_KEY}
      AUTHENTIK_POSTGRESQL__HOST: db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: ${PG_PASS}
      AUTHENTIK_POSTGRESQL__NAME: authentik
    ports:
      - "9000:9000"
      - "9443:9443"

  authentik-worker:
    image: ghcr.io/goauthentik/server:latest
    command: worker

  redis:
    image: redis:alpine
```

#### Option B: Keycloak

**Repository**: https://github.com/keycloak/keycloak
**Docs**: https://www.keycloak.org/documentation
**License**: Apache 2.0
**Stars**: ~25,000+

Keycloak is the most established open-source IdP, maintained by Red Hat. Extremely feature-rich but heavier (Java-based, larger resource footprint).

Pros over Authentik:
- More mature, larger community
- More protocol support (SAML 2.0, LDAP, Kerberos)
- Better enterprise documentation

Cons:
- Java-based, heavier resource usage
- Admin UI is dated compared to Authentik
- More complex configuration
- Larger Docker image

#### Option C: Build OIDC Provider into Next.js (Not Recommended)

You could implement the OIDC provider spec in your Next.js app using libraries like `oidc-provider` (Node.js):

```typescript
// Theoretical -- NOT recommended
import Provider from "oidc-provider";

const oidc = new Provider("https://auth.yardie.ai", {
  clients: [
    {
      client_id: "openwebui-cornwall",
      client_secret: "secret",
      redirect_uris: ["https://cornwall.yardie.ai/oauth/callback"],
    },
  ],
  // ... complex configuration
});
```

This is technically possible but inadvisable. Implementing OIDC correctly involves:
- Token signing and rotation
- Consent screens
- Discovery documents
- JWKS endpoints
- Grant types (authorization code, refresh tokens)
- Security considerations (PKCE, state parameter)

Getting this wrong has direct security implications. Use a dedicated IdP instead.

### Recommended Architecture

**Phase 1 (Now)**: Use Better Auth for yardie.ai portal auth. No OIDC provider yet. OpenWebUI instances use their own built-in auth. User provisioning is done via OpenWebUI's admin API.

**Phase 2 (When SSO is needed)**: Deploy Authentik alongside the portal. Migrate user identities to Authentik. Configure OpenWebUI instances to use Authentik as their OIDC provider. yardie.ai portal also authenticates against Authentik (or keeps Better Auth and syncs to Authentik).

**Phase 3 (Mature)**: Authentik becomes the single source of truth for identity. All services (portal, OpenWebUI instances, future services) use Authentik for auth. Portal manages users via Authentik's API.

---

## 4. Role-Based Access Control Patterns

### The Three-Tier Role System

yardie.ai needs three roles:
1. **user** -- regular user, access to their assigned OpenWebUI instance
2. **manager** -- manages users within a specific OpenWebUI instance
3. **sysadmin** -- full access to everything

Critical detail: **manager is scoped to an instance**. A person can be a manager of cornwall.yardie.ai but just a user of middlesex.yardie.ai.

### Pattern Options

#### A. Simple Role Column (Insufficient)

```sql
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
-- Values: 'user', 'manager', 'sysadmin'
```

This fails because it cannot represent "manager of cornwall but user of middlesex."

#### B. Scoped Role Table (Recommended)

```sql
-- Users table (managed by Better Auth)
CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  -- Better Auth manages these columns
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Global roles (sysadmin is global)
CREATE TABLE global_roles (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('sysadmin')),
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by TEXT REFERENCES "user"(id),
  PRIMARY KEY (user_id, role)
);

-- OpenWebUI instances
CREATE TABLE instances (
  id TEXT PRIMARY KEY,           -- e.g., 'cornwall'
  name TEXT NOT NULL,             -- e.g., 'Cornwall Instance'
  subdomain TEXT NOT NULL UNIQUE, -- e.g., 'cornwall'
  base_url TEXT NOT NULL,         -- e.g., 'https://cornwall.yardie.ai'
  api_url TEXT NOT NULL,          -- e.g., 'https://cornwall.yardie.ai/api'
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Instance-scoped roles
CREATE TABLE instance_roles (
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL REFERENCES instances(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'manager')),
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by TEXT REFERENCES "user"(id),
  PRIMARY KEY (user_id, instance_id)
);

-- Indexes
CREATE INDEX idx_instance_roles_user ON instance_roles(user_id);
CREATE INDEX idx_instance_roles_instance ON instance_roles(instance_id);
CREATE INDEX idx_global_roles_user ON global_roles(user_id);
```

#### C. Permission Functions

```typescript
// lib/permissions.ts

import { db } from "@/lib/db";

type GlobalRole = "sysadmin";
type InstanceRole = "user" | "manager";

interface UserPermissions {
  isSysadmin: boolean;
  instanceRoles: Map<string, InstanceRole>;
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const globalRoles = await db.query(
    `SELECT role FROM global_roles WHERE user_id = $1`,
    [userId]
  );

  const instanceRoles = await db.query(
    `SELECT instance_id, role FROM instance_roles WHERE user_id = $1`,
    [userId]
  );

  return {
    isSysadmin: globalRoles.rows.some(r => r.role === "sysadmin"),
    instanceRoles: new Map(
      instanceRoles.rows.map(r => [r.instance_id, r.role as InstanceRole])
    ),
  };
}

export function canManageInstance(
  permissions: UserPermissions,
  instanceId: string
): boolean {
  if (permissions.isSysadmin) return true;
  return permissions.instanceRoles.get(instanceId) === "manager";
}

export function canAccessInstance(
  permissions: UserPermissions,
  instanceId: string
): boolean {
  if (permissions.isSysadmin) return true;
  return permissions.instanceRoles.has(instanceId);
}
```

#### D. Middleware Integration

```typescript
// middleware.ts (with Better Auth + custom RBAC)
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check instance-specific routes
  const instanceMatch = request.nextUrl.pathname.match(
    /^\/instances\/([^/]+)\/manage/
  );

  if (instanceMatch) {
    const instanceId = instanceMatch[1];
    const permissions = await getUserPermissions(session.user.id);

    if (!canManageInstance(permissions, instanceId)) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  // Check sysadmin routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const permissions = await getUserPermissions(session.user.id);

    if (!permissions.isSysadmin) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}
```

### How Each Auth Solution Handles RBAC

| Solution | RBAC Approach | Scoped Roles? |
|----------|--------------|---------------|
| Better Auth | `admin` plugin adds role column; `organization` plugin for scoping | Partial -- org plugin maps to instances |
| Auth.js | DIY entirely | DIY entirely |
| Ory Keto | Zanzibar relation tuples -- native support for any scope | Yes -- designed for this |
| Clerk | Organizations + custom roles | Yes via Organizations |
| Auth0 | RBAC with permissions API | Yes via Organizations |

### Recommendation

Use **Pattern B (Scoped Role Table)** with Better Auth. Better Auth handles user identity and sessions; your custom `instance_roles` and `global_roles` tables handle authorization. This gives you full control over the permission model without being locked into any auth library's opinionated RBAC.

---

## 5. Webhook/Event Support for User Provisioning

When a user signs up on yardie.ai, we need to:
1. Create the user in our database (auth library handles this)
2. Create their account in the assigned OpenWebUI instance (via API)
3. Assign their instance role in our database

### Provisioning Architecture

```
User signs up on yardie.ai
       |
       v
Better Auth creates user in PostgreSQL
       |
       v
After-signup hook triggers provisioning
       |
       v
API call to OpenWebUI instance:
  POST https://cornwall.yardie.ai/api/v1/auths/add
  {
    "email": "user@example.com",
    "name": "User Name",
    "password": "<generated>",
    "role": "user"
  }
       |
       v
Store OpenWebUI user ID mapping
       |
       v
Insert instance_role record
```

### How Each Solution Handles Events

#### Better Auth -- Hooks API (Best)

Better Auth provides lifecycle hooks that run as part of the auth flow:

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },

  // Event hooks
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Runs after user is created in DB
          await provisionOpenWebUIAccount(user);
        },
      },
    },
  },
});

async function provisionOpenWebUIAccount(user: { id: string; email: string; name: string }) {
  try {
    // Determine assigned instance (from signup form or default)
    const instanceId = await getAssignedInstance(user.id);
    const instance = await getInstance(instanceId);

    // Create user in OpenWebUI
    const response = await fetch(`${instance.apiUrl}/v1/auths/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${instance.adminApiKey}`,
      },
      body: JSON.stringify({
        email: user.email,
        name: user.name || user.email.split("@")[0],
        password: generateSecurePassword(),
        role: "user",
      }),
    });

    if (!response.ok) {
      // Log failure for retry
      await logProvisioningFailure(user.id, instanceId, await response.text());
      // Do NOT throw -- user signup should succeed even if provisioning fails
    } else {
      const owuiUser = await response.json();
      await saveUserInstanceMapping(user.id, instanceId, owuiUser.id);
    }
  } catch (error) {
    console.error("OpenWebUI provisioning failed:", error);
    await logProvisioningFailure(user.id, "unknown", String(error));
  }
}
```

#### Auth.js -- Callbacks (Partial)

Auth.js has an `events` object:

```typescript
export const { handlers, auth } = NextAuth({
  events: {
    createUser: async ({ user }) => {
      await provisionOpenWebUIAccount(user);
    },
  },
});
```

Note: the `createUser` event only fires for OAuth signups (when a new user is created via social login). For Credentials provider, there is no built-in signup flow, so there is no event. You would trigger provisioning from your custom signup API route.

#### Handling Provisioning Failures

This is critical. The signup must succeed even if OpenWebUI provisioning fails (eventual consistency).

```sql
-- Provisioning queue table
CREATE TABLE provisioning_tasks (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id),
  instance_id TEXT NOT NULL REFERENCES instances(id),
  status TEXT DEFAULT 'pending', -- pending, completed, failed, retrying
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  next_retry_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_provisioning_pending
  ON provisioning_tasks(status, next_retry_at)
  WHERE status IN ('pending', 'retrying');
```

```typescript
// lib/provisioning.ts

export async function enqueueProvisioning(
  userId: string,
  instanceId: string
): Promise<void> {
  await db.query(
    `INSERT INTO provisioning_tasks (user_id, instance_id)
     VALUES ($1, $2)`,
    [userId, instanceId]
  );
}

export async function processProvisioningQueue(): Promise<void> {
  const tasks = await db.query(
    `SELECT * FROM provisioning_tasks
     WHERE status IN ('pending', 'retrying')
     AND next_retry_at <= NOW()
     AND attempts < max_attempts
     ORDER BY created_at ASC
     LIMIT 10`,
  );

  for (const task of tasks.rows) {
    try {
      await provisionUserInOpenWebUI(task.user_id, task.instance_id);

      await db.query(
        `UPDATE provisioning_tasks
         SET status = 'completed', completed_at = NOW()
         WHERE id = $1`,
        [task.id]
      );
    } catch (error) {
      const nextRetry = new Date(
        Date.now() + Math.pow(2, task.attempts) * 60000
      ); // exponential backoff

      await db.query(
        `UPDATE provisioning_tasks
         SET status = 'retrying',
             attempts = attempts + 1,
             last_error = $1,
             next_retry_at = $2
         WHERE id = $3`,
        [String(error), nextRetry, task.id]
      );
    }
  }
}
```

You can run `processProvisioningQueue` via:
- A cron job (e.g., every minute via `node-cron`)
- A Next.js API route hit by Cloud Scheduler
- A separate worker process

---

## 6. Security Considerations

### Password Hashing

| Algorithm | Status | Performance | Security | Notes |
|-----------|--------|-------------|----------|-------|
| **Argon2id** | Recommended | Configurable | Best (memory-hard) | Winner of Password Hashing Competition. Better Auth supports via config |
| **bcrypt** | Good | Moderate | Good | Better Auth default. Battle-tested, widely used |
| **scrypt** | Good | Configurable | Good (memory-hard) | Less common in Node.js ecosystem |
| **PBKDF2** | Acceptable | Fast | Adequate | SHA-based, not memory-hard |

Recommendation: **Argon2id** if your deployment can handle the memory cost (GCP should be fine). **bcrypt** is the safe default.

```typescript
// Better Auth configuration for Argon2
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password) => {
        const argon2 = await import("argon2");
        return argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 65536,   // 64 MB
          timeCost: 3,
          parallelism: 4,
        });
      },
      verify: async ({ password, hash }) => {
        const argon2 = await import("argon2");
        return argon2.verify(hash, password);
      },
    },
  },
});
```

### CSRF Protection with Next.js App Router

- Next.js App Router Server Actions include built-in CSRF protection (origin checking)
- For API routes, CSRF protection must be added manually
- Better Auth includes CSRF protection for its auth endpoints
- For custom API routes, use the `Origin` header check:

```typescript
// lib/csrf.ts
export function validateCSRF(request: Request): boolean {
  const origin = request.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    // Add subdomain origins if needed
  ];
  return origin !== null && allowedOrigins.includes(origin);
}
```

### Secure Cookie Configuration

```typescript
// Better Auth cookie configuration
export const auth = betterAuth({
  advanced: {
    cookiePrefix: "yardie",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,          // HTTPS only
      sameSite: "lax",       // Prevents CSRF, allows top-level navigation
      path: "/",
      // For cross-subdomain: set domain to .yardie.ai
      // domain: ".yardie.ai",
    },
  },
});
```

### Rate Limiting on Auth Endpoints

```typescript
// lib/rate-limit.ts
// Simple in-memory rate limiter (use Redis for production multi-instance)

const attempts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1, resetAt: now + windowMs };
  }

  if (entry.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt };
}
```

For production, use a PostgreSQL-backed or Redis-backed rate limiter. On GCP, Cloud Armor can also provide rate limiting at the infrastructure level.

### Account Lockout Policy

```sql
-- Track failed login attempts
ALTER TABLE "user" ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE "user" ADD COLUMN locked_until TIMESTAMP;
```

```typescript
// In Better Auth hooks or custom logic
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// Better Auth provides a hook for failed sign-in attempts
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
  // Rate limiting is partially built into Better Auth
  rateLimit: {
    window: 60,    // seconds
    max: 10,       // requests per window
  },
});
```

### Email Verification Flow

Better Auth includes email verification out of the box:

```typescript
export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendVerificationEmail: async ({ user, url, token }) => {
      // Use your email service (Resend, SendGrid, AWS SES, etc.)
      await sendEmail({
        to: user.email,
        subject: "Verify your yardie.ai account",
        html: `<a href="${url}">Click here to verify your email</a>`,
      });
    },
  },
});
```

---

## 7. Cross-Subdomain Authentication

### The Challenge

yardie.ai is the portal. Users also access:
- `cornwall.yardie.ai` (OpenWebUI instance)
- `middlesex.yardie.ai` (OpenWebUI instance)
- `kingston.yardie.ai` (OpenWebUI instance)

### Approach 1: Shared Cookie Domain (Portal Only)

If you set the cookie domain to `.yardie.ai`, the auth cookie is sent to all subdomains:

```typescript
// Better Auth config
export const auth = betterAuth({
  advanced: {
    defaultCookieAttributes: {
      domain: ".yardie.ai", // Cookie visible to all *.yardie.ai
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    },
  },
});
```

**Limitation**: This only works for the yardie.ai portal routes. OpenWebUI instances are separate applications with their own auth systems. They cannot read Better Auth session cookies.

### Approach 2: SSO via OIDC (Recommended for OpenWebUI)

OpenWebUI has built-in OIDC support. The correct architecture:

```
yardie.ai portal (Better Auth sessions)
       |
       |  manages users and provisions accounts
       v
Authentik (OIDC Provider at auth.yardie.ai)
       |
       |  provides SSO for all services
       v
cornwall.yardie.ai (OpenWebUI, OIDC login via Authentik)
middlesex.yardie.ai (OpenWebUI, OIDC login via Authentik)
```

Each OpenWebUI instance is configured:
```bash
ENABLE_OAUTH_SIGNUP=true
OAUTH_PROVIDER_NAME="Yardie AI"
OAUTH_CLIENT_ID=openwebui-cornwall
OAUTH_CLIENT_SECRET=<per-instance-secret>
OPENID_PROVIDER_URL=https://auth.yardie.ai/application/o/openwebui-cornwall/.well-known/openid-configuration
OAUTH_SCOPES="openid email profile"
```

Users click "Sign in with Yardie AI" on the OpenWebUI login page, are redirected to Authentik, authenticate, and are redirected back with a token.

### Approach 3: Reverse Proxy with Auth (Alternative)

Use a reverse proxy (e.g., Traefik, Caddy, or Authentik's proxy provider) that validates auth before forwarding to OpenWebUI:

```
User -> Traefik -> Authentik forward auth -> OpenWebUI
```

Authentik supports "proxy provider" mode where it sits in front of applications and injects auth headers. OpenWebUI would receive `X-Auth-Email` and `X-Auth-Name` headers from the proxy.

However, OpenWebUI's native OIDC support is cleaner and does not require proxy-level auth injection.

### Recommendation

**Phase 1**: Separate auth. Portal uses Better Auth. OpenWebUI instances use their built-in auth. User accounts are provisioned via API.

**Phase 2**: Deploy Authentik. Configure OpenWebUI instances for OIDC login. Users have SSO across all instances. Portal may also use Authentik or keep Better Auth.

The shared cookie domain approach (`.yardie.ai`) is useful for portal-to-portal scenarios (e.g., if you add admin.yardie.ai as a separate Next.js app), but does not help with OpenWebUI integration.

---

## 8. Recommendation for yardie.ai

### Primary Recommendation: Better Auth

**Why Better Auth wins for yardie.ai:**

| Requirement | Better Auth Fit |
|-------------|----------------|
| Email/password signup | Built-in with email verification, password reset |
| Social login | 30+ providers via plugins |
| Next.js 15 App Router | First-class support, designed for it |
| PostgreSQL on GCP Cloud SQL | Native pg driver support |
| Self-hosted Docker | Embedded in your app, no extra services |
| RBAC | Admin plugin + custom scoped roles table |
| Session management | Database sessions, httpOnly cookies |
| User provisioning hooks | `databaseHooks.user.create.after` |
| TypeScript | Written in TypeScript, type-safe APIs |
| Open source | MIT license, no cost |

### Implementation Plan

#### Phase 1: Core Auth (Week 1-2)
1. Migrate database from SQLite to PostgreSQL (GCP Cloud SQL)
2. Install Better Auth (`npm install better-auth pg`)
3. Configure Better Auth with PostgreSQL
4. Build signup/login pages
5. Implement email verification (needs email service: Resend, SES, etc.)
6. Add session-based route protection via middleware
7. Build basic user profile page

#### Phase 2: RBAC + Provisioning (Week 2-3)
1. Create `instances`, `instance_roles`, `global_roles` tables
2. Build permissions helper functions
3. Implement signup provisioning hook (create OpenWebUI account)
4. Build provisioning queue with retry logic
5. Build instance management dashboard (sysadmin)
6. Build user management per instance (manager)

#### Phase 3: SSO/OIDC (When Needed)
1. Deploy Authentik on GCP (Docker)
2. Configure Authentik as OIDC provider
3. Register each OpenWebUI instance as an OIDC client in Authentik
4. Sync users from Better Auth to Authentik (or migrate auth to Authentik entirely)
5. Configure OpenWebUI instances for OIDC login

### Fallback: Auth.js v5

If Better Auth proves insufficient (unlikely but possible if a critical bug is found), Auth.js v5 is the fallback. The migration path:

1. Auth.js uses similar database tables (users, sessions, accounts)
2. Replace Better Auth API routes with NextAuth handler
3. Rewrite session access calls (different API)
4. Custom signup flow needs to be built (Auth.js Credentials provider does not handle signup)
5. RBAC and provisioning code remains the same (it is custom anyway)

Estimated migration effort from Better Auth to Auth.js: 2-3 days.

### Architecture Diagram

```
                        +-----------------+
                        |   PostgreSQL    |
                        |  (GCP Cloud SQL)|
                        +--------+--------+
                                 |
                    +------------+------------+
                    |            |            |
              +-----+----+ +----+-----+ +---+--------+
              | user     | | instance | | instance   |
              | session  | | _roles   | | provisioning|
              | account  | | global   | | _tasks     |
              | verific. | | _roles   | |            |
              +----------+ +----------+ +------------+
                    |
                    |
        +-----------+-----------+
        |                       |
+-------+--------+    +--------+-------+
| yardie.ai      |    | OpenWebUI      |
| (Next.js 15)   |    | instances      |
|                 |    |                |
| Better Auth    |    | cornwall.*     |
| Custom RBAC    |    | middlesex.*    |
| Provisioning   |    | kingston.*     |
| hooks          |    |                |
+----------------+    +--------+-------+
                               |
                      (Phase 3: OIDC via Authentik)
                               |
                      +--------+-------+
                      | Authentik      |
                      | (auth.yardie.ai)|
                      | OIDC Provider  |
                      +----------------+
```

---

## 9. Open Questions

1. **Email service**: Which email provider will be used for verification emails and password resets? Options: Resend (developer-friendly, $0 for 100/day), AWS SES (cheapest at scale), SendGrid. This is needed before auth implementation.

2. **Database migration timing**: Should the SQLite-to-PostgreSQL migration happen before or concurrently with auth implementation? Recommendation: before, since Better Auth needs PostgreSQL from day one.

3. **Instance assignment at signup**: How does a user get assigned to an OpenWebUI instance at signup? Options:
   - User selects during signup (from available instances)
   - Invite link includes instance ID
   - Admin assigns after signup
   - Geographic/default assignment

4. **OpenWebUI admin API access**: Does each OpenWebUI instance expose an admin API for user creation? What are the endpoints and authentication requirements? This needs to be verified against the deployed OpenWebUI version.

5. **Password sync vs SSO**: In Phase 1 (separate auth), do users have different passwords for yardie.ai and OpenWebUI? If yes, how do we handle this UX? The provisioning hook could generate a random password and show it once, or we could set it to match (security concern). SSO in Phase 3 eliminates this problem.

6. **Authentik deployment**: When Phase 3 is needed, should Authentik share the same PostgreSQL instance (different database) or have its own? Sharing reduces infrastructure cost; separate improves isolation.

7. **Multi-instance manager**: Can a user be a manager of multiple instances? The proposed schema supports this (one row per instance in `instance_roles`), but the UI needs to handle it.

8. **Sysadmin creation**: How is the first sysadmin account created? Options:
   - Seed script that creates the account directly in the database
   - First signup becomes sysadmin (risky)
   - Environment variable with initial admin email
   - CLI command: `npm run create-admin -- --email admin@yardie.ai`

9. **Session duration**: What should the session timeout be? Options:
   - 24 hours (standard web app)
   - 7 days with refresh (convenient)
   - 30 days (persistent login)
   - Configurable per role (shorter for sysadmin)

10. **Rate limiting infrastructure**: The in-memory rate limiter does not work with multiple Docker instances. Should we use Redis (additional infrastructure) or PostgreSQL-backed rate limiting (simpler but slower)?

---

## 10. Sources

### Official Documentation
- Better Auth: https://www.better-auth.com/docs
- Auth.js v5: https://authjs.dev
- Lucia (archived): https://lucia-auth.com
- Supabase Auth: https://supabase.com/docs/guides/auth
- Ory Kratos: https://www.ory.sh/docs/kratos
- Ory Keto: https://www.ory.sh/docs/keto
- Clerk: https://clerk.com/docs
- Auth0: https://auth0.com/docs
- WorkOS: https://workos.com/docs
- Kinde: https://kinde.com/docs
- Authentik: https://docs.goauthentik.io
- Keycloak: https://www.keycloak.org/documentation
- OpenWebUI OAuth docs: https://docs.openwebui.com/getting-started/env-configuration#oauth

### GitHub Repositories
- Better Auth: https://github.com/better-auth/better-auth
- Auth.js: https://github.com/nextauthjs/next-auth
- Lucia: https://github.com/lucia-auth/lucia
- Supabase: https://github.com/supabase/supabase
- Ory Kratos: https://github.com/ory/kratos
- Ory Keto: https://github.com/ory/keto
- Authentik: https://github.com/goauthentik/authentik
- Keycloak: https://github.com/keycloak/keycloak
- node-oidc-provider: https://github.com/panva/node-oidc-provider

### Community References
- "State of Auth in Next.js 2025" discussions on r/nextjs
- Better Auth vs Auth.js comparison threads on HackerNews
- Lucia deprecation announcement: https://github.com/lucia-auth/lucia/discussions/1714
- OpenWebUI OIDC configuration examples from community
- Google Zanzibar paper (Keto's inspiration): https://research.google/pubs/pub48190/

### Architecture References
- NIST Digital Identity Guidelines (SP 800-63B): Password and session security
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
