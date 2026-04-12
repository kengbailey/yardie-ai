import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Server, Users, Mail, DollarSign, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

interface CountRow {
  [key: string]: unknown;
  count: string;
}

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  // Fetch aggregate counts in parallel
  const [instanceCount, userCount, waitlistCount] = await Promise.all([
    queryOne<CountRow>(`SELECT COUNT(*) as count FROM instances`),
    queryOne<CountRow>(`SELECT COUNT(*) as count FROM "user"`),
    queryOne<CountRow>(`SELECT COUNT(*) as count FROM emails`),
  ]);

  const stats = {
    instances: parseInt(instanceCount?.count ?? "0", 10),
    users: parseInt(userCount?.count ?? "0", 10),
    waitlist: parseInt(waitlistCount?.count ?? "0", 10),
  };

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Global platform management and overview.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <SummaryCard
            icon={Server}
            label="Total Instances"
            value={stats.instances.toString()}
          />
          <SummaryCard
            icon={Users}
            label="Total Users"
            value={stats.users.toString()}
          />
          <SummaryCard
            icon={Mail}
            label="Waitlist Emails"
            value={stats.waitlist.toString()}
          />
          <SummaryCard
            icon={DollarSign}
            label="Total Spend"
            value="$0.00"
            sublabel="LiteLLM not connected"
          />
        </div>

        {/* Navigation cards */}
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NavCard
            href="/admin/instances"
            title="Instances"
            description="Manage OpenWebUI instances, create new ones, view status"
            icon={Server}
          />
          <NavCard
            href="/admin/users"
            title="Users"
            description="View all users, assign to instances, manage roles"
            icon={Users}
          />
          <NavCard
            href="/admin/waitlist"
            title="Waitlist"
            description="View email submissions and invite users"
            icon={Mail}
          />
        </div>
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sublabel && (
        <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
      )}
    </div>
  );
}

function NavCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="block bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:border-primary/50 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.2)]"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-400 mt-2">{description}</p>
        </div>
        <ArrowRight className="w-5 h-5 text-gray-500 shrink-0 mt-1" />
      </div>
    </Link>
  );
}
