## 1. Wire LiteLLM API calls

- [x] 1.1 Update `app/api/instances/[id]/users/[userId]/budget/route.ts` — replace TODO with call to `updateVirtualKey()` when user has a personal key, otherwise log and store in portal DB
- [x] 1.2 Update `app/api/instances/[id]/users/[userId]/models/route.ts` — same pattern for model allowlist
- [x] 1.3 Update `lib/auth.ts` — replace the misleading TODO comment in `databaseHooks.user.create.after` with a clear comment that provisioning is handled by the assign endpoint

## 2. Commit

- [ ] 2.1 Verify typecheck passes, commit and push
