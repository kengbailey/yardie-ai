/**
 * Internal API endpoint for RBAC role checks.
 * Called by middleware to verify user roles without importing pg in Edge Runtime.
 *
 * Security note: This endpoint is called by the middleware during request
 * processing. It only returns a boolean "allowed" response and requires a
 * valid userId (UUID). In production, consider adding an internal shared
 * secret header for additional protection.
 *
 * Query parameters:
 *   userId     - The user ID to check
 *   check      - "sysadmin" or "instance"
 *   instanceId - Required when check=instance
 *   roles      - Comma-separated roles when check=instance (e.g. "manager")
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { pool } from "@/lib/db";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const check = searchParams.get("check");

    if (!userId || !check) {
      return NextResponse.json({ allowed: false }, { status: 400 });
    }

    if (check === "sysadmin") {
      const result = await pool.query(
        `SELECT 1 FROM global_roles WHERE user_id = $1 AND role = 'sysadmin' LIMIT 1`,
        [userId],
      );
      return NextResponse.json({ allowed: result.rows.length > 0 });
    }

    if (check === "instance") {
      const instanceId = searchParams.get("instanceId");
      const rolesParam = searchParams.get("roles");

      if (!instanceId || !rolesParam) {
        return NextResponse.json({ allowed: false }, { status: 400 });
      }

      const roles = rolesParam.split(",").filter(Boolean);

      const result = await pool.query(
        `SELECT 1 FROM instance_roles WHERE user_id = $1 AND instance_id = $2 AND role = ANY($3) LIMIT 1`,
        [userId, instanceId, roles],
      );
      return NextResponse.json({ allowed: result.rows.length > 0 });
    }

    return NextResponse.json({ allowed: false }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Role check failed",
        error: message,
      }),
    );
    return NextResponse.json({ allowed: false }, { status: 500 });
  }
}
