"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Server, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewInstancePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          subdomain,
          base_url: baseUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Failed to create instance");
        setLoading(false);
        return;
      }

      router.push("/admin/instances");
    } catch {
      setError("Failed to create instance");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/admin/instances"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Instances
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Server className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Add Instance</h1>
        </div>

        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Instance Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Cornwall AI"
                className="w-full rounded-xl px-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
              />
            </div>

            <div>
              <label
                htmlFor="subdomain"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Subdomain
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(e) =>
                    setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  required
                  placeholder="e.g. cornwall"
                  className="flex-1 rounded-xl px-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
                />
                <span className="text-sm text-gray-500 whitespace-nowrap">
                  .yardie.ai
                </span>
              </div>
            </div>

            <div>
              <label
                htmlFor="base_url"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Base URL
              </label>
              <input
                id="base_url"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                required
                placeholder="https://cornwall.yardie.ai"
                className="w-full rounded-xl px-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
              />
              <p className="text-xs text-gray-500 mt-1">
                The URL where the OpenWebUI instance is accessible.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full px-6 py-3 rounded-xl font-medium text-white border-none transition-all duration-300 flex items-center justify-center gap-2",
                "bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]",
                "disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed",
              )}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Create Instance
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
