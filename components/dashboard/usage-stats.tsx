import { Coins, MessageSquare, Wallet, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UsageStats } from "@/lib/usage";

interface UsageStatsProps {
  stats: UsageStats;
}

const tierColors: Record<UsageStats["tier"], string> = {
  Free: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  Standard: "bg-primary/20 text-primary-light border-primary/30",
  Pro: "bg-accent/20 text-accent-light border-accent/30",
};

export function UsageStatsGrid({ stats }: UsageStatsProps) {
  const budgetDisplay = `$${stats.budgetRemaining.toFixed(2)} / $${stats.budgetTotal.toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={Coins}
        label="Tokens Used"
        value={stats.tokensUsed.toLocaleString()}
        sublabel="this month"
      />
      <StatCard
        icon={Wallet}
        label="Budget Remaining"
        value={budgetDisplay}
        sublabel="monthly allocation"
      />
      <StatCard
        icon={MessageSquare}
        label="Conversations"
        value={stats.conversationCount.toLocaleString()}
        sublabel="this month"
      />
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm text-gray-400">Subscription Tier</span>
        </div>
        <span
          className={cn(
            "inline-block px-3 py-1 rounded-full text-sm font-medium border",
            tierColors[stats.tier],
          )}
        >
          {stats.tier}
        </span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
    </div>
  );
}
