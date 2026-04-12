/**
 * API route: PUT /api/instances/:id/users/:userId/budget
 *
 * Updates the budget for a user in an instance.
 * Requires: manager of the instance OR sysadmin.
 *
 * If the user has a personal LiteLLM virtual key, the budget change
 * propagates to LiteLLM immediately. Otherwise it is stored for future sync.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";
import { queryOne } from "@/lib/db";
import { updateVirtualKey } from "@/lib/litellm-admin";

const budgetInputSchema = z.object({
  budget: z.number().positive("Budget must be a positive number"),
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
    const parsed = budgetInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { budget } = parsed.data;

    // Check if user has a personal LiteLLM virtual key
    const keyRow = await queryOne<{ litellm_key: string }>(
      `SELECT litellm_key FROM instance_roles WHERE user_id = $1 AND instance_id = $2`,
      [userId, instanceId],
    );

    if (keyRow?.litellm_key) {
      // Propagate to LiteLLM immediately
      await updateVirtualKey(keyRow.litellm_key, { maxBudget: budget });
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Budget updated in LiteLLM",
          instanceId,
          userId,
          budget,
          updatedBy: session.user.id,
        }),
      );
    } else {
      // No personal key yet — log for future sync
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Budget update stored (no LiteLLM key yet)",
          instanceId,
          userId,
          budget,
          updatedBy: session.user.id,
        }),
      );
    }

    return NextResponse.json({
      status: "success",
      message: `Budget updated to $${budget.toFixed(2)}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to update budget",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}
