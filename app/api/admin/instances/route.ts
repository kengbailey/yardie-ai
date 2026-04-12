/**
 * API routes: /api/admin/instances
 *
 * POST - Create a new instance
 * GET  - List all instances
 *
 * All routes require sysadmin role.
 */
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getUserPermissions, isSysadmin } from "@/lib/permissions";

const createInstanceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  subdomain: z
    .string()
    .min(1, "Subdomain is required")
    .max(63)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Subdomain must be lowercase alphanumeric with optional hyphens",
    ),
  base_url: z.string().url("Base URL must be a valid URL"),
});

export async function POST(request: Request): Promise<NextResponse> {
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
    const parsed = createInstanceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "error",
          message: parsed.error.issues[0]?.message ?? "Invalid input",
        },
        { status: 400 },
      );
    }

    const { name, subdomain, base_url } = parsed.data;

    // Check for duplicate subdomain
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM instances WHERE subdomain = $1`,
      [subdomain],
    );

    if (existing) {
      return NextResponse.json(
        { status: "error", message: "Subdomain is already in use" },
        { status: 409 },
      );
    }

    // Generate a UUID for the instance ID
    const id = crypto.randomUUID();

    await queryOne(
      `INSERT INTO instances (id, name, subdomain, base_url, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id`,
      [id, name, subdomain, base_url],
    );

    console.info(
      JSON.stringify({
        level: "info",
        msg: "Instance created",
        instanceId: id,
        name,
        subdomain,
        createdBy: session.user.id,
      }),
    );

    return NextResponse.json(
      { status: "success", id },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to create instance",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}

export async function GET(): Promise<NextResponse> {
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

    const instances = await query<{
      id: string;
      name: string;
      subdomain: string;
      base_url: string;
      status: string;
      user_count: string;
    }>(
      `SELECT i.id, i.name, i.subdomain, i.base_url, i.status,
              COUNT(ir.user_id)::text as user_count
       FROM instances i
       LEFT JOIN instance_roles ir ON ir.instance_id = i.id
       GROUP BY i.id, i.name, i.subdomain, i.base_url, i.status
       ORDER BY i.name`,
    );

    return NextResponse.json(instances);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Failed to list instances",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500 },
    );
  }
}
