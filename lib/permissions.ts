/**
 * RBAC permission utilities.
 *
 * Provides functions to check user permissions based on global roles
 * and instance-scoped roles stored in PostgreSQL.
 */
import { pool } from "@/lib/db";
import type { InstanceRole, UserPermissions } from "@/lib/types";
import { instanceRoleSchema } from "@/lib/types";

/**
 * Load all permissions for a user from the database.
 *
 * Returns a permissions object containing:
 *   - isSysadmin: whether the user has the global sysadmin role
 *   - instanceRoles: Map of instanceId -> InstanceRole for all assigned instances
 */
export async function getUserPermissions(
  userId: string,
): Promise<UserPermissions> {
  // Run both queries in parallel
  const [globalResult, instanceResult] = await Promise.all([
    pool.query<{ role: string }>(
      `SELECT role FROM global_roles WHERE user_id = $1`,
      [userId],
    ),
    pool.query<{ instance_id: string; role: string }>(
      `SELECT instance_id, role FROM instance_roles WHERE user_id = $1`,
      [userId],
    ),
  ]);

  const hasSysadmin = globalResult.rows.some((row) => row.role === "sysadmin");

  const instanceRoles = new Map<string, InstanceRole>();
  for (const row of instanceResult.rows) {
    const parsed = instanceRoleSchema.safeParse(row.role);
    if (parsed.success) {
      instanceRoles.set(row.instance_id, parsed.data);
    }
  }

  return {
    isSysadmin: hasSysadmin,
    instanceRoles,
  };
}

/**
 * Check if a user can manage a specific instance.
 * Requires: sysadmin OR manager role for that instance.
 */
export function canManageInstance(
  permissions: UserPermissions,
  instanceId: string,
): boolean {
  if (permissions.isSysadmin) {
    return true;
  }
  return permissions.instanceRoles.get(instanceId) === "manager";
}

/**
 * Check if a user can access a specific instance (as user or manager).
 * Requires: sysadmin OR any role (user/manager) for that instance.
 */
export function canAccessInstance(
  permissions: UserPermissions,
  instanceId: string,
): boolean {
  if (permissions.isSysadmin) {
    return true;
  }
  return permissions.instanceRoles.has(instanceId);
}

/**
 * Check if a user is a sysadmin.
 */
export function isSysadmin(permissions: UserPermissions): boolean {
  return permissions.isSysadmin;
}
