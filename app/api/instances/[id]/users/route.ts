/**
 * API route: GET /api/instances/:id/users
 *
 * Returns all users assigned to the specified instance.
 * Requires: manager of the instance OR sysadmin.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";

interface UserRow {
  [key: string]: unknown;
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: instanceId } = await params;

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

    const users = await query<UserRow>(
      `SELECT ir.user_id, ir.role, u.name, u.email
       FROM instance_roles ir
       JOIN "user" u ON u.id = ir.user_id
       WHERE ir.instance_id = $1
       ORDER BY u.name`,
      [instanceId],
    );

    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to fetch instance users",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}
