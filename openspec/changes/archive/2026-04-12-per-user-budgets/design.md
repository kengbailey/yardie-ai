## Context

LiteLLM's `LiteLLM_EndUserTable` provides per-user budget enforcement using the `user` field from chat completion requests. Our OpenWebUI filter function already injects `{openwebui_user_id}::{email}::{instance_id}` into the `user` field. LiteLLM automatically checks this value against the end_user table and blocks requests when budget is exceeded.

This eliminates the need for per-user virtual keys entirely. The shared instance key handles auth/routing; end_user records handle budget enforcement.

## Goals / Non-Goals

**Goals:**
- Per-user budget enforcement via LiteLLM end_user system
- End_user created during provisioning with $1 default, monthly reset
- Managers can update budgets via the portal (propagates to LiteLLM immediately)
- Dashboard shows per-user budget from end_user record

**Non-Goals:**
- Per-user model restrictions (not supported by end_user system — stay at instance level)
- Per-user virtual keys (replaced by end_user approach)
- Budget reset customization (monthly reset managed by LiteLLM)

## Decisions

### 1. End_user ID = composite string from filter function

The `user_id` in `LiteLLM_EndUserTable` must exactly match what the filter function injects. We use the same composite format: `{openwebui_user_id}::{email}::{instance_id}`.

Since the portal user_id differs from the OpenWebUI user_id, we construct the end_user ID using the portal user's email (which is consistent across systems) during provisioning. The exact ID is only known after the OpenWebUI account is created (since we need the OpenWebUI user_id).

**Simplified approach:** Use just the email as the end_user ID in both the filter function and the end_user table. This avoids the ID mismatch problem entirely.

Update filter function: `body["user"] = user_email` (just the email, not the composite).
Create end_user: `user_id = email`.

This is simpler, unique per user, and consistent across all systems.

### 2. Budget update route calls `/end_user/update`

The budget route in the portal calls `updateEndUser(email, { maxBudget })`. No need to look up a `litellm_key` column — we use the email directly.

### 3. Monthly budget reset

Set `budget_duration: "monthly"` on end_user creation. LiteLLM automatically resets spend to 0 each month.

### 4. Dashboard queries end_user for budget

`lib/usage.ts` queries `LiteLLM_EndUserTable` for `max_budget` and `spend` instead of the shared key.

## Risks / Trade-offs

- **[Change] Filter function format changes** — switching from `id::email::instance` to just `email` in the `user` field. Historical spend logs will have the old format. New logs will use email only. Dashboard queries need to handle both during transition.
- **[Trade-off] No per-user model restrictions** — models are controlled at instance level only. Acceptable for now.
