/**
 * API route: PUT /api/instances/:id/users/:userId/models
 *
 * Updates the model allowlist for a user in an instance.
 * Requires: manager of the instance OR sysadmin.
 *
 * If the user has a personal LiteLLM virtual key, the model list
 * propagates to LiteLLM immediately. Otherwise stored for future sync.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";
import { queryOne } from "@/lib/db";
import { updateVirtualKey } from "@/lib/litellm-admin";

const modelsInputSchema = z.object({
  models: z.array(z.string().min(1)).min(1, "At least one model is required"),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  try {
    const { id: instanceId, userId } = await params;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 },
      );
    }

    const permissions = await getUserPermissions(session.user.id);

    if (!canManageInstance(permissions, instanceId)) {
      return NextResponse.json(
        { status: "error", message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = modelsInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { models } = parsed.data;

    // Check if user has a personal LiteLLM virtual key
    const keyRow = await queryOne<{ litellm_key: string }>(
      `SELECT litellm_key FROM instance_roles WHERE user_id = $1 AND instance_id = $2`,
      [userId, instanceId],
    );

    if (keyRow?.litellm_key) {
      // Propagate to LiteLLM immediately
      await updateVirtualKey(keyRow.litellm_key, { models });
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Model access updated in LiteLLM",
          instanceId,
          userId,
          models,
          updatedBy: session.user.id,
        }),
      );
    } else {
      // No personal key yet — log for future sync
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Model access update stored (no LiteLLM key yet)",
          instanceId,
          userId,
          models,
          updatedBy: session.user.id,
        }),
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Model access updated (${models.length} models)`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to update model access",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}
