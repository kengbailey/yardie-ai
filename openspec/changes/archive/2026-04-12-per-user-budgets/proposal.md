## Why

All users on an instance currently share a single LiteLLM virtual key with one budget. There's no way to limit individual users' spend. LiteLLM has a built-in `end_user` budget system that enforces per-user spend limits using the `user` field we're already injecting — no per-user virtual keys needed. This dramatically simplifies the architecture.

## What Changes

- Add end_user CRUD functions to `lib/litellm-admin.ts` (create, update, get info, delete)
- Create a LiteLLM end_user record during user provisioning with $1 default budget and monthly reset
- Update the budget API route to call `/end_user/update` instead of the virtual key approach
- Update the provisioning pipeline to create end_user records
- Drop the `litellm_key` column concept from instance_roles — it's no longer needed
- Update `lib/usage.ts` to pull budget from the end_user record instead of the shared key

## Capabilities

### New Capabilities

### Modified Capabilities
- `user-provisioning`: Provisioning now creates a LiteLLM end_user record with budget
- `instance-management`: Budget updates propagate via end_user API, not virtual key API
- `user-dashboard`: Budget info sourced from end_user record, not shared key

## Impact

- `lib/litellm-admin.ts` — add end_user API functions
- `lib/provisioning.ts` — create end_user during provisioning
- `app/api/instances/[id]/users/[userId]/budget/route.ts` — call end_user update
- `lib/usage.ts` — query end_user for budget info
