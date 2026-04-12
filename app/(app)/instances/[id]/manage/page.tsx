import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getUserPermissions, canManageInstance } from "@/lib/permissions";
import { UserTable } from "@/components/instance/user-table";
import type { InstanceUser } from "@/components/instance/user-table";

interface InstanceRow {
  [key: string]: unknown;
  id: string;
  name: string;
  subdomain: string;
  base_url: string;
  status: string;
}

interface UserRow {
  [key: string]: unknown;
  user_id: string;
  name: string;
  email: string;
  role: string;
}

export default async function InstanceManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: instanceId } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const permissions = await getUserPermissions(session.user.id);

  if (!canManageInstance(permissions, instanceId)) {
    redirect("/unauthorized");
  }

  const instance = await queryOne<InstanceRow>(
    `SELECT id, name, subdomain, base_url, status FROM instances WHERE id = $1`,
    [instanceId],
  );

  if (!instance) {
    notFound();
  }

  const userRows = await query<UserRow>(
    `SELECT ir.user_id, ir.role, u.name, u.email
     FROM instance_roles ir
     JOIN "user" u ON u.id = ir.user_id
     WHERE ir.instance_id = $1
     ORDER BY u.name`,
    [instanceId],
  );

  // Map to UserTable format with placeholder budget data (Phase 1)
  const users: InstanceUser[] = userRows.map((row) => ({
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role as "user" | "manager",
    budgetUsed: 0,
    budgetTotal: 1.0,
    status: "active" as const,
  }));

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {instance.name}
                </h1>
                <p className="text-sm text-gray-400">
                  {instance.subdomain}.yardie.ai
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              {users.length} {users.length === 1 ? "user" : "users"}
            </span>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            Instance Users
          </h2>
          <UserTable instanceId={instanceId} users={users} />
        </section>
      </div>
    </main>
  );
}
