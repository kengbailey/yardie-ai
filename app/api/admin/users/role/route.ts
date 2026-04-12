/**
 * API route: PUT /api/admin/users/role
 *
 * Updates a user's role for a specific instance.
 * Requires sysadmin role.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { getUserPermissions, isSysadmin } from "@/lib/permissions";
import { instanceRoleSchema } from "@/lib/types";

const updateRoleSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  instanceId: z.string().min(1, "instanceId is required"),
  role: instanceRoleSchema,
});

export async function PUT(request: Request): Promise<NextResponse> {
  try {
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

    if (!isSysadmin(permissions)) {
      return NextResponse.json(
        { status: "error", message: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { userId, instanceId, role } = parsed.data;

    // Verify the assignment exists
    const existing = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM instance_roles WHERE user_id = $1 AND instance_id = $2`,
      [userId, instanceId],
    );

    if (!existing) {
      return NextResponse.json(
        { status: "error", message: "User is not assigned to this instance" },
        { status: 404 },
      );
    }

    // Update the role
    await queryOne(
      `UPDATE instance_roles SET role = $1 WHERE user_id = $2 AND instance_id = $3 RETURNING user_id`,
      [role, userId, instanceId],
    );

    console.info(
      JSON.stringify({
        level: "info",
        msg: "User role updated",
        userId,
        instanceId,
        role,
        updatedBy: session.user.id,
      }),
    );

    return NextResponse.json({
      status: "success",
      message: `Role updated to ${role}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to update user role",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}
