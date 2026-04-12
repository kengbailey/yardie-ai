## Why

Three TODO placeholders remain in the codebase where LiteLLM Admin API calls should be made. The `lib/litellm-admin.ts` wrapper already has the functions — they just need wiring into the API routes and auth hook.

## What Changes

- Wire the budget update API route to call `updateVirtualKey()` with the new `max_budget`
- Wire the model access API route to call `updateVirtualKey()` with the new model allowlist
- Remove the auth hook TODO (provisioning is already triggered by the assign endpoint, not signup — the TODO is misleading)

## Capabilities

### New Capabilities

### Modified Capabilities
- `instance-management`: Budget and model changes now propagate to LiteLLM in real time

## Impact

- `app/api/instances/[id]/users/[userId]/budget/route.ts` — add LiteLLM API call
- `app/api/instances/[id]/users/[userId]/models/route.ts` — add LiteLLM API call
- `lib/auth.ts` — clarify the hook comment (provisioning happens via assign endpoint)
