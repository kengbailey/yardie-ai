/**
 * API route: PUT /api/instances/:id/users/:userId/budget
 *
 * Updates the budget for a user in an instance.
 * Requires: manager of the instance OR sysadmin.
 *
 * Phase 1: Logs the budget update. LiteLLM Admin API integration comes in task 10.3.
 * Future: Will call LiteLLM Admin API to update the virtual key's max_budget.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";

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

    // Phase 1: Log the budget update
    // TODO: Call LiteLLM Admin API to update virtual key max_budget
    // Example future call:
    //   PUT /key/update { key: userVirtualKey, max_budget: budget }
    console.info(
      JSON.stringify({
        level: "info",
        msg: "Budget update requested",
        instanceId,
        userId,
        budget,
        updatedBy: session.user.id,
      }),
    );

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
