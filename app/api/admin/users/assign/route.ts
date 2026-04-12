/**
 * API route: Assign a user to an instance with a role.
 *
 * POST /api/admin/users/assign
 * Body: { userId, instanceId, role }
 *
 * After creating the instance_role record, enqueues provisioning tasks
 * for the user on that instance. Requires sysadmin or manager role for
 * the target instance.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { pool } from "@/lib/db";
import { assignInstanceRoleInputSchema } from "@/lib/types";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";
import { enqueueProvisioning } from "@/lib/provisioning";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate the request
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, reason: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse and validate input
    const body: unknown = await request.json();
    const parsed = assignInstanceRoleInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          reason: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 },
      );
    }

    const { userId, instanceId, role } = parsed.data;

    // Check permissions: must be sysadmin or manager of the target instance
    const permissions = await getUserPermissions(session.user.id);
    if (!canManageInstance(permissions, instanceId)) {
      return NextResponse.json(
        { success: false, reason: "Insufficient permissions" },
        { status: 403 },
      );
    }

    // Verify the target user exists
    const userResult = await pool.query<{ id: string }>(
      `SELECT id FROM "user" WHERE id = $1`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, reason: "User not found" },
        { status: 404 },
      );
    }

    // Verify the instance exists and is active
    const instanceResult = await pool.query<{ id: string; status: string }>(
      `SELECT id, status FROM instances WHERE id = $1`,
      [instanceId],
    );
    if (instanceResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, reason: "Instance not found" },
        { status: 404 },
      );
    }

    const instance = instanceResult.rows[0];
    if (!instance) {
      return NextResponse.json(
        { success: false, reason: "Instance not found" },
        { status: 404 },
      );
    }

    if (instance.status !== "active") {
      return NextResponse.json(
        { success: false, reason: "Instance is not active" },
        { status: 400 },
      );
    }

    // Create the instance_role record (upsert to handle re-assignment)
    await pool.query(
      `INSERT INTO instance_roles (user_id, instance_id, role, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, instance_id) DO UPDATE SET role = $3`,
      [userId, instanceId, role],
    );

    console.info(
      JSON.stringify({
        level: "info",
        msg: "User assigned to instance",
        userId,
        instanceId,
        role,
        assignedBy: session.user.id,
      }),
    );

    // Enqueue provisioning tasks for the user on this instance
    // This creates OpenWebUI account, LiteLLM key, and sends welcome email
    if (role === "user" || role === "manager") {
      await enqueueProvisioning(userId, instanceId);
    }

    return NextResponse.json(
      {
        success: true,
        reason: "User assigned to instance and provisioning enqueued",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to assign user to instance",
        error: message,
      }),
    );
    return NextResponse.json(
      { success: false, reason: "Internal server error" },
      { status: 500 },
    );
  }
}
