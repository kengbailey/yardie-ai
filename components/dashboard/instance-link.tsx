import { ExternalLink, AlertCircle } from "lucide-react";
import type { Instance } from "@/lib/types";

interface InstanceLinkProps {
  instance: Pick<Instance, "name" | "subdomain" | "base_url"> | null;
}

export function InstanceLink({ instance }: InstanceLinkProps) {
  if (!instance) {
    return (
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3 text-gray-500">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            No instance assigned — contact your administrator
          </p>
        </div>
      </div>
    );
  }

  const displayUrl = `${instance.subdomain}.yardie.ai`;

  return (
    <a
      href={instance.base_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:border-primary/50 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.2)]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">Your Instance</p>
          <p className="text-lg font-bold text-white">{instance.name}</p>
          <p className="text-sm text-primary-light mt-1">{displayUrl}</p>
        </div>
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
          <ExternalLink className="w-5 h-5 text-white" />
        </div>
      </div>
    </a>
  );
}
