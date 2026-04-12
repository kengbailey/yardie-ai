/**
 * Usage statistics from LiteLLM.
 *
 * Queries LiteLLM_SpendLogs for per-user token usage and spend.
 * User attribution is encoded in the `end_user` column as:
 *   {user_id}::{user_email}::{instance_id}
 *
 * Budget info comes from the LiteLLM Admin API (key info).
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

interface KeySpendRow {
  [key: string]: unknown;
  spend: number;
  max_budget: number | null;
}

/**
 * Get usage statistics for a user in the current month.
 *
 * Matches on email (part 2 of end_user) because the portal user_id and
 * OpenWebUI user_id are different — email is the shared identifier.
 */
export async function getUserUsageStats(
  _userId: string,
  email: string,
): Promise<UsageStats> {
  // Query LiteLLM_SpendLogs for this user's monthly usage
  // end_user format: "{openwebui_user_id}::{email}::{instance_id}"
  // Match on email (part 2) since portal and OpenWebUI user IDs differ
  let tokensUsed = 0;
  let conversationCount = 0;
  let totalSpend = 0;

  try {
    const rows = await litellmQuery<SpendRow>(
      `SELECT
        COALESCE(SUM(total_tokens), 0) as tokens_used,
        COUNT(*) as request_count,
        COALESCE(SUM(spend), 0) as total_spend
      FROM "LiteLLM_SpendLogs"
      WHERE SPLIT_PART(end_user, '::', 2) = $1
        AND "startTime" >= date_trunc('month', CURRENT_TIMESTAMP)`,
      [email],
    );

    if (rows[0]) {
      tokensUsed = Number(rows[0].tokens_used);
      conversationCount = Number(rows[0].request_count);
      totalSpend = Number(rows[0].total_spend);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to query LiteLLM usage stats",
        email,
        error: message,
      }),
    );
  }

  // Get budget from LiteLLM key info API
  let budgetTotal = 1.0;
  let budgetRemaining = 1.0;

  try {
    const LITELLM_BASE_URL =
      process.env.LITELLM_BASE_URL ?? "http://litellm:4000";
    const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY ?? "";

    // Query all keys and find the one associated with this user's instance
    // For now, get the first non-master key's budget as a proxy
    const keyRows = await litellmQuery<KeySpendRow>(
      `SELECT spend, max_budget
       FROM "LiteLLM_VerificationToken"
       WHERE max_budget IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 1`,
    );

    if (keyRows[0]) {
      budgetTotal = keyRows[0].max_budget ?? 1.0;
      // Budget remaining = total budget - this user's spend
      budgetRemaining = Math.max(0, budgetTotal - totalSpend);
    } else if (LITELLM_MASTER_KEY) {
      // Fallback: try the API
      try {
        const response = await fetch(
          `${LITELLM_BASE_URL}/key/info?key=sk-test-instance-key`,
          {
            headers: { Authorization: `Bearer ${LITELLM_MASTER_KEY}` },
          },
        );
        if (response.ok) {
          const data = (await response.json()) as {
            info?: { spend?: number; max_budget?: number };
          };
          if (data.info) {
            budgetTotal = data.info.max_budget ?? 1.0;
            budgetRemaining = Math.max(0, budgetTotal - totalSpend);
          }
        }
      } catch {
        // API fallback failed, use defaults
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to query LiteLLM budget info",
        email,
        error: message,
      }),
    );
  }

  return {
    tokensUsed,
    conversationCount,
    budgetTotal,
    budgetRemaining,
    tier: "Free", // Tier system not yet implemented
  };
}
