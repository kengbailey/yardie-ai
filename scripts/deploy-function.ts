/**
 * Deploy the user-attribution filter function to an OpenWebUI instance.
 *
 * Reads the Python function from openwebui/user-attribution-function.py
 * and deploys it via the OpenWebUI admin API. If the function already
 * exists, it deletes and recreates it. After creation, toggles it
 * active + global and sets the instance_id valve.
 *
 * Usage:
 *   npx tsx scripts/deploy-function.ts --url <instance-url> --key <admin-api-key> --instance <instance-id>
 *
 * Example:
 *   npx tsx scripts/deploy-function.ts --url http://localhost:8081 --key sk-xxx --instance test
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Parse CLI arguments
// ---------------------------------------------------------------------------

interface CliArgs {
  url: string;
  key: string;
  instanceId: string;
}

function parseArgs(argv: string[]): CliArgs {
  let url = "";
  let key = "";
  let instanceId = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--url" && next) {
      url = next;
      i++;
    } else if (arg === "--key" && next) {
      key = next;
      i++;
    } else if (arg === "--instance" && next) {
      instanceId = next;
      i++;
    }
  }

  if (!url || !key || !instanceId) {
    console.error(
      "Usage: npx tsx scripts/deploy-function.ts --url <instance-url> --key <admin-api-key> --instance <instance-id>",
    );
    process.exit(1);
  }

  url = url.replace(/\/+$/, "");
  return { url, key, instanceId };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUNCTION_ID = "user_attribution";
const FUNCTION_NAME = "User Attribution Filter";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { url, key, instanceId } = parseArgs(process.argv.slice(2));

  const functionPath = resolve(
    __dirname,
    "../openwebui/user-attribution-function.py",
  );
  const functionContent = readFileSync(functionPath, "utf-8");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  console.info(`Deploying "${FUNCTION_NAME}" to ${url}...`);

  // Step 1: Delete existing function (if any)
  const deleteResponse = await fetch(
    `${url}/api/v1/functions/id/${FUNCTION_ID}/delete`,
    { method: "DELETE", headers },
  );
  if (deleteResponse.ok) {
    console.info("  Deleted existing function.");
  }

  // Step 2: Create function
  const createResponse = await fetch(`${url}/api/v1/functions/create`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      id: FUNCTION_ID,
      name: FUNCTION_NAME,
      type: "filter",
      content: functionContent,
      meta: {
        description:
          "Injects user identity into the user field for LiteLLM attribution.",
      },
    }),
  });

  if (!createResponse.ok) {
    const body = await createResponse.text();
    console.error(`Failed to create function (${createResponse.status}): ${body}`);
    process.exit(1);
  }

  console.info("  Function created.");

  // Step 3: Toggle active
  const toggleResponse = await fetch(
    `${url}/api/v1/functions/id/${FUNCTION_ID}/toggle`,
    { method: "POST", headers },
  );
  if (!toggleResponse.ok) {
    console.error("  WARNING: Failed to toggle function active.");
  } else {
    console.info("  Toggled active.");
  }

  // Step 4: Toggle global
  const globalResponse = await fetch(
    `${url}/api/v1/functions/id/${FUNCTION_ID}/toggle/global`,
    { method: "POST", headers },
  );
  if (!globalResponse.ok) {
    console.error("  WARNING: Failed to toggle function global.");
  } else {
    console.info("  Toggled global.");
  }

  // Step 5: Set valves (instance_id)
  const valvesResponse = await fetch(
    `${url}/api/v1/functions/id/${FUNCTION_ID}/valves/update`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ priority: 0, instance_id: instanceId }),
    },
  );
  if (!valvesResponse.ok) {
    console.error("  WARNING: Failed to set valves.");
  } else {
    console.info(`  Valves set: instance_id="${instanceId}".`);
  }

  console.info("Done.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
