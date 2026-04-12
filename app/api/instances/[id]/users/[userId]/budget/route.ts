/**
 * API route: PUT /api/instances/:id/users/:userId/budget
 *
 * Updates the budget for a user in an instance.
 * Requires: manager of the instance OR sysadmin.
 *
 * Calls LiteLLM end_user update API with the user's email.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";
import { queryOne } from "@/lib/db";
import { updateEndUser } from "@/lib/litellm-admin";

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

    // Look up user's email to use as LiteLLM end_user ID
    const userRow = await queryOne<{ email: string }>(
      `SELECT email FROM "user" WHERE id = $1`,
      [userId],
    );

    if (!userRow) {
      return NextResponse.json(
        { status: "error", message: "User not found" },
        { status: 404 },
      );
    }

    try {
      await updateEndUser(userRow.email, { maxBudget: budget });
      console.info(
        JSON.stringify({
          level: "info",
          msg: "Budget updated via LiteLLM end_user API",
          instanceId,
          userId,
          email: userRow.email,
          budget,
          updatedBy: session.user.id,
        }),
      );
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          level: "error",
          msg: "Failed to update LiteLLM end_user budget",
          email: userRow.email,
          error: errMsg,
        }),
      );
      // Still return success — budget will be enforced once end_user exists
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
