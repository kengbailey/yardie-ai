/**
 * API route: PUT /api/instances/:id/users/:userId/models
 *
 * Updates the model allowlist for a user in an instance.
 * Requires: manager of the instance OR sysadmin.
 *
 * Phase 1: Logs the model update. LiteLLM Admin API integration comes later.
 * Future: Will call LiteLLM Admin API to update the virtual key's model list.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";

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

    // Phase 1: Log the model update
    // TODO: Call LiteLLM Admin API to update virtual key model list
    // Example future call:
    //   PUT /key/update { key: userVirtualKey, models: models }
    console.info(
      JSON.stringify({
        level: "info",
        msg: "Model access update requested",
        instanceId,
        userId,
        models,
        updatedBy: session.user.id,
      }),
    );

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
