/**
 * Usage statistics from LiteLLM.
 *
 * Queries LiteLLM_SpendLogs for per-user token usage and spend.
 * User attribution uses email in the `end_user` column.
 * Budget info comes from LiteLLM_EndUserTable.
 */
import { litellmQuery } from "@/lib/litellm-db";

export interface UsageStats {
  /** Total tokens used in the current billing month */
  tokensUsed: number;
  /** Number of LLM requests in the current billing month */
  conversationCount: number;
  /** Total budget allocated in USD */
  budgetTotal: number;
  /** Remaining budget in USD */
  budgetRemaining: number;
  /** Subscription tier */
  tier: "Free" | "Standard" | "Pro";
}

interface SpendRow {
  [key: string]: unknown;
  tokens_used: string;
  request_count: string;
  total_spend: string;
}

interface EndUserRow {
  [key: string]: unknown;
  spend: number;
  max_budget: number | null;
}

/**
 * Get usage statistics for a user in the current month.
 * Matches on email in spend logs (handles both old composite and new email-only format).
 * Budget comes from LiteLLM_EndUserTable keyed by email.
 */
export async function getUserUsageStats(
  _userId: string,
  email: string,
): Promise<UsageStats> {
  let tokensUsed = 0;
  let conversationCount = 0;

  // Query spend logs — match on email (handles both "email" and "id::email::instance" formats)
  try {
    const rows = await litellmQuery<SpendRow>(
      `SELECT
        COALESCE(SUM(total_tokens), 0) as tokens_used,
        COUNT(*) as request_count,
        COALESCE(SUM(spend), 0) as total_spend
      FROM "LiteLLM_SpendLogs"
      WHERE (end_user = $1 OR SPLIT_PART(end_user, '::', 2) = $1)
        AND "startTime" >= date_trunc('month', CURRENT_TIMESTAMP)`,
      [email],
    );

    if (rows[0]) {
      tokensUsed = Number(rows[0].tokens_used);
      conversationCount = Number(rows[0].request_count);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({ level: "error", msg: "Failed to query usage stats", email, error: message }),
    );
  }

  // Query end_user record for budget
  let budgetTotal = 1.0;
  let budgetRemaining = 1.0;

  try {
    const rows = await litellmQuery<EndUserRow>(
      `SELECT eu.spend, bt.max_budget
       FROM "LiteLLM_EndUserTable" eu
       LEFT JOIN "LiteLLM_BudgetTable" bt ON eu.budget_id = bt.budget_id
       WHERE eu.user_id = $1`,
      [email],
    );

    if (rows[0]) {
      const spend = rows[0].spend ?? 0;
      budgetTotal = rows[0].max_budget ?? 1.0;
      budgetRemaining = Math.max(0, budgetTotal - spend);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({ level: "error", msg: "Failed to query end_user budget", email, error: message }),
    );
  }

  return {
    tokensUsed,
    conversationCount,
    budgetTotal,
    budgetRemaining,
    tier: "Free",
  };
}
