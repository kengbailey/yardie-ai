import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { AssignUserForm } from "@/components/admin/assign-user-form";

interface UserWithRoles {
  [key: string]: unknown;
  id: string;
  name: string;
  email: string;
  instances: string;
  roles: string;
}

interface InstanceOption {
  [key: string]: unknown;
  id: string;
  name: string;
}

export default async function AdminUsersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Get all users with their instance assignments
  const users = await query<UserWithRoles>(
    `SELECT u.id, u.name, u.email,
            COALESCE(STRING_AGG(DISTINCT i.name, ', '), '') as instances,
            COALESCE(STRING_AGG(DISTINCT ir.role, ', '), '') as roles
     FROM "user" u
     LEFT JOIN instance_roles ir ON ir.user_id = u.id
     LEFT JOIN instances i ON i.id = ir.instance_id
     GROUP BY u.id, u.name, u.email
     ORDER BY u.name`,
  );

  // Get available instances for the assignment form
  const instances = await query<InstanceOption>(
    `SELECT id, name FROM instances WHERE status = 'active' ORDER BY name`,
  );

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white">Users</h1>
        </div>

        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Email
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Instance(s)
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Role(s)
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {user.instances || (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {user.roles || (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <AssignUserForm
                          userId={user.id}
                          userName={user.name}
                          instances={instances}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
