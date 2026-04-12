import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { getUserUsageStats } from "@/lib/usage";
import { UsageStatsGrid } from "@/components/dashboard/usage-stats";
import { InstanceLink } from "@/components/dashboard/instance-link";

interface InstanceRow {
  [key: string]: unknown;
  id: string;
  name: string;
  subdomain: string;
  base_url: string;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const { user } = session;

  // Get user's instance assignment
  const instanceRole = await queryOne<{ instance_id: string }>(
    `SELECT instance_id FROM instance_roles WHERE user_id = $1 LIMIT 1`,
    [user.id],
  );

  let instance: InstanceRow | null = null;
  if (instanceRole) {
    instance = await queryOne<InstanceRow>(
      `SELECT id, name, subdomain, base_url FROM instances WHERE id = $1`,
      [instanceRole.instance_id],
    );
  }

  // Get usage stats (placeholder data in Phase 1)
  const usageStats = await getUserUsageStats(user.id);

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Welcome, {user.name}
          </h1>
          <p className="text-gray-400 mt-1">
            Here is an overview of your AI usage and instance access.
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            Instance Access
          </h2>
          <InstanceLink instance={instance} />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-300 mb-4">
            Usage Summary
          </h2>
          <UsageStatsGrid stats={usageStats} />
        </section>
      </div>
    </main>
  );
}
