## Why

The OpenWebUI user attribution filter function injects `user_id`, `user_email`, and `instance_id` into `body["metadata"]`, but OpenWebUI strips non-standard fields before forwarding requests to the LLM backend. LiteLLM never sees our attribution data. Testing confirmed: the `metadata` column in `LiteLLM_SpendLogs` shows no user attribution for OpenWebUI-originated requests, while direct curl requests with a top-level `user` field correctly populate the `end_user` column.

## What Changes

- Update the OpenWebUI filter function to inject user identity into `body["user"]` (a standard OpenAI API field that OpenWebUI forwards) instead of `body["metadata"]`
- Encode attribution as `{user_id}::{user_email}::{instance_id}` in the `user` field
- Update the deploy script to toggle the function active + global after creation (the create API ignores `is_active` and `is_global`)
- Fix the function ID to use underscores not hyphens (OpenWebUI requirement discovered during testing)
- Verify end-to-end: chat in OpenWebUI → `end_user` populated in LiteLLM spend logs

## Capabilities

### New Capabilities

### Modified Capabilities
- `openwebui-integration`: User attribution mechanism changes from `body["metadata"]` to `body["user"]` field

## Impact

- **OpenWebUI filter function**: `openwebui/user-attribution-function.py` — injection target changes
- **Deploy script**: `scripts/deploy-function.ts` — add activation toggles, fix function ID
- **Portal usage queries**: `lib/usage.ts` — will need to parse `end_user` field (format: `id::email::instance`) instead of querying metadata JSON fields
