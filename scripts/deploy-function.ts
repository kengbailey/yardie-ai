/**
 * Deploy the user-attribution filter function to an OpenWebUI instance.
 *
 * Reads the Python function from openwebui/user-attribution-function.py
 * and deploys it via the OpenWebUI admin API. If the function already
 * exists, it updates it instead.
 *
 * Usage:
 *   npx tsx scripts/deploy-function.ts --url <instance-url> --key <admin-api-key>
 *   npm run deploy:function -- --url http://test.localhost --key sk-admin-key
 *
 * Arguments:
 *   --url  - The base URL of the OpenWebUI instance (required)
 *   --key  - The admin API key for the instance (required)
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
}

function parseArgs(argv: string[]): CliArgs {
  let url = "";
  let key = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--url" && next) {
      url = next;
      i++;
    } else if (arg === "--key" && next) {
      key = next;
      i++;
    }
  }

  if (!url || !key) {
    console.error(
      "Usage: npx tsx scripts/deploy-function.ts --url <instance-url> --key <admin-api-key>",
    );
    console.error("");
    console.error("Example:");
    console.error(
      "  npx tsx scripts/deploy-function.ts --url http://test.localhost --key sk-admin-key",
    );
    process.exit(1);
  }

  // Remove trailing slash from URL
  url = url.replace(/\/+$/, "");

  return { url, key };
}

// ---------------------------------------------------------------------------
// Function definition
// ---------------------------------------------------------------------------

const FUNCTION_ID = "user-attribution";
const FUNCTION_NAME = "User Attribution Filter";
const FUNCTION_TYPE = "filter";

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { url, key } = parseArgs(process.argv.slice(2));

  // Read the Python function source
  const functionPath = resolve(__dirname, "../openwebui/user-attribution-function.py");
  let functionContent: string;
  try {
    functionContent = readFileSync(functionPath, "utf-8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to read function file: ${message}`);
    process.exit(1);
  }

  console.info(`Deploying "${FUNCTION_NAME}" to ${url}...`);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const functionPayload = {
    id: FUNCTION_ID,
    name: FUNCTION_NAME,
    type: FUNCTION_TYPE,
    content: functionContent,
    is_active: true,
    is_global: true,
    meta: {
      description: "Injects user identity into outgoing LLM request metadata for LiteLLM attribution.",
    },
  };

  // Try to create the function first
  const createUrl = `${url}/api/v1/functions/create`;
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(functionPayload),
  });

  if (createResponse.ok) {
    console.info(`Function "${FUNCTION_NAME}" created successfully.`);
    return;
  }

  const createBody = await createResponse.text();

  // If function already exists, update it instead
  if (
    createResponse.status === 400 ||
    createResponse.status === 409 ||
    createBody.includes("already exists")
  ) {
    console.info(
      `Function already exists, updating...`,
    );

    const updateUrl = `${url}/api/v1/functions/id/${FUNCTION_ID}/update`;
    const updateResponse = await fetch(updateUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: FUNCTION_NAME,
        type: FUNCTION_TYPE,
        content: functionContent,
        is_active: true,
        is_global: true,
        meta: {
          description: "Injects user identity into outgoing LLM request metadata for LiteLLM attribution.",
        },
      }),
    });

    if (!updateResponse.ok) {
      const updateBody = await updateResponse.text();
      console.error(
        `Failed to update function (${updateResponse.status}): ${updateBody}`,
      );
      process.exit(1);
    }

    console.info(`Function "${FUNCTION_NAME}" updated successfully.`);
    return;
  }

  // Unexpected error
  console.error(
    `Failed to create function (${createResponse.status}): ${createBody}`,
  );
  process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
