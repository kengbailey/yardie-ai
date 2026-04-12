"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignUserFormProps {
  userId: string;
  userName: string;
  instances: { id: string; name: string }[];
}

export function AssignUserForm({
  userId,
  userName,
  instances,
}: AssignUserFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [instanceId, setInstanceId] = useState("");
  const [role, setRole] = useState<"user" | "manager">("user");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!instanceId) {
      setError("Please select an instance");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/users/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, instanceId, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Failed to assign user");
        setLoading(false);
        return;
      }

      setOpen(false);
      setInstanceId("");
      setRole("user");
      router.refresh();
    } catch {
      setError("Failed to assign user");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-primary-light hover:text-primary transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Assign
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgba(40,40,40,0.95)] border border-white/15 rounded-2xl p-6 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.5)] w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            Assign {userName}
          </h3>
          <button
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="assign-instance"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Instance
            </label>
            <select
              id="assign-instance"
              value={instanceId}
              onChange={(e) => setInstanceId(e.target.value)}
              className="w-full rounded-xl px-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
            >
              <option value="">Select an instance</option>
              {instances.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="assign-role"
              className="block text-sm font-medium text-gray-300 mb-1.5"
            >
              Role
            </label>
            <select
              id="assign-role"
              value={role}
              onChange={(e) => setRole(e.target.value as "user" | "manager")}
              className="w-full rounded-xl px-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
            >
              <option value="user">User</option>
              <option value="manager">Manager</option>
            </select>
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
              "Assign to Instance"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
