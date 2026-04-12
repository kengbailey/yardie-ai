## 1. Fix Attribution Function

- [x] 1.1 Update `openwebui/user-attribution-function.py` — change from `body["metadata"]` to `body["user"]` with format `{user_id}::{user_email}::{instance_id}`
- [x] 1.2 Update `scripts/deploy-function.ts` — add toggle active, toggle global, and valves update calls after creation; use `user_attribution` as function ID

## 2. Deploy and Verify

- [x] 2.1 Delete the existing `user_attribution` function from the test OpenWebUI instance
- [x] 2.2 Run the updated deploy script against the test instance
- [x] 2.3 Send a chat message in OpenWebUI
- [x] 2.4 Query `LiteLLM_SpendLogs` and verify `end_user` contains the attributed string
- [ ] 2.5 Commit the fix
