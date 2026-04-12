/**
 * LiteLLM Admin API client wrapper.
 *
 * Provides typed functions for managing virtual keys, budgets, and usage
 * via the LiteLLM proxy's admin API.
 *
 * Environment variables:
 *   LITELLM_BASE_URL  - LiteLLM proxy URL (default: http://litellm:4000 in Docker, http://localhost:4000 for dev)
 *   LITELLM_MASTER_KEY - Master API key for admin operations
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const LITELLM_BASE_URL =
  process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY ?? "";

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

const createKeyResponseSchema = z.object({
  key: z.string(),
  key_name: z.string().nullable().optional(),
  expires: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  max_budget: z.number().nullable().optional(),
  token: z.string().optional(),
});

export type CreateKeyResponse = z.infer<typeof createKeyResponseSchema>;

const keyInfoResponseSchema = z.object({
  key: z.string().optional(),
  key_name: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
  max_budget: z.number().nullable().optional(),
  spend: z.number().nullable().optional(),
  models: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type KeyInfoResponse = z.infer<typeof keyInfoResponseSchema>;

const keySpendResponseSchema = z.object({
  spend: z.number(),
  max_budget: z.number().nullable().optional(),
});

export type KeySpendResponse = z.infer<typeof keySpendResponseSchema>;

const updateKeyResponseSchema = z.object({
  key: z.string().optional(),
  key_name: z.string().nullable().optional(),
  max_budget: z.number().nullable().optional(),
  models: z.array(z.string()).optional(),
});

export type UpdateKeyResponse = z.infer<typeof updateKeyResponseSchema>;

const deleteKeyResponseSchema = z.object({
  deleted_keys: z.array(z.string()).optional(),
});

export type DeleteKeyResponse = z.infer<typeof deleteKeyResponseSchema>;

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class LiteLLMAdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = "LiteLLMAdminError";
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getHeaders(): Record<string, string> {
  if (!LITELLM_MASTER_KEY) {
    throw new LiteLLMAdminError(
      "LITELLM_MASTER_KEY environment variable is not set",
      0,
      "",
    );
  }
  return {
    Authorization: `Bearer ${LITELLM_MASTER_KEY}`,
    "Content-Type": "application/json",
  };
}

async function litellmFetch(
  path: string,
  options: RequestInit,
): Promise<Response> {
  const url = `${LITELLM_BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new LiteLLMAdminError(
      `LiteLLM API error at ${path} (${response.status})`,
      response.status,
      body,
    );
  }

  return response;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CreateVirtualKeyParams {
  userId: string;
  models?: string[];
  maxBudget: number;
  metadata?: Record<string, unknown>;
  keyAlias?: string;
}

/**
 * Create a new LiteLLM virtual key for a user.
 * POST /key/generate
 */
export async function createVirtualKey(
  params: CreateVirtualKeyParams,
): Promise<CreateKeyResponse> {
  const body: Record<string, unknown> = {
    user_id: params.userId,
    max_budget: params.maxBudget,
  };

  if (params.models && params.models.length > 0) {
    body.models = params.models;
  }
  if (params.metadata) {
    body.metadata = params.metadata;
  }
  if (params.keyAlias) {
    body.key_alias = params.keyAlias;
  }

  const response = await litellmFetch("/key/generate", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json();
  const parsed = createKeyResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LiteLLMAdminError(
      `Unexpected response from /key/generate: ${parsed.error.message}`,
      response.status,
      JSON.stringify(data),
    );
  }

  return parsed.data;
}

export interface UpdateVirtualKeyParams {
  models?: string[];
  maxBudget?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Update an existing LiteLLM virtual key.
 * POST /key/update
 */
export async function updateVirtualKey(
  keyId: string,
  params: UpdateVirtualKeyParams,
): Promise<UpdateKeyResponse> {
  const body: Record<string, unknown> = { key: keyId };

  if (params.models !== undefined) {
    body.models = params.models;
  }
  if (params.maxBudget !== undefined) {
    body.max_budget = params.maxBudget;
  }
  if (params.metadata !== undefined) {
    body.metadata = params.metadata;
  }

  const response = await litellmFetch("/key/update", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data: unknown = await response.json();
  const parsed = updateKeyResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LiteLLMAdminError(
      `Unexpected response from /key/update: ${parsed.error.message}`,
      response.status,
      JSON.stringify(data),
    );
  }

  return parsed.data;
}

/**
 * Delete a LiteLLM virtual key.
 * POST /key/delete
 */
export async function deleteVirtualKey(
  keyId: string,
): Promise<DeleteKeyResponse> {
  const response = await litellmFetch("/key/delete", {
    method: "POST",
    body: JSON.stringify({ keys: [keyId] }),
  });

  const data: unknown = await response.json();
  const parsed = deleteKeyResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LiteLLMAdminError(
      `Unexpected response from /key/delete: ${parsed.error.message}`,
      response.status,
      JSON.stringify(data),
    );
  }

  return parsed.data;
}

/**
 * Get information about a LiteLLM virtual key.
 * GET /key/info
 */
export async function getKeyInfo(keyId: string): Promise<KeyInfoResponse> {
  const response = await litellmFetch(`/key/info?key=${encodeURIComponent(keyId)}`, {
    method: "GET",
  });

  const data: unknown = await response.json();
  const parsed = keyInfoResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LiteLLMAdminError(
      `Unexpected response from /key/info: ${parsed.error.message}`,
      response.status,
      JSON.stringify(data),
    );
  }

  return parsed.data;
}

/**
 * Get spend information for a virtual key.
 * GET /global/spend?api_key=<key>
 */
export async function getKeySpend(keyId: string): Promise<KeySpendResponse> {
  const response = await litellmFetch(
    `/global/spend?api_key=${encodeURIComponent(keyId)}`,
    { method: "GET" },
  );

  const data: unknown = await response.json();
  const parsed = keySpendResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new LiteLLMAdminError(
      `Unexpected response from /global/spend: ${parsed.error.message}`,
      response.status,
      JSON.stringify(data),
    );
  }

  return parsed.data;
}
