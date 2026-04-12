/**
 * Provisioning queue worker.
 *
 * Polls the provisioning_tasks table for pending tasks and processes them.
 * Runs in a loop, checking every 30 seconds.
 *
 * Usage:
 *   npx tsx scripts/process-provisioning.ts
 *   npm run provisioning:worker
 *
 * Environment variables:
 *   DATABASE_URL       - PostgreSQL connection string (required)
 *   LITELLM_BASE_URL   - LiteLLM proxy URL
 *   LITELLM_MASTER_KEY - LiteLLM admin API key
 *   RESEND_API_KEY     - Resend email API key
 *   POLL_INTERVAL_MS   - Polling interval in ms (default: 30000)
 */

// The provisioning module uses @/ path aliases which resolve via tsconfig.
// For standalone script execution, tsx handles this automatically.

const POLL_INTERVAL_MS = parseInt(
  process.env.POLL_INTERVAL_MS ?? "30000",
  10,
);

async function main(): Promise<void> {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  console.info(
    JSON.stringify({
      level: "info",
      msg: "Provisioning worker starting",
      pollIntervalMs: POLL_INTERVAL_MS,
    }),
  );

  // Dynamically import to ensure env vars are set before module loads
  const { processProvisioningQueue } = await import("@/lib/provisioning");

  let running = true;

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.info(
      JSON.stringify({
        level: "info",
        msg: "Provisioning worker shutting down",
      }),
    );
    running = false;
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  while (running) {
    try {
      const processedCount = await processProvisioningQueue();

      if (processedCount > 0) {
        console.info(
          JSON.stringify({
            level: "info",
            msg: "Provisioning queue processed",
            processedCount,
          }),
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Provisioning queue processing error",
          error: message,
        }),
      );
    }

    // Sleep before next poll
    if (running) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, POLL_INTERVAL_MS);
        // Allow the timer to not prevent process exit on shutdown
        if (typeof timer === "object" && "unref" in timer) {
          timer.unref();
        }
      });
    }
  }

  // Close the database connection pool
  const { pool } = await import("@/lib/db");
  await pool.end();

  console.info(
    JSON.stringify({
      level: "info",
      msg: "Provisioning worker stopped",
    }),
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Provisioning worker fatal error",
      error: message,
    }),
  );
  process.exit(1);
});
