## Context

OpenWebUI filter functions can modify the request body before it's sent to the LLM backend. However, OpenWebUI only forwards standard OpenAI API fields — custom fields like `metadata` are stripped. The OpenAI chat completions API includes a `user` field (string, optional) intended for end-user identification. LiteLLM captures this field and stores it in the `end_user` column of `LiteLLM_SpendLogs`.

Testing confirmed:
- `body["metadata"]` → stripped by OpenWebUI, never reaches LiteLLM
- `body["user"]` → forwarded by OpenWebUI, captured by LiteLLM as `end_user`
- Direct curl with `"user": "test-user-123"` → `end_user = "test-user-123"` in spend logs

## Goals / Non-Goals

**Goals:**
- User attribution data reaches LiteLLM for every OpenWebUI chat request
- Attribution includes user_id, user_email, and instance_id
- Deploy script works reliably (handles activation, correct function ID format)

**Non-Goals:**
- Changing how LiteLLM processes the `end_user` field (it already stores it)
- Modifying LiteLLM configuration
- Building per-user usage dashboards (future work, will parse `end_user`)

## Decisions

### 1. Use `body["user"]` with encoded string

Encode all three attribution values into the `user` field using `::` as delimiter:

```
{user_id}::{user_email}::{instance_id}
```

Example: `1368554e-b8fa-46be-ab3d-c7e2601998d1::jamdat33@gmail.com::test`

**Why `::` delimiter:** Colons and at-signs appear in emails, but `::` (double colon) does not appear in UUIDs, emails, or instance IDs. Easy to split.

**Why not just user_id:** We want email and instance for debugging and dashboard queries without a join.

**Alternative rejected:** JSON-encoding into the `user` field — works but harder to query with SQL `SPLIT_PART()`.

### 2. Deploy script toggles active + global after creation

The OpenWebUI create function API ignores `is_active` and `is_global` fields. The deploy script must call the toggle endpoints after creation:
1. `POST /api/v1/functions/create`
2. `POST /api/v1/functions/id/{id}/toggle` (activate)
3. `POST /api/v1/functions/id/{id}/toggle/global` (make global)
4. `POST /api/v1/functions/id/{id}/valves/update` (set instance_id)

### 3. Function ID uses underscores

OpenWebUI requires alphanumeric + underscores only. Changed from `user-attribution` to `user_attribution`.

## Risks / Trade-offs

- **[Trade-off] `user` field overloaded** — The OpenAI `user` field is meant for a simple identifier, not structured data. → Acceptable for our use case. If OpenRouter or LiteLLM ever enforce format restrictions, we can switch to user_id only and join for the rest.
- **[Risk] OpenWebUI could stop forwarding `user`** — Version updates might change behavior. → Mitigation: pinned OpenWebUI version, test on upgrade.
