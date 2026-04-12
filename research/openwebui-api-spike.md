# OpenWebUI API & Customization Research Spike

**Date**: 2026-04-08
**Purpose**: Inform architectural decisions for yardie.ai multi-tenant OpenWebUI hosting platform
**Scope**: OpenWebUI REST API, LLM request flow, configuration, database, deployment, user attribution

---

## Key Findings Summary

1. **OpenWebUI has a comprehensive REST API** built on FastAPI (Python). Every frontend action maps to a REST endpoint. User CRUD, model management, chat history, and admin operations are all available via HTTP. The API is auto-documented via Swagger/OpenAPI at `/docs`.

2. **Authentication is JWT-based** with support for API keys. Admin accounts can create users programmatically. API keys can be generated per-user and used as Bearer tokens.

3. **User attribution in proxied LLM requests is solvable** via multiple mechanisms: OpenWebUI Pipelines (filter functions that can inject custom headers), the `WEBUI_SESSION_COOKIE_SAME_SITE` and custom header configurations, and per-user API keys stored in OpenWebUI that get forwarded to backends.

4. **OpenWebUI supports external auth** via OAuth2/OIDC (Google, Microsoft, GitHub, generic OIDC). Self-registration can be disabled. All account provisioning can be done via the admin API.

5. **The database layer supports both SQLite and PostgreSQL**. The `DATABASE_URL` environment variable controls which backend is used. For multi-tenant at scale, PostgreSQL is the path.

6. **Pipelines is the primary extension mechanism** for intercepting and modifying LLM requests. A Pipeline can inspect the user context (user ID, email, role) and inject custom headers, modify payloads, enforce rate limits, and route to different backends.

7. **Model access can be restricted per-user** through model filtering and workspace model assignments. Admin users control which models are visible to regular users.

8. **Multi-instance deployment** is well-supported via Docker. Each instance is a single container (~500MB image, ~256MB-1GB RAM). Kubernetes Helm charts exist for orchestrated deployments.

---

## 1. OpenWebUI REST API

### 1.1 Architecture Overview

OpenWebUI is built with:
- **Backend**: Python 3.11+ / FastAPI / Pydantic / SQLAlchemy (async)
- **Frontend**: SvelteKit
- **Database**: SQLite (default) or PostgreSQL
- **Auth**: JWT tokens + API keys

The FastAPI backend exposes a rich REST API. Every operation the UI performs goes through these endpoints. The Swagger docs are available at `http://<host>:<port>/docs` when running.

**Source**: `https://github.com/open-webui/open-webui` -- the backend code lives in `backend/open_webui/`

### 1.2 API Authentication

OpenWebUI uses two authentication mechanisms:

#### JWT Tokens (Session-based)
```bash
# Sign in and get JWT token
curl -X POST http://localhost:3000/api/v1/auths/signin \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "Bearer",
#   "id": "user-uuid",
#   "email": "admin@example.com",
#   "name": "Admin",
#   "role": "admin",
#   "profile_image_url": "..."
# }
```

The JWT secret is configured via the `WEBUI_SECRET_KEY` environment variable. Tokens are signed with HS256 by default.

#### API Keys (Persistent)
Users (and admins) can generate API keys through the UI or API. These function as Bearer tokens:

```bash
# Use API key for authentication
curl http://localhost:3000/api/v1/chats \
  -H "Authorization: Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

API keys are stored hashed in the database and are tied to a specific user account. They carry the same permissions as the user who created them.

**Key env var**: `ENABLE_API_KEY=true` (defaults to true in recent versions) enables the API key feature.

### 1.3 User Management API (CRUD)

#### Create User (Admin only)
```bash
# POST /api/v1/auths/add
curl -X POST http://localhost:3000/api/v1/auths/add \
  -H "Authorization: Bearer <admin_jwt_or_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "securepassword",
    "name": "New User",
    "role": "user"
  }'

# Response:
# {
#   "id": "generated-uuid",
#   "email": "newuser@example.com",
#   "name": "New User",
#   "role": "user",
#   "profile_image_url": "/user.png",
#   "created_at": 1700000000
# }
```

Valid roles: `"admin"`, `"user"`, `"pending"`

#### List Users (Admin only)
```bash
# GET /api/v1/users/
curl http://localhost:3000/api/v1/users/ \
  -H "Authorization: Bearer <admin_token>"

# Returns array of user objects with id, email, name, role, last_active_at, etc.
```

#### Get User by ID (Admin only)
```bash
# GET /api/v1/users/{user_id}
curl http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer <admin_token>"
```

#### Update User Role (Admin only)
```bash
# POST /api/v1/users/update/role
curl -X POST http://localhost:3000/api/v1/users/update/role \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user-uuid",
    "role": "admin"
  }'
```

#### Delete User (Admin only)
```bash
# DELETE /api/v1/users/{user_id}
curl -X DELETE http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer <admin_token>"
```

#### User Self-Management
```bash
# GET /api/v1/users/me -- get current user info (any authenticated user)
# POST /api/v1/users/me/update -- update own profile
# POST /api/v1/users/me/api-key -- generate API key
# DELETE /api/v1/users/me/api-key -- delete API key
```

### 1.4 Admin vs User API Distinction

The API does distinguish between admin and regular user endpoints:

| Category | Admin Endpoints | User Endpoints |
|----------|----------------|----------------|
| **Users** | `/api/v1/users/` (list all), `/api/v1/auths/add`, `/api/v1/users/{id}` (get/delete), role update | `/api/v1/users/me` (self only) |
| **Models** | Configure connections, add models, set model visibility | View allowed models only |
| **Config** | `/api/v1/configs/` (all settings), SMTP, auth settings | None |
| **Chats** | `/api/v1/chats/all` (all users' chats), `/api/v1/chats/all/db` (export) | `/api/v1/chats/` (own chats only) |
| **Functions** | Create/edit/delete functions and tools | Use assigned functions only |

Authorization is enforced in FastAPI route handlers via dependency injection -- the `get_admin_user` dependency raises 403 for non-admin users.

### 1.5 Model Management API

```bash
# List models available to the user
# GET /api/v1/models/
curl http://localhost:3000/api/v1/models/ \
  -H "Authorization: Bearer <token>"

# Admin: Create/configure a model connection
# POST /api/v1/models/add
curl -X POST http://localhost:3000/api/v1/models/add \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "my-model",
    "name": "My Custom Model",
    "meta": {
      "description": "Custom model configuration",
      "capabilities": {"vision": false}
    },
    "params": {
      "temperature": 0.7
    },
    "base_model_id": "gpt-4"
  }'

# Admin: Update model
# POST /api/v1/models/update
# Admin: Delete model
# DELETE /api/v1/models/delete
```

### 1.6 Chat & Conversation API

```bash
# List user's chats
# GET /api/v1/chats/
# GET /api/v1/chats/?page=1  (paginated)

# Get specific chat
# GET /api/v1/chats/{chat_id}

# Create new chat
# POST /api/v1/chats/new

# Delete chat
# DELETE /api/v1/chats/{chat_id}

# Share chat
# POST /api/v1/chats/{chat_id}/share

# Admin: list all chats across all users
# GET /api/v1/chats/all
```

### 1.7 Configuration API (Admin only)

```bash
# Get all configuration
# GET /api/v1/configs/

# Update configuration
# POST /api/v1/configs/update

# Specific config sections:
# GET /api/v1/configs/default/models  -- default model settings
# GET /api/v1/configs/default/suggestions  -- default suggestions
# POST /api/v1/configs/default/models  -- update default model settings
```

### 1.8 OpenAI-Compatible API

OpenWebUI also exposes an OpenAI-compatible API at `/api/` and `/ollama/` that allows it to be used as an API provider itself:

```bash
# OpenAI-compatible chat completions (uses the user's auth)
curl http://localhost:3000/api/chat/completions \
  -H "Authorization: Bearer <user_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

This is significant for yardie.ai because it means OpenWebUI itself can act as an OpenAI-compatible proxy.

### 1.9 API Documentation Sources

| Source | URL | Notes |
|--------|-----|-------|
| Swagger/OpenAPI (self-hosted) | `http://<instance>/docs` | Auto-generated, most complete |
| GitHub Source | `https://github.com/open-webui/open-webui/tree/main/backend/open_webui/routers` | Definitive source of truth |
| Official Docs | `https://docs.openwebui.com` | High-level, not exhaustive on API |
| Community Wiki | `https://github.com/open-webui/open-webui/wiki` | Community-maintained |
| OpenAPI Schema | `http://<instance>/openapi.json` | Machine-readable schema |

---

## 2. How OpenWebUI Sends LLM Requests

### 2.1 Request Flow Architecture

When a user sends a chat message, OpenWebUI follows this flow:

```
User Browser (Svelte Frontend)
    |
    v
POST /api/chat/completions  (OpenWebUI backend)
    |
    v
[Pipeline Filter Functions - inlet]  (if configured)
    |
    v
[Function Calling / Tool execution]  (if tools enabled)
    |
    v
Backend Connection Manager
    |-- OpenAI-compatible API (OPENAI_API_BASE_URLS)
    |-- Ollama API (OLLAMA_BASE_URLS)
    |-- Other providers
    |
    v
LLM Provider Response (streaming or non-streaming)
    |
    v
[Pipeline Filter Functions - outlet]  (if configured)
    |
    v
Response back to frontend (SSE stream or JSON)
```

### 2.2 Request Construction

The backend constructs LLM requests in `backend/open_webui/routers/openai.py` and `backend/open_webui/routers/ollama.py`. For OpenAI-compatible backends:

```python
# Simplified from the source code
# The request payload sent to the LLM backend:
payload = {
    "model": model_id,
    "messages": messages,  # conversation history
    "stream": True,  # usually streaming
    "temperature": params.get("temperature", 0.7),
    # ... other model parameters
}

# Headers sent to the LLM backend:
headers = {
    "Authorization": f"Bearer {api_key}",  # the backend API key
    "Content-Type": "application/json",
}
```

### 2.3 Headers Sent to LLM Backend

By default, OpenWebUI sends these headers to the LLM backend:

| Header | Value | Notes |
|--------|-------|-------|
| `Authorization` | `Bearer <api_key>` | The configured API key for that connection |
| `Content-Type` | `application/json` | Standard |
| `HTTP-Referer` | (optional) | Some backends |
| `X-Title` | (optional) | Some backends |

**Critical finding for yardie.ai**: By default, OpenWebUI does NOT forward the end-user's identity to the LLM backend. The `Authorization` header contains the shared backend API key, not the user's credentials.

### 2.4 Custom Headers via Configuration

OpenWebUI supports configuring custom headers per OpenAI connection since approximately v0.3.x:

**Environment Variables**:
```bash
# Multiple OpenAI-compatible connections can be configured
OPENAI_API_BASE_URLS="https://proxy.yardie.ai/v1;https://api.openai.com/v1"
OPENAI_API_KEYS="sk-proxy-key;sk-real-key"
```

However, there is no direct env var for adding arbitrary custom headers to outgoing requests. This is where **Pipelines** become essential.

### 2.5 API Base URL Configuration

Each OpenAI-compatible connection has:
- A base URL (e.g., `https://api.openai.com/v1`)
- An API key
- Optionally, per-model overrides

These can be configured via:
1. **Environment variables** at startup (`OPENAI_API_BASE_URLS`, `OPENAI_API_KEYS`)
2. **Admin Settings UI** at runtime (Settings > Connections)
3. **Admin API** (`/api/v1/configs/`)

For yardie.ai, each instance would set its `OPENAI_API_BASE_URLS` to point to the yardie.ai proxy.

### 2.6 Per-User API Keys

OpenWebUI does NOT support per-user backend API keys out of the box in a way that automatically forwards them. The API keys configured in "Connections" are instance-wide (shared across all users of that instance).

However, users can configure their own API keys in Settings if the admin enables it. When a user configures a personal API key, OpenWebUI uses that key instead of the shared one for that user's requests.

**Relevant env var**: `ENABLE_OPENAI_API` controls whether users can see/modify OpenAI connections.

### 2.7 Streaming Architecture

OpenWebUI uses Server-Sent Events (SSE) for streaming:

```
Frontend <--SSE-- OpenWebUI Backend <--SSE-- LLM Provider
```

The backend proxies the stream, processing each chunk to:
1. Track token usage
2. Store the conversation
3. Execute outlet pipeline functions
4. Forward to the client

For non-streaming, it waits for the complete response, processes it, then returns.

---

## 3. OpenWebUI Configuration & Customization

### 3.1 Key Environment Variables

```bash
# === Authentication ===
WEBUI_SECRET_KEY="your-secret-key"      # JWT signing key (CRITICAL - set per instance)
ENABLE_SIGNUP=false                      # Disable self-registration
ENABLE_LOGIN_FORM=true                   # Show/hide login form
DEFAULT_USER_ROLE="pending"              # New users get "pending" role (requires admin approval)
ENABLE_API_KEY=true                      # Allow API key generation
WEBUI_AUTH=true                          # Enable authentication (default true)

# === OAuth/OIDC ===
ENABLE_OAUTH_SIGNUP=true                 # Allow signup via OAuth
OAUTH_PROVIDER_NAME="yardie.ai"         # Custom OAuth provider name
OAUTH_CLIENT_ID="your-client-id"
OAUTH_CLIENT_SECRET="your-client-secret"
OPENID_PROVIDER_URL="https://auth.yardie.ai/.well-known/openid-configuration"
OAUTH_SCOPES="openid email profile"
OAUTH_MERGE_ACCOUNTS_BY_EMAIL=true       # Merge OAuth and local accounts

# === LLM Connections ===
OPENAI_API_BASE_URLS="https://proxy.yardie.ai/v1"
OPENAI_API_KEYS="sk-instance-key"
OLLAMA_BASE_URLS=""                      # Leave empty to disable Ollama
ENABLE_OPENAI_API=true

# === Database ===
DATABASE_URL="postgresql://user:pass@host:5432/openwebui"  # Use Postgres
# If not set, defaults to SQLite at /app/backend/data/webui.db

# === General ===
WEBUI_URL="https://cornwall.yardie.ai"  # External URL of the instance
WEBUI_NAME="Cornwall AI"                 # Custom instance name
ENV="prod"                               # "dev" enables debug features
PORT=8080                                # Internal port (default 8080)
DATA_DIR="/app/backend/data"             # Data directory path
ENABLE_ADMIN_EXPORT=true                 # Allow admin data export
ENABLE_COMMUNITY_SHARING=false           # Disable sharing to openwebui.com

# === Pipelines ===
ENABLE_PIPELINES=true
PIPELINES_URLS="http://pipelines:9099"   # URL(s) of Pipeline servers

# === Model Filtering ===
ENABLE_MODEL_FILTER=true                 # Restrict available models
MODEL_FILTER_LIST="gpt-4;gpt-3.5-turbo" # Semicolon-separated allowed models

# === Rate Limiting ===
ENABLE_MESSAGE_RATING=true
# No built-in per-user token budget -- must be implemented via Pipelines

# === Security ===
CORS_ALLOW_ORIGINS="*"                   # CORS configuration
WEBUI_SESSION_COOKIE_SAME_SITE="lax"
WEBUI_SESSION_COOKIE_SECURE=true
```

### 3.2 External Authentication (OAuth2/OIDC)

OpenWebUI supports these OAuth/OIDC providers:

| Provider | Config | Notes |
|----------|--------|-------|
| **Generic OIDC** | `OPENID_PROVIDER_URL` | Any OIDC-compliant provider (Keycloak, Auth0, etc.) |
| **Google** | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth2 |
| **Microsoft** | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Azure AD / Entra |
| **GitHub** | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| **Custom OAuth2** | `OAUTH_CLIENT_ID`, etc. | Generic OAuth2 flow |

**For yardie.ai**: The recommended approach is to use a central identity provider (Keycloak, Auth0, or custom) and configure each OpenWebUI instance to authenticate against it via OIDC. This way:
- Users sign up at yardie.ai (your platform)
- Your platform provisions their account in the identity provider
- OpenWebUI instances authenticate against the identity provider
- SSO across the platform

Relevant environment variables for OIDC:
```bash
ENABLE_OAUTH_SIGNUP=true
OPENID_PROVIDER_URL="https://auth.yardie.ai/realms/yardie/.well-known/openid-configuration"
OAUTH_CLIENT_ID="cornwall-openwebui"
OAUTH_CLIENT_SECRET="secret"
OAUTH_SCOPES="openid email profile"
OAUTH_MERGE_ACCOUNTS_BY_EMAIL=true
ENABLE_LOGIN_FORM=false  # Hide local login, force OAuth
```

### 3.3 Role & Permission System

OpenWebUI has three roles:

| Role | Capabilities |
|------|-------------|
| **admin** | Full access: manage users, models, connections, settings, all chats, functions, tools. First user created automatically becomes admin. |
| **user** | Chat with allowed models, manage own chats, use assigned tools/functions, generate own API keys. Cannot access admin settings. |
| **pending** | Cannot do anything until an admin approves (changes role to "user"). Sees a "pending approval" message. |

Setting `DEFAULT_USER_ROLE=pending` combined with `ENABLE_SIGNUP=false` means only admin-provisioned accounts can access the system.

**Model access control** (as of v0.3+):
- Admin can set which models are visible to users (model filtering)
- Workspace models can be created with specific user access lists
- `ENABLE_MODEL_FILTER=true` + `MODEL_FILTER_LIST` restricts globally

### 3.4 Disabling Self-Registration

```bash
ENABLE_SIGNUP=false            # No registration form
ENABLE_LOGIN_FORM=true         # Keep login form (for admin-created accounts)
# OR
ENABLE_LOGIN_FORM=false        # Force OAuth only
ENABLE_OAUTH_SIGNUP=true       # Auto-create on first OAuth login
```

With `ENABLE_SIGNUP=false`, the only ways to create users are:
1. Admin API (`POST /api/v1/auths/add`)
2. Admin UI (Settings > Users > Add User)
3. OAuth/OIDC auto-provisioning (if `ENABLE_OAUTH_SIGNUP=true`)

### 3.5 Functions, Tools, and MCP

OpenWebUI has three extension mechanisms:

#### Functions (Server-side)
Functions are Python code that runs within the OpenWebUI backend process. Three types:

1. **Filter Functions**: Intercept and modify messages in transit (inlet/outlet pattern)
2. **Action Functions**: Add buttons to the chat UI that trigger custom actions
3. **Pipe Functions**: Create entirely custom model endpoints (the message is routed to the function instead of an LLM)

```python
# Example Filter Function -- injects user context into system prompt
class Filter:
    class Valves(BaseModel):
        priority: int = 0

    def inlet(self, body: dict, __user__: dict) -> dict:
        """Modify the request before it reaches the LLM"""
        # __user__ contains: id, email, name, role
        user_context = f"User: {__user__['name']} ({__user__['email']})"
        # Inject into system message
        if body.get("messages") and body["messages"][0]["role"] == "system":
            body["messages"][0]["content"] += f"\
\
{user_context}"
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        """Modify the response before it reaches the user"""
        return body
```

#### Tools
Tools are function-calling capabilities that the LLM can invoke:

```python
# Example Tool -- the LLM can call this during a conversation
class Tools:
    def __init__(self):
        pass

    def get_weather(self, city: str) -> str:
        """Get the current weather for a city"""
        # Implementation
        return f"Weather in {city}: Sunny, 25C"
```

#### MCP (Model Context Protocol) Support
As of early 2025, OpenWebUI added experimental MCP support. MCPs are configured per-instance in the admin settings and provide tools/resources to the LLM.

**For multi-tenant yardie.ai**: Each instance can have its own set of MCPs, tools, and functions. Functions are stored in the database (per-instance if each instance has its own DB). MCP servers can be configured per-instance via admin settings.

---

## 4. OpenWebUI Database & Data Model

### 4.1 Database Options

| Option | Config | Use Case |
|--------|--------|----------|
| **SQLite** (default) | No config needed, file at `DATA_DIR/webui.db` | Single instance, dev/small deployments |
| **PostgreSQL** | `DATABASE_URL=postgresql://user:pass@host:5432/dbname` | Production, multi-instance, scalable |

OpenWebUI uses **SQLAlchemy** with **Peewee** ORM (note: the codebase has been migrating from Peewee to SQLAlchemy; both are present). Alembic handles schema migrations.

### 4.2 Key Database Tables/Models

Based on the source code in `backend/open_webui/models/`:

| Table | Key Fields | Description |
|-------|-----------|-------------|
| **auth** | `id`, `email`, `password`, `active` | Authentication credentials |
| **user** | `id`, `name`, `email`, `role`, `profile_image_url`, `last_active_at`, `settings`, `info`, `api_key`, `created_at`, `updated_at` | User profiles and settings |
| **chat** | `id`, `user_id`, `title`, `chat` (JSON), `share_id`, `archived`, `pinned`, `created_at`, `updated_at` | Conversations (full history stored as JSON) |
| **model** | `id`, `user_id`, `base_model_id`, `name`, `meta` (JSON), `params` (JSON), `created_at`, `updated_at` | Custom model configurations |
| **function** | `id`, `user_id`, `name`, `type`, `content`, `meta` (JSON), `is_active`, `is_global`, `created_at`, `updated_at` | Functions/Tools/Filters |
| **tool** | `id`, `user_id`, `name`, `content`, `meta` (JSON), `created_at`, `updated_at` | Tool definitions |
| **memory** | `id`, `user_id`, `content`, `created_at`, `updated_at` | User memory/context storage |
| **file** | `id`, `user_id`, `filename`, `path`, `meta` (JSON), `created_at` | Uploaded files |
| **config** | `id`, `data` (JSON), `version`, `created_at`, `updated_at` | System configuration (stored in DB, merged with env vars) |
| **tag** | `id`, `name`, `user_id`, `data` | Chat tags/folders |
| **document** | `collection_name`, `name`, `title`, `filename`, `content`, `user_id` | RAG document metadata |

### 4.3 Chat Data Structure

Chat messages are stored as a JSON blob in the `chat` column of the `chat` table. Structure:

```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "Hello, how are you?",
      "timestamp": 1700000000
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "I'm doing well! How can I help?",
      "model": "gpt-4",
      "timestamp": 1700000001,
      "info": {
        "total_duration": 1500,
        "prompt_eval_count": 15,
        "eval_count": 25
      }
    }
  ],
  "models": ["gpt-4"],
  "options": {},
  "history": {
    "messages": {},
    "currentId": "msg-uuid-2"
  }
}
```

### 4.4 Usage Tracking

OpenWebUI does NOT have a built-in token usage tracking/budgeting system as of early 2025. What exists:

- **Per-message metadata**: Some backends return token counts in `info.prompt_eval_count` and `info.eval_count`, which get stored in the chat JSON.
- **Chat history API**: Admin can query all chats across users via `/api/v1/chats/all`.
- **No aggregate usage dashboard**: There is no built-in "User X used Y tokens this month" view.

**For yardie.ai**: Token tracking must be implemented at the proxy layer. Since all LLM requests pass through your proxy, you can:
1. Count tokens in requests and responses
2. Associate them with user/instance via injected headers
3. Store usage data in your own database
4. Enforce budgets by rejecting requests that exceed limits

### 4.5 Querying Usage Data

Via the API:
```bash
# Admin: Get all chats (paginated)
GET /api/v1/chats/all?page=1&limit=50

# Admin: Get chats for a specific user
GET /api/v1/chats/all?user_id=<user-uuid>

# Admin: Export all chats (database dump)
GET /api/v1/chats/all/db
```

Via direct database queries (if you have access):
```sql
-- Count conversations per user
SELECT u.email, COUNT(c.id) as chat_count
FROM "user" u
LEFT JOIN chat c ON u.id = c.user_id
GROUP BY u.email
ORDER BY chat_count DESC;

-- Token usage would require parsing the JSON chat data
-- (complex, better to track at the proxy layer)
```

---

## 5. Multi-Instance Deployment Patterns

### 5.1 Docker Deployment (Standard)

Single instance:
```yaml
# docker-compose.yml
version: '3.8'
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    volumes:
      - open-webui-data:/app/backend/data
    environment:
      - WEBUI_SECRET_KEY=unique-per-instance
      - OPENAI_API_BASE_URLS=https://proxy.yardie.ai/v1
      - OPENAI_API_KEYS=sk-instance-cornwall-key
      - ENABLE_SIGNUP=false
      - DATABASE_URL=postgresql://user:pass@postgres:5432/cornwall_openwebui
    restart: unless-stopped

volumes:
  open-webui-data:
```

### 5.2 Resource Requirements Per Instance

| Resource | Minimum | Recommended | Notes |
|----------|---------|-------------|-------|
| **RAM** | 256 MB | 512 MB - 1 GB | Depends on concurrent users, RAG usage |
| **CPU** | 0.25 cores | 0.5 - 1 core | Mostly I/O bound (proxying LLM requests) |
| **Disk** | 1 GB | 5-10 GB | For uploaded files, RAG documents |
| **Image size** | ~1.5 GB (pulled) | - | Based on the official Docker image |

### 5.3 Multi-Tenant Architecture Options

#### Option A: Instance-Per-Tenant (Isolated)
```
cornwall.yardie.ai  --> OpenWebUI Container (Cornwall)  --> Postgres DB: cornwall_db
middlesex.yardie.ai --> OpenWebUI Container (Middlesex) --> Postgres DB: middlesex_db
```

**Pros**: Complete isolation, independent upgrades, no data leakage risk
**Cons**: Higher resource usage, more containers to manage, O(n) operational complexity

#### Option B: Shared Instance, Logical Isolation
```
*.yardie.ai --> Single OpenWebUI Instance --> Shared Postgres DB
```

**Pros**: Lower resource usage, simpler management
**Cons**: No tenant isolation, a bug/crash affects everyone, harder to customize per-tenant, OpenWebUI has no native multi-tenancy support

#### Option C: Instance-Per-Tenant with Shared Database Server (Recommended for yardie.ai)
```
cornwall.yardie.ai  --> OpenWebUI Container (Cornwall)  --|
middlesex.yardie.ai --> OpenWebUI Container (Middlesex) --|-- Shared Postgres Server
                                                          |   (separate databases)
```

**Pros**: Isolation at app level, shared DB infrastructure (connection pooling, backups), each instance independently configurable
**Cons**: Still one container per tenant, but Kubernetes makes this manageable

### 5.4 Kubernetes Deployment

OpenWebUI provides a Helm chart:

```bash
helm repo add open-webui https://helm.openwebui.com
helm repo update

# Install a tenant instance
helm install cornwall-openwebui open-webui/open-webui \
  --namespace cornwall \
  --set env.WEBUI_SECRET_KEY="cornwall-secret" \
  --set env.OPENAI_API_BASE_URLS="https://proxy.yardie.ai/v1" \
  --set env.OPENAI_API_KEYS="sk-cornwall-key" \
  --set env.DATABASE_URL="postgresql://user:pass@postgres:5432/cornwall" \
  --set env.ENABLE_SIGNUP="false" \
  --set ingress.enabled=true \
  --set ingress.host="cornwall.yardie.ai"
```

### 5.5 Instance Provisioning Flow

For yardie.ai, the provisioning flow would be:

```
1. New tenant signs up at yardie.ai
2. Platform backend:
   a. Creates Postgres database for tenant
   b. Deploys OpenWebUI container/pod with tenant-specific config
   c. Configures Ingress/reverse proxy for tenant subdomain
   d. Waits for OpenWebUI to initialize (first admin user auto-created)
   e. Uses admin API to configure the instance
   f. Creates user accounts via admin API
3. Tenant users access cornwall.yardie.ai
```

---

## 6. User Attribution in Proxied Requests (CRITICAL)

This is the core technical challenge for yardie.ai: when an LLM request arrives at the proxy, how do you know which user initiated it?

### 6.1 The Problem

```
User "alice@cornwall.yardie.ai"
    |
    v
OpenWebUI (cornwall instance)
    |
    v  POST /v1/chat/completions
    |  Authorization: Bearer sk-cornwall-shared-key
    |  (NO user identity in the request)
    |
    v
yardie.ai proxy
    |
    Q: Who is "alice"? How do I attribute this request?
```

### 6.2 Solution 1: OpenWebUI Pipelines (RECOMMENDED)

Pipelines are the most robust solution. A **Filter Function** (deployed as a Pipeline) can intercept every request and inject custom headers.

#### How Pipelines Work

Pipelines run as a separate service (Python/FastAPI) that OpenWebUI connects to:

```yaml
# docker-compose.yml
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    environment:
      - PIPELINES_URLS=http://pipelines:9099
    # ...

  pipelines:
    image: ghcr.io/open-webui/pipelines:main
    ports:
      - "9099:9099"
    volumes:
      - ./pipelines:/app/pipelines  # Mount custom pipelines
```

#### Filter Pipeline for User Attribution

```python
"""
filename: user_attribution_filter.py
Deploy to the pipelines service's /app/pipelines/ directory
"""
from pydantic import BaseModel
from typing import Optional
import json
import httpx


class Pipeline:
    """
    Filter pipeline that injects user identity into outgoing LLM requests.
    This runs BEFORE the request is sent to the LLM backend.
    """

    class Valves(BaseModel):
        """Configuration for this pipeline"""
        pipelines: list[str] = ["*"]  # Apply to all models
        priority: int = 0  # Run first
        proxy_base_url: str = "https://proxy.yardie.ai/v1"
        instance_id: str = ""  # Set per-instance

    def __init__(self):
        self.name = "User Attribution Filter"
        self.valves = self.Valves()

    async def inlet(self, body: dict, __user__: dict) -> dict:
        """
        Intercept the request before it reaches the LLM backend.

        __user__ dict contains:
        {
            "id": "user-uuid",
            "email": "alice@example.com",
            "name": "Alice",
            "role": "user",  # or "admin"
        }
        """
        # Inject user metadata into the request body
        # These will be available in the proxy if we use a custom endpoint
        body["user"] = {
            "id": __user__["id"],
            "email": __user__["email"],
            "name": __user__["name"],
            "role": __user__["role"],
        }

        # Add instance identifier
        body["instance_id"] = self.valves.instance_id

        # Alternative: Use metadata field (OpenAI API supports this)
        if "metadata" not in body:
            body["metadata"] = {}
        body["metadata"]["user_id"] = __user__["id"]
        body["metadata"]["user_email"] = __user__["email"]
        body["metadata"]["instance_id"] = self.valves.instance_id

        return body

    async def outlet(self, body: dict, __user__: dict) -> dict:
        """
        Intercept the response before it reaches the user.
        Can be used for logging, usage tracking, etc.
        """
        # Log usage (body contains the full response including token counts)
        return body
```

**How the proxy reads this**: The `metadata` and `user` fields are included in the JSON body sent to the proxy. Your proxy can extract them before forwarding to the actual LLM provider:

```python
# In your yardie.ai proxy (pseudocode)
@app.post("/v1/chat/completions")
async def proxy_chat(request: Request):
    body = await request.json()

    # Extract user attribution from Pipeline-injected data
    user_id = body.get("metadata", {}).get("user_id")
    user_email = body.get("metadata", {}).get("user_email")
    instance_id = body.get("metadata", {}).get("instance_id")

    # Log the request
    log_usage(user_id=user_id, instance_id=instance_id, model=body["model"])

    # Check budget
    if exceeds_budget(user_id):
        return JSONResponse(status_code=429, content={"error": "Token budget exceeded"})

    # Strip custom fields before forwarding to actual LLM
    body.pop("user", None)
    body.pop("instance_id", None)
    body.pop("metadata", None)

    # Forward to actual LLM provider
    response = await forward_to_llm(body)
    return response
```

### 6.3 Solution 2: Built-in Functions (Alternative to Pipelines)

Instead of running a separate Pipelines service, you can deploy Filter Functions directly within OpenWebUI:

```python
"""
Deploy via: Admin Panel > Workspace > Functions > Add Function
Type: Filter
"""
class Filter:
    class Valves(BaseModel):
        priority: int = 0
        instance_id: str = "cornwall"

    def inlet(self, body: dict, __user__: dict) -> dict:
        """Runs before LLM request"""
        if "metadata" not in body:
            body["metadata"] = {}
        body["metadata"]["user_id"] = __user__["id"]
        body["metadata"]["user_email"] = __user__["email"]
        body["metadata"]["instance_id"] = self.valves.instance_id
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        """Runs after LLM response"""
        return body
```

This is simpler to deploy (no separate container) but means the function code lives in the OpenWebUI database. For multi-tenant, you would need to deploy this function to every instance.

### 6.4 Solution 3: Per-Instance API Keys

A simpler (but less granular) approach:

```
Cornwall instance: OPENAI_API_KEYS=sk-cornwall-xxxx
Middlesex instance: OPENAI_API_KEYS=sk-middlesex-xxxx
```

Your proxy maps the API key to the instance:

```python
# Proxy side
INSTANCE_MAP = {
    "sk-cornwall-xxxx": "cornwall",
    "sk-middlesex-xxxx": "middlesex",
}

@app.post("/v1/chat/completions")
async def proxy_chat(request: Request):
    auth_header = request.headers.get("Authorization", "")
    api_key = auth_header.replace("Bearer ", "")
    instance_id = INSTANCE_MAP.get(api_key, "unknown")
    # ...
```

**Limitation**: This identifies the instance but NOT the individual user. You would still need Pipelines for per-user attribution.

### 6.5 Solution 4: Per-User API Keys via OpenWebUI User Settings

If users configure their own OpenAI-compatible API keys in their OpenWebUI settings, those keys are used for their requests instead of the shared instance key. You could:

1. When provisioning a user, generate a unique proxy API key
2. Configure it in the user's OpenWebUI settings via API
3. Your proxy maps this key to the user

This is complex and fragile. Pipelines are the better solution.

### 6.6 Solution 5: OpenWebUI as OpenAI-Compatible Proxy

OpenWebUI itself exposes an OpenAI-compatible API. If users interact with OpenWebUI through its API (not just the UI), their API key identifies them:

```bash
# User "alice" has API key "sk-alice-key"
curl https://cornwall.yardie.ai/api/chat/completions \
  -H "Authorization: Bearer sk-alice-key" \
  -d '{"model": "gpt-4", "messages": [...]}'
```

OpenWebUI resolves `sk-alice-key` to Alice's account, then sends the request to the backend. If combined with a Pipeline, Alice's identity gets injected into the outgoing request to your proxy.

### 6.7 Recommendation for yardie.ai

**Use Pipelines (Solution 1) combined with Per-Instance API Keys (Solution 3)**:

1. Each instance has a unique API key for the proxy (identifies the instance/tenant)
2. A Pipeline Filter Function injects user identity into the request body's `metadata` field
3. The proxy extracts both instance and user identity
4. The proxy handles usage tracking, budget enforcement, and routing

This gives you:
- **Instance-level identification** via API key (simple, reliable)
- **User-level identification** via Pipeline-injected metadata (granular)
- **Budget enforcement** at the proxy layer
- **Usage tracking** at the proxy layer

---

## 7. OpenWebUI Pipelines Deep Dive

### 7.1 Pipeline Types

| Type | Purpose | When It Runs |
|------|---------|--------------|
| **Filter** | Modify requests/responses | Before LLM (inlet) and after LLM (outlet) |
| **Pipe** | Custom model endpoint | Instead of an LLM -- the pipeline IS the model |
| **Manifold** | Multiple custom models | Like Pipe, but exposes multiple model endpoints |

### 7.2 Pipeline Architecture

```
OpenWebUI Backend
    |
    |--> Discovers pipelines at startup (GET /pipelines)
    |--> For filter pipelines: calls inlet() before LLM, outlet() after LLM
    |--> For pipe pipelines: calls pipe() instead of LLM
    |
Pipelines Service (separate FastAPI process)
    |
    |--> Loads Python files from /app/pipelines/
    |--> Exposes them as API endpoints
    |--> Shares user context (__user__ dict) from OpenWebUI
```

### 7.3 The __user__ Context Object

Every pipeline function receives a `__user__` dict containing:

```python
{
    "id": "550e8400-e29b-41d4-a716-446655440000",  # UUID
    "email": "alice@cornwall.yardie.ai",
    "name": "Alice Johnson",
    "role": "user",  # "admin" | "user" | "pending"
}
```

This is the key to user attribution -- the Pipeline has full access to the authenticated user's identity.

### 7.4 Pipeline Deployment for Multi-Tenant

Two approaches:

**Approach A: Shared Pipelines Service**
One Pipelines container serves all OpenWebUI instances. Each instance connects to the same Pipelines URL but passes its own `instance_id` via Valve configuration.

```yaml
services:
  pipelines:
    image: ghcr.io/open-webui/pipelines:main
    volumes:
      - ./shared-pipelines:/app/pipelines

  cornwall-openwebui:
    environment:
      - PIPELINES_URLS=http://pipelines:9099

  middlesex-openwebui:
    environment:
      - PIPELINES_URLS=http://pipelines:9099
```

**Approach B: Per-Instance Pipelines**
Each instance gets its own Pipelines container. More isolated, but more resources.

**Approach C: Built-in Functions (No Separate Container)**
Deploy the filter function directly in each OpenWebUI instance via the Functions API. This avoids the Pipelines container entirely:

```bash
# Deploy a function to an instance via API
curl -X POST http://cornwall.yardie.ai/api/v1/functions/create \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user-attribution",
    "name": "User Attribution Filter",
    "type": "filter",
    "content": "class Filter:\
    ...",
    "meta": {
      "description": "Injects user identity into LLM requests"
    },
    "is_active": true,
    "is_global": true
  }'
```

---

## 8. Programmatic Instance Setup Script

Here is a conceptual setup script showing how yardie.ai could provision a new tenant:

```python
"""
Conceptual: Provision a new OpenWebUI tenant instance
"""
import httpx
import time


async def provision_tenant(tenant_id: str, admin_email: str, admin_password: str):
    """
    Steps:
    1. Deploy OpenWebUI container (K8s/Docker API)
    2. Wait for it to be healthy
    3. Create first admin account (becomes the super-admin)
    4. Configure the instance via admin API
    5. Deploy user attribution pipeline/function
    6. Create tenant user accounts
    """
    base_url = f"https://{tenant_id}.yardie.ai"

    # Step 1: Deploy container (platform-specific, omitted)
    # deploy_container(tenant_id, config)

    # Step 2: Wait for health
    # The first request to OpenWebUI triggers initialization
    for _ in range(30):
        try:
            r = await httpx.get(f"{base_url}/health")
            if r.status_code == 200:
                break
        except Exception:
            pass
        time.sleep(2)

    # Step 3: Create first admin account
    # The FIRST signup becomes admin automatically
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{base_url}/api/v1/auths/signup", json={
            "email": admin_email,
            "password": admin_password,
            "name": f"{tenant_id} Admin"
        })
        admin_token = r.json()["token"]
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Step 4: Configure instance
        # Disable signup
        await client.post(f"{base_url}/api/v1/configs/update", headers=headers, json={
            "ENABLE_SIGNUP": False,
            "DEFAULT_USER_ROLE": "pending",
            # ... other settings
        })

        # Step 5: Deploy user attribution function
        filter_code = '''
class Filter:
    class Valves(BaseModel):
        priority: int = 0
        instance_id: str = "''' + tenant_id + '''"

    def inlet(self, body: dict, __user__: dict) -> dict:
        if "metadata" not in body:
            body["metadata"] = {}
        body["metadata"]["user_id"] = __user__["id"]
        body["metadata"]["user_email"] = __user__["email"]
        body["metadata"]["instance_id"] = self.valves.instance_id
        return body

    def outlet(self, body: dict, __user__: dict) -> dict:
        return body
'''
        await client.post(f"{base_url}/api/v1/functions/create", headers=headers, json={
            "id": "user-attribution",
            "name": "User Attribution Filter",
            "type": "filter",
            "content": filter_code,
            "meta": {"description": "Injects user identity into LLM requests"},
            "is_active": True,
            "is_global": True,
        })

        # Step 6: Create user accounts
        users = get_tenant_users(tenant_id)  # from your platform DB
        for user in users:
            await client.post(f"{base_url}/api/v1/auths/add", headers=headers, json={
                "email": user.email,
                "password": generate_temp_password(),
                "name": user.name,
                "role": "user"
            })
```

---

## 9. Recommendations for yardie.ai

### 9.1 Architecture

```
                    +-----------------+
                    |   yardie.ai     |
                    |   Platform      |
                    |   (Next.js)     |
                    +--------+--------+
                             |
              +--------------+--------------+
              |              |              |
    +---------v--+  +--------v---+  +------v-------+
    | Cornwall   |  | Middlesex  |  | [New Tenant] |
    | OpenWebUI  |  | OpenWebUI  |  | OpenWebUI    |
    +-----+------+  +-----+------+  +------+-------+
          |              |               |
          +--------------+---------------+
                         |
                  +------v-------+
                  | yardie.ai    |
                  | LLM Proxy    |
                  | (FastAPI)    |
                  +------+-------+
                         |
              +----------+----------+
              |          |          |
         +----v---+ +---v----+ +--v------+
         | OpenAI | | Claude | | Ollama  |
         +--------+ +--------+ +---------+
```

### 9.2 Specific Technical Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| **Deployment** | Kubernetes with Helm, one pod per tenant | Scalable, automatable, resource-efficient |
| **Database** | Shared PostgreSQL server, separate DB per tenant | Isolation with shared infrastructure |
| **Auth** | Central OIDC provider (Keycloak or Auth0) + OpenWebUI OIDC config | SSO across platform, centralized user management |
| **User Attribution** | Pipeline Filter Function + per-instance API keys | Most robust solution, gives both instance and user identity |
| **Usage Tracking** | Track at LLM proxy layer, not in OpenWebUI | OpenWebUI has no built-in usage dashboard; proxy sees all requests |
| **Token Budgets** | Enforce at LLM proxy layer | Proxy can reject requests when budget exceeded |
| **Self-Registration** | `ENABLE_SIGNUP=false`, provision via admin API | Full control over user lifecycle |
| **Model Access** | Configure per-instance via admin API + model filtering | Each tenant sees only their allowed models |
| **Instance Provisioning** | Automated script: deploy pod, create admin, configure, deploy functions | Minimize manual setup |

### 9.3 Implementation Phases

**Phase 1: Proof of Concept**
- Deploy single OpenWebUI instance via Docker
- Configure it to point to a simple LLM proxy
- Deploy a user attribution Pipeline Filter Function
- Verify that user identity flows through to the proxy
- Test user CRUD via admin API

**Phase 2: Multi-Tenant Infrastructure**
- Set up Kubernetes cluster
- Create Helm chart wrapper for tenant provisioning
- Set up shared PostgreSQL
- Build tenant provisioning automation
- Build LLM proxy with usage tracking

**Phase 3: Platform Integration**
- Integrate OpenWebUI OIDC with yardie.ai auth
- Build admin dashboard for tenant management
- Implement token budget enforcement
- Build usage reporting

---

## 10. Open Questions

### Must Resolve Before Architecture Decisions

1. **Pipeline reliability under load**: How do Pipelines perform with many concurrent users? Is the additional network hop (OpenWebUI -> Pipelines -> OpenWebUI) a bottleneck, or is using built-in Functions (no network hop) better?

2. **OpenWebUI version pinning**: The API surface changes between versions. Which version should yardie.ai standardize on? The `main` tag is a rolling release. Should we pin to a specific release tag?

3. **OIDC auto-provisioning behavior**: When a user logs in via OIDC for the first time, does OpenWebUI auto-create the account with `DEFAULT_USER_ROLE`? Need to test the exact behavior with `ENABLE_OAUTH_SIGNUP=true`.

4. **Config API completeness**: Can ALL admin settings be configured via the `/api/v1/configs/` endpoint, or are some settings only available via environment variables (set at container startup)?

5. **Metadata field forwarding**: Does the `metadata` field in the chat completions request body actually get forwarded to the LLM backend by OpenWebUI, or does it strip unknown fields? Need to verify by testing. If stripped, the Pipeline would need to use a different injection mechanism (e.g., modifying the API key itself to encode user info).

### Nice to Investigate

6. **WebSocket support**: Does OpenWebUI use WebSockets for any real-time features? Relevant for proxy architecture.

7. **RAG per-tenant isolation**: If using shared infrastructure, how are vector stores isolated between tenants? Each instance would need its own ChromaDB/vector store.

8. **OpenWebUI update strategy**: How to roll out OpenWebUI version updates across many tenant instances without disruption?

9. **Backup and restore**: Can individual tenant instances be backed up and restored (database export/import)?

10. **Rate limiting**: Does OpenWebUI have any built-in rate limiting, or must this be handled entirely at the proxy?

11. **Function/Tool API for bulk deployment**: Can Functions be deployed to multiple instances programmatically in a single operation, or must each instance be configured individually?

12. **MCP configuration via API**: Can MCP server connections be configured via the admin API, or only through the UI?

---

## Sources and References

| Resource | URL | Description |
|----------|-----|-------------|
| OpenWebUI GitHub | https://github.com/open-webui/open-webui | Source code, issues, discussions |
| OpenWebUI Docs | https://docs.openwebui.com | Official documentation |
| OpenWebUI Pipelines | https://github.com/open-webui/pipelines | Pipelines extension framework |
| Backend Routers | `backend/open_webui/routers/` in repo | API endpoint definitions |
| Backend Models | `backend/open_webui/models/` in repo | Database schema definitions |
| Helm Chart | https://github.com/open-webui/helm-charts | Kubernetes deployment |
| Environment Variables | https://docs.openwebui.com/getting-started/env-configuration | Full env var reference |
| Swagger/OpenAPI | `http://<instance>/docs` | Auto-generated API docs (run a local instance) |
| Functions Docs | https://docs.openwebui.com/features/plugin/functions/ | Functions/Tools/Filters guide |
| Pipelines Docs | https://docs.openwebui.com/pipelines/ | Pipelines framework guide |

---

*This document should be treated as a starting point. Several findings need to be validated by running a local OpenWebUI instance and testing the API directly. The open questions in Section 10 should be resolved through hands-on experimentation before finalizing the architecture.*