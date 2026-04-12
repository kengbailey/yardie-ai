## 1. Simplify attribution to email-only

- [x] 1.1 Update `openwebui/user-attribution-function.py` — change `body["user"]` from `{id}::{email}::{instance}` to just `{email}`
- [x] 1.2 Redeploy the function to the test OpenWebUI instance

## 2. Add end_user API to litellm-admin

- [x] 2.1 Add end_user CRUD functions to `lib/litellm-admin.ts`: `createEndUser(email, maxBudget, budgetDuration)`, `updateEndUser(email, { maxBudget?, blocked? })`, `getEndUserInfo(email)`, `deleteEndUser(email)`

## 3. Wire provisioning to create end_user

- [x] 3.1 Update `lib/provisioning.ts` — add `createLiteLLMEndUser()` step that calls `createEndUser(email, 1.0, "monthly")` during provisioning
- [x] 3.2 Create an end_user record for the existing test user (jamdat33@gmail.com) manually via API

## 4. Wire budget route to end_user API

- [x] 4.1 Update `app/api/instances/[id]/users/[userId]/budget/route.ts` — look up user's email from portal DB, call `updateEndUser(email, { maxBudget })` instead of the virtual key approach

## 5. Wire dashboard to end_user budget

- [x] 5.1 Update `lib/usage.ts` — query `LiteLLM_EndUserTable` for `max_budget` and `spend` by email, and match spend logs on email directly (handle both old composite and new email-only format)

## 6. Test and commit

- [x] 6.1 Chat in OpenWebUI, verify spend logs show email-only in end_user column
- [x] 6.2 Check dashboard shows per-user budget from end_user record
- [x] 6.3 Commit and push
