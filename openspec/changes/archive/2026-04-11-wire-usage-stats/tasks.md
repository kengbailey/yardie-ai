## 1. LiteLLM Database Connection

- [x] 1.1 Create `lib/litellm-db.ts` — read-only PostgreSQL pool connecting to `litellm_db` via `LITELLM_DATABASE_URL` env var
- [x] 1.2 Add `LITELLM_DATABASE_URL` to portal service in `docker-compose.yml` (pointing to same postgres server, different database)
- [x] 1.3 Add `LITELLM_DATABASE_URL` to `.env.example` with documentation

## 2. Wire Usage Queries

- [x] 2.1 Rewrite `lib/usage.ts` `getUserUsageStats()` — query `LiteLLM_SpendLogs` for monthly tokens, request count, and spend; parse `end_user` with `SPLIT_PART`; get budget from LiteLLM key info API
- [x] 2.2 Verify dashboard shows real data after chatting in OpenWebUI

## 3. Commit

- [x] 3.1 Commit and push
