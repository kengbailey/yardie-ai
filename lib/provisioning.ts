/**
 * User provisioning pipeline.
 *
 * Handles the full lifecycle of provisioning a user into an OpenWebUI instance:
 *   1. Create OpenWebUI account via admin API
 *   2. Create LiteLLM virtual key with default budget
 *   3. Send welcome email via Resend
 *
 * Also provides a retry queue backed by the provisioning_tasks table.
 *
 * Environment variables:
 *   LITELLM_BASE_URL   - LiteLLM proxy URL
 *   LITELLM_MASTER_KEY - LiteLLM admin API key
 *   RESEND_API_KEY     - Resend email service API key
 *   RESEND_FROM_EMAIL  - From address for emails (default: noreply@yardie.ai)
 *   NEXT_PUBLIC_APP_URL - Portal URL for email links
 */
import { randomBytes } from "node:crypto";

import { pool } from "@/lib/db";
import { createVirtualKey, LiteLLMAdminError } from "@/lib/litellm-admin";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Yardie AI <noreply@yardie.ai>";
const DEFAULT_BUDGET_USD = 1.0;
const MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  name: string;
  email: string;
}

interface InstanceRow {
  id: string;
  name: string;
  subdomain: string;
  base_url: string;
  status: string;
}

interface ProvisioningTaskRow {
  id: number;
  user_id: string;
  instance_id: string;
  task_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Password generation
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure random password.
 * Returns a 16-character alphanumeric string.
 */
export function generateSecurePassword(): string {
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(16);
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += charset[bytes[i] % charset.length];
  }
  return password;
}

// ---------------------------------------------------------------------------
// OpenWebUI provisioning
// ---------------------------------------------------------------------------

interface OpenWebUIAccountResult {
  openwebuiUserId: string;
}

/**
 * Create a user account in an OpenWebUI instance via admin API.
 *
 * POST ${instance.baseUrl}/api/v1/auths/add
 * Headers: Authorization: Bearer <instance admin API key>
 * Body: { email, password, name, role: "user" }
 *
 * The instance admin API key is stored as the OPENAI_API_KEYS value
 * for that instance, which we look up from instance_roles metadata
 * or from the instance config. For now, we use the instance's
 * OPENWEBUI_TEST_API_KEY pattern. In production, each instance
 * will have its own admin key stored in an instance_config table.
 */
export async function provisionUserInOpenWebUI(
  user: UserRow,
  instance: InstanceRow,
  tempPassword: string,
  adminApiKey: string,
): Promise<OpenWebUIAccountResult> {
  const url = `${instance.base_url}/api/v1/auths/add`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      password: tempPassword,
      name: user.name,
      role: "user",
    }),
  });

  if (!response.ok) {
    const body = await response.text();

    // Check for "already exists" -- treat as idempotent success
    if (response.status === 400 && body.includes("already exists")) {
      console.info(
        JSON.stringify({
          level: "info",
          msg: "OpenWebUI account already exists, treating as success",
          userId: user.id,
          instanceId: instance.id,
        }),
      );
      return { openwebuiUserId: user.id };
    }

    throw new Error(
      `OpenWebUI API error at ${url} (${response.status}): ${body}`,
    );
  }

  const data = (await response.json()) as { id?: string };
  return { openwebuiUserId: data.id ?? user.id };
}

// ---------------------------------------------------------------------------
// LiteLLM virtual key creation
// ---------------------------------------------------------------------------

interface LiteLLMKeyResult {
  key: string;
}

/**
 * Create a LiteLLM virtual key for a user with default budget.
 *
 * POST ${LITELLM_BASE_URL}/key/generate
 * Body: { models: [], max_budget: 1.0, user_id, metadata: { email, instance_id } }
 */
export async function createLiteLLMVirtualKey(
  user: UserRow,
  instanceId: string,
): Promise<LiteLLMKeyResult> {
  const result = await createVirtualKey({
    userId: user.id,
    models: [],
    maxBudget: DEFAULT_BUDGET_USD,
    metadata: {
      email: user.email,
      instance_id: instanceId,
    },
    keyAlias: `${user.email}-${instanceId}`,
  });

  return { key: result.key };
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

/**
 * Send a welcome email to the user with their instance URL and credentials.
 */
export async function sendWelcomeEmail(
  user: UserRow,
  instance: InstanceRow,
  tempPassword: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "RESEND_API_KEY not set. Welcome email not sent.",
        userId: user.id,
        instanceId: instance.id,
      }),
    );
    return;
  }

  const instanceUrl = instance.base_url;

  const html = `
    <h2>Welcome to Yardie AI</h2>
    <p>Hi ${escapeHtml(user.name)},</p>
    <p>Your AI assistant is ready! You have been assigned to the <strong>${escapeHtml(instance.name)}</strong> instance.</p>

    <h3>Your Login Details</h3>
    <ul>
      <li><strong>Instance URL:</strong> <a href="${escapeHtml(instanceUrl)}">${escapeHtml(instanceUrl)}</a></li>
      <li><strong>Email:</strong> ${escapeHtml(user.email)}</li>
      <li><strong>Temporary Password:</strong> <code>${escapeHtml(tempPassword)}</code></li>
    </ul>

    <h3>Getting Started</h3>
    <ol>
      <li>Go to <a href="${escapeHtml(instanceUrl)}">${escapeHtml(instanceUrl)}</a></li>
      <li>Log in with the email and temporary password above</li>
      <li>Change your password immediately after first login</li>
      <li>Start chatting with AI models</li>
    </ol>

    <p><em>Please change your password on first login for security.</em></p>
    <p>If you have any questions, contact your instance manager.</p>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: user.email,
      subject: "Welcome to Yardie AI",
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

/**
 * Basic HTML escaping to prevent XSS in email templates.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Provision a user for an OpenWebUI instance.
 *
 * Orchestrates all three steps:
 *   1. Create OpenWebUI account
 *   2. Create LiteLLM virtual key
 *   3. Send welcome email
 *
 * Each step is tracked as a separate provisioning_task row. Steps that
 * are already completed are skipped (idempotent).
 */
export async function provisionUser(
  userId: string,
  instanceId: string,
): Promise<void> {
  // Load user and instance data
  const userResult = await pool.query<UserRow>(
    `SELECT id, name, email FROM "user" WHERE id = $1`,
    [userId],
  );
  const user = userResult.rows[0];
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const instanceResult = await pool.query<InstanceRow>(
    `SELECT id, name, subdomain, base_url, status FROM instances WHERE id = $1`,
    [instanceId],
  );
  const instance = instanceResult.rows[0];
  if (!instance) {
    throw new Error(`Instance not found: ${instanceId}`);
  }

  // Load existing tasks for this user+instance to check what's already done
  const existingTasks = await pool.query<ProvisioningTaskRow>(
    `SELECT id, task_type, status FROM provisioning_tasks
     WHERE user_id = $1 AND instance_id = $2`,
    [userId, instanceId],
  );

  const completedTypes = new Set(
    existingTasks.rows
      .filter((t) => t.status === "completed")
      .map((t) => t.task_type),
  );

  const tempPassword = generateSecurePassword();

  // Step 1: Create OpenWebUI account
  if (!completedTypes.has("create_openwebui_account")) {
    await updateTaskStatus(userId, instanceId, "create_openwebui_account", "in_progress");
    try {
      // For now, we use environment variable for the admin API key.
      // In production, this would come from an instance_config table.
      const adminApiKey = process.env.OPENWEBUI_ADMIN_API_KEY ?? "";
      await provisionUserInOpenWebUI(user, instance, tempPassword, adminApiKey);
      await updateTaskStatus(userId, instanceId, "create_openwebui_account", "completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateTaskStatus(userId, instanceId, "create_openwebui_account", "failed", message);
      throw error;
    }
  }

  // Step 2: Create LiteLLM virtual key
  if (!completedTypes.has("create_litellm_key")) {
    await updateTaskStatus(userId, instanceId, "create_litellm_key", "in_progress");
    try {
      await createLiteLLMVirtualKey(user, instanceId);
      await updateTaskStatus(userId, instanceId, "create_litellm_key", "completed");
    } catch (error) {
      const message =
        error instanceof LiteLLMAdminError
          ? `${error.message}: ${error.responseBody}`
          : error instanceof Error
            ? error.message
            : String(error);
      await updateTaskStatus(userId, instanceId, "create_litellm_key", "failed", message);
      throw error;
    }
  }

  // Step 3: Send welcome email
  if (!completedTypes.has("send_welcome_email")) {
    await updateTaskStatus(userId, instanceId, "send_welcome_email", "in_progress");
    try {
      await sendWelcomeEmail(user, instance, tempPassword);
      await updateTaskStatus(userId, instanceId, "send_welcome_email", "completed");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateTaskStatus(userId, instanceId, "send_welcome_email", "failed", message);
      throw error;
    }
  }

  console.info(
    JSON.stringify({
      level: "info",
      msg: "User provisioning completed",
      userId,
      instanceId,
    }),
  );
}

// ---------------------------------------------------------------------------
// Task status helpers
// ---------------------------------------------------------------------------

async function updateTaskStatus(
  userId: string,
  instanceId: string,
  taskType: string,
  status: string,
  lastError?: string,
): Promise<void> {
  await pool.query(
    `UPDATE provisioning_tasks
     SET status = $1, last_error = $2, attempts = attempts + CASE WHEN $1 = 'failed' THEN 1 ELSE 0 END, updated_at = NOW()
     WHERE user_id = $3 AND instance_id = $4 AND task_type = $5`,
    [status, lastError ?? null, userId, instanceId, taskType],
  );
}

// ---------------------------------------------------------------------------
// Queue operations (Task 9.2)
// ---------------------------------------------------------------------------

/**
 * Enqueue provisioning tasks for a user+instance.
 *
 * Inserts three rows into provisioning_tasks (one per step) with status='pending'.
 * Uses ON CONFLICT to avoid duplicates (idempotent).
 */
export async function enqueueProvisioning(
  userId: string,
  instanceId: string,
): Promise<void> {
  const taskTypes = [
    "create_openwebui_account",
    "create_litellm_key",
    "send_welcome_email",
  ] as const;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const taskType of taskTypes) {
      // Check if a task already exists for this user+instance+type
      const existing = await client.query<{ id: number; status: string }>(
        `SELECT id, status FROM provisioning_tasks
         WHERE user_id = $1 AND instance_id = $2 AND task_type = $3`,
        [userId, instanceId, taskType],
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO provisioning_tasks (user_id, instance_id, task_type, status, attempts, max_attempts, next_retry_at)
           VALUES ($1, $2, $3, 'pending', 0, $4, NOW())`,
          [userId, instanceId, taskType, MAX_ATTEMPTS],
        );
      }
    }

    await client.query("COMMIT");

    console.info(
      JSON.stringify({
        level: "info",
        msg: "Provisioning tasks enqueued",
        userId,
        instanceId,
      }),
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Process the provisioning queue.
 *
 * Queries for pending/retrying tasks where next_retry_at <= NOW(),
 * groups them by user+instance, and processes each group via provisionUser.
 *
 * Tasks that fail are retried with exponential backoff:
 *   next_retry_at = NOW() + 2^attempts minutes (max 5 attempts)
 *
 * Tasks that exceed max_attempts are marked as 'failed'.
 */
export async function processProvisioningQueue(): Promise<number> {
  // Find distinct user+instance pairs with pending or retryable tasks
  const pendingGroups = await pool.query<{
    user_id: string;
    instance_id: string;
  }>(
    `SELECT DISTINCT user_id, instance_id
     FROM provisioning_tasks
     WHERE status IN ('pending', 'in_progress')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       AND attempts < max_attempts
     ORDER BY user_id, instance_id`,
  );

  let processedCount = 0;

  for (const group of pendingGroups.rows) {
    try {
      await provisionUser(group.user_id, group.instance_id);
      processedCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Provisioning failed for user+instance",
          userId: group.user_id,
          instanceId: group.instance_id,
          error: message,
        }),
      );

      // Apply exponential backoff to failed tasks
      await applyExponentialBackoff(group.user_id, group.instance_id);
    }
  }

  // Mark tasks that exceeded max_attempts as permanently failed
  await pool.query(
    `UPDATE provisioning_tasks
     SET status = 'failed', updated_at = NOW()
     WHERE status IN ('pending', 'in_progress')
       AND attempts >= max_attempts`,
  );

  return processedCount;
}

/**
 * Apply exponential backoff to failed tasks for a user+instance.
 * next_retry_at = NOW() + 2^attempts minutes
 */
async function applyExponentialBackoff(
  userId: string,
  instanceId: string,
): Promise<void> {
  await pool.query(
    `UPDATE provisioning_tasks
     SET next_retry_at = NOW() + (POWER(2, attempts) || ' minutes')::INTERVAL,
         status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE status END,
         updated_at = NOW()
     WHERE user_id = $1 AND instance_id = $2
       AND status IN ('pending', 'in_progress', 'failed')
       AND status != 'completed'`,
    [userId, instanceId],
  );
}

// ---------------------------------------------------------------------------
// Queue status queries (Task 9.5)
// ---------------------------------------------------------------------------

interface ProvisioningQueueCounts {
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
}

/**
 * Get counts of provisioning tasks by status.
 * Used by the sysadmin dashboard.
 */
export async function getProvisioningQueueCounts(): Promise<ProvisioningQueueCounts> {
  const result = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::TEXT as count
     FROM provisioning_tasks
     GROUP BY status`,
  );

  const counts: ProvisioningQueueCounts = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };

  for (const row of result.rows) {
    const key = row.status as keyof ProvisioningQueueCounts;
    if (key in counts) {
      counts[key] = parseInt(row.count, 10);
    }
  }

  return counts;
}

/**
 * Get failed provisioning tasks with details.
 * Used by the sysadmin dashboard for manual intervention.
 */
export async function getFailedProvisioningTasks(): Promise<ProvisioningTaskRow[]> {
  const result = await pool.query<ProvisioningTaskRow>(
    `SELECT pt.*, u.name as user_name, u.email as user_email, i.name as instance_name
     FROM provisioning_tasks pt
     JOIN "user" u ON u.id = pt.user_id
     JOIN instances i ON i.id = pt.instance_id
     WHERE pt.status = 'failed'
     ORDER BY pt.updated_at DESC
     LIMIT 100`,
  );

  return result.rows;
}
