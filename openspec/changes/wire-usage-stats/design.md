## Context

LiteLLM stores usage data in `litellm_db` PostgreSQL database. The portal connects to `portal_db`. To query usage stats, the portal needs a read-only connection to `litellm_db`. Both databases are on the same PostgreSQL server.

Available data sources:
- `LiteLLM_SpendLogs`: per-request logs with `end_user` (our attribution), `total_tokens`, `spend`, `model`, `startTime`
- LiteLLM key info API (`/key/info`): `spend` (total), `max_budget` for a virtual key

The `end_user` field contains `{user_id}::{user_email}::{instance_id}`. We parse it with SQL `SPLIT_PART(end_user, '::', 1)` to extract the user_id.

## Goals / Non-Goals

**Goals:**
- Dashboard shows real token count, conversation count, budget used/remaining
- Data is current (queried on page load, no caching for now)
- Manager view shows real per-user stats

**Non-Goals:**
- Real-time updates (websocket/polling) — page refresh is fine
- Historical charts or trends — just current month totals
- Redis caching of stats — premature optimization

## Decisions

### 1. Separate connection pool for litellm_db

Create `lib/litellm-db.ts` with a read-only pool connecting to `litellm_db`. Keep it separate from the portal pool to maintain clean separation.

**Why not query via LiteLLM Admin API:** The API doesn't expose per-user spend aggregation. Direct SQL is simpler and faster for dashboard queries.

### 2. Query LiteLLM_SpendLogs for monthly stats

```sql
SELECT
  COALESCE(SUM(total_tokens), 0) as tokens_used,
  COUNT(*) as conversation_count,
  COALESCE(SUM(spend), 0) as total_spend
FROM "LiteLLM_SpendLogs"
WHERE SPLIT_PART(end_user, '::', 1) = $1
  AND "startTime" >= date_trunc('month', CURRENT_TIMESTAMP)
```

### 3. Query LiteLLM key info API for budget

Use the existing `lib/litellm-admin.ts` `getKeySpend()` to get `max_budget` and total `spend` for the instance key. For per-user budget, we derive it from the user's spend vs their allocated budget (stored in portal_db or on the LiteLLM key metadata).

For Phase 1: use the instance key's budget as the user's budget (all users on an instance share the key's budget). Per-user virtual keys come later.

### 4. Tier derived from portal_db

The user's subscription tier is stored in the portal database (not LiteLLM). For now, all users are "Free" tier. The tier field stays as-is until the subscription system is built.
