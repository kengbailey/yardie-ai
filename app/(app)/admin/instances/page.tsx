import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";
import { cn } from "@/lib/utils";

interface InstanceRow {
  [key: string]: unknown;
  id: string;
  name: string;
  subdomain: string;
  status: string;
  user_count: string;
}

export default async function AdminInstancesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const instances = await query<InstanceRow>(
    `SELECT i.id, i.name, i.subdomain, i.status,
            COUNT(ir.user_id)::text as user_count
     FROM instances i
     LEFT JOIN instance_roles ir ON ir.instance_id = i.id
     GROUP BY i.id, i.name, i.subdomain, i.status
     ORDER BY i.name`,
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
          <h1 className="text-2xl font-bold text-white">Instances</h1>
          <Link
            href="/admin/instances/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm text-white bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            Add Instance
          </Link>
        </div>

        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Subdomain
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Users
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {instances.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No instances created yet.
                    </td>
                  </tr>
                ) : (
                  instances.map((instance) => (
                    <tr
                      key={instance.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        {instance.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {instance.subdomain}.yardie.ai
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {instance.user_count}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            instance.status === "active"
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : instance.status === "provisioning"
                                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30",
                          )}
                        >
                          {instance.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/instances/${instance.id}/manage`}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-primary transition-colors"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Manage
                        </Link>
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
