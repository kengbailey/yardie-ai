## Context

The budget and model update API routes currently log the change but don't call LiteLLM. The `lib/litellm-admin.ts` module already provides `updateVirtualKey(keyId, { maxBudget?, models? })`. The missing piece is: we need to know the user's LiteLLM virtual key ID to update it.

Currently, all users on an instance share a single virtual key (`sk-test-instance-key`). Per-user virtual keys aren't created yet. So updating budget/models per-user via LiteLLM isn't possible until we have per-user keys.

## Goals / Non-Goals

**Goals:**
- Budget and model API routes call LiteLLM when per-user keys exist
- Clean up misleading TODO comments
- Leave clear comments about the per-user key prerequisite

**Non-Goals:**
- Implementing per-user virtual keys (future change)
- Changing the shared-key architecture

## Decisions

### 1. Update routes to call LiteLLM when a user has a personal virtual key

The routes will check if the user has a LiteLLM key stored in the portal database. If yes, call `updateVirtualKey()`. If no (shared key), log and skip. This makes the code forward-compatible — once per-user keys are provisioned, the routes work automatically.

### 2. Remove misleading auth hook TODO

The `databaseHooks.user.create.after` TODO says "trigger provisioning pipeline" but provisioning is correctly triggered by the assign-to-instance endpoint. The hook should just log user creation. Replace the TODO with a clear comment.
