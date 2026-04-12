/**
 * Usage statistics utilities.
 *
 * Phase 1: Returns placeholder/mock data structured for future LiteLLM integration.
 *
 * When LiteLLM is integrated (task 10.x), these functions will query:
 *   - LiteLLM's `LiteLLM_SpendLogs` table for token usage and spend
 *   - LiteLLM's `LiteLLM_VerificationToken` table for budget info
 *   - LiteLLM's `/user/info` API endpoint for real-time usage
 *
 * The return types are stable -- only the data source will change.
 */

export interface UsageStats {
  /** Total tokens used in the current billing month */
  tokensUsed: number;
  /** Number of conversations in the current billing month */
  conversationCount: number;
  /** Total budget allocated in USD */
  budgetTotal: number;
  /** Remaining budget in USD */
  budgetRemaining: number;
  /** Subscription tier */
  tier: "Free" | "Standard" | "Pro";
}

/**
 * Get usage statistics for a user.
 *
 * Phase 1: Returns mock data. Structure is ready for LiteLLM integration.
 *
 * Future implementation will:
 *   1. Query LiteLLM_SpendLogs for token counts and spend by user_id
 *   2. Query LiteLLM_VerificationToken for budget limits
 *   3. Calculate remaining budget from (max_budget - total_spend)
 *   4. Derive tier from the user's instance configuration
 */
export async function getUserUsageStats(
  _userId: string,
): Promise<UsageStats> {
  // TODO: Replace with LiteLLM database queries / Admin API calls
  // Example future query:
  //   SELECT SUM(total_tokens) as tokens, COUNT(DISTINCT request_id) as conversations
  //   FROM "LiteLLM_SpendLogs"
  //   WHERE "user" = $1
  //     AND "startTime" >= date_trunc('month', CURRENT_DATE)

  return {
    tokensUsed: 0,
    conversationCount: 0,
    budgetTotal: 1.0,
    budgetRemaining: 1.0,
    tier: "Free",
  };
}
