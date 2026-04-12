## Why

The user dashboard shows hardcoded placeholder stats (0 tokens, $1.00 budget, 0 conversations). LiteLLM is now tracking real usage data in `LiteLLM_SpendLogs` with user attribution via the `end_user` field (format: `user_id::email::instance_id`). The key info API also reports real spend and budget. We need to wire the dashboard to this real data.

## What Changes

- Replace mock data in `lib/usage.ts` with real queries against the LiteLLM database (`litellm_db`)
- Add a second PostgreSQL connection pool for the LiteLLM database
- Dashboard shows actual tokens used, conversations, spend, and budget remaining
- Manager instance view shows real per-user usage data

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-dashboard`: Usage stats pull from real LiteLLM data instead of placeholders

## Impact

- **lib/usage.ts**: Rewritten from stub to real queries
- **lib/db.ts**: Add a second pool for `litellm_db` (or create a separate module)
- **docker-compose.yml**: Portal needs `LITELLM_DATABASE_URL` env var
- **Dashboard components**: No changes needed — they already consume the `UsageStats` interface
