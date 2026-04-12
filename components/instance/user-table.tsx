"use client";

import { useState } from "react";
import { Loader2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InstanceUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "manager";
  budgetUsed: number;
  budgetTotal: number;
  status: "active" | "pending";
}

interface UserTableProps {
  instanceId: string;
  users: InstanceUser[];
}

export function UserTable({ instanceId, users: initialUsers }: UserTableProps) {
  const [users, setUsers] = useState<InstanceUser[]>(initialUsers);

  return (
    <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] overflow-hidden">
      <div className="overflow-x-auto">
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
                Role
              </th>
              <th className="px-6 py-4 text-sm font-medium text-gray-400">
                Budget (Used / Total)
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
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No users assigned to this instance.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  instanceId={instanceId}
                  user={user}
                  onBudgetUpdate={(userId, newBudget) => {
                    setUsers((prev) =>
                      prev.map((u) =>
                        u.id === userId ? { ...u, budgetTotal: newBudget } : u,
                      ),
                    );
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRow({
  instanceId,
  user,
  onBudgetUpdate,
}: {
  instanceId: string;
  user: InstanceUser;
  onBudgetUpdate: (userId: string, newBudget: number) => void;
}) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetValue, setBudgetValue] = useState(
    user.budgetTotal.toFixed(2),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveBudget() {
    const budget = parseFloat(budgetValue);
    if (isNaN(budget) || budget <= 0) {
      setError("Budget must be a positive number");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/instances/${instanceId}/users/${user.id}/budget`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budget }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        setError(data.message ?? "Failed to update budget");
        setSaving(false);
        return;
      }

      onBudgetUpdate(user.id, budget);
      setEditingBudget(false);
    } catch {
      setError("Failed to update budget");
    } finally {
      setSaving(false);
    }
  }

  async function updateModels(models: string[]) {
    try {
      await fetch(
        `/api/instances/${instanceId}/users/${user.id}/models`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ models }),
        },
      );
    } catch {
      // Silently fail for now -- model management is a placeholder
    }
  }

  return (
    <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <td className="px-6 py-4 text-sm text-white font-medium">
        {user.name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-300">{user.email}</td>
      <td className="px-6 py-4">
        <span
          className={cn(
            "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border",
            user.role === "manager"
              ? "bg-accent/20 text-accent-light border-accent/30"
              : "bg-primary/20 text-primary-light border-primary/30",
          )}
        >
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 text-sm">
        {editingBudget ? (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              className="w-24 rounded-lg px-2 py-1 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white text-sm focus:outline-none focus:border-primary"
              disabled={saving}
            />
            <button
              onClick={saveBudget}
              disabled={saving}
              className="p-1 rounded-lg hover:bg-white/10 text-green-400 transition-colors disabled:opacity-50"
              aria-label="Save budget"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => {
                setEditingBudget(false);
                setBudgetValue(user.budgetTotal.toFixed(2));
                setError("");
              }}
              disabled={saving}
              className="p-1 rounded-lg hover:bg-white/10 text-red-400 transition-colors disabled:opacity-50"
              aria-label="Cancel edit"
            >
              <X className="w-4 h-4" />
            </button>
            {error && (
              <span className="text-xs text-red-400">{error}</span>
            )}
          </div>
        ) : (
          <button
            onClick={() => setEditingBudget(true)}
            className="text-gray-300 hover:text-white transition-colors"
          >
            ${user.budgetUsed.toFixed(2)} / ${user.budgetTotal.toFixed(2)}
          </button>
        )}
      </td>
      <td className="px-6 py-4">
        <span
          className={cn(
            "inline-block px-2.5 py-0.5 rounded-full text-xs font-medium border",
            user.status === "active"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
          )}
        >
          {user.status}
        </span>
      </td>
      <td className="px-6 py-4">
        <button
          onClick={() =>
            updateModels(["meta-llama/llama-3.1-70b-instruct"])
          }
          className="text-sm text-primary-light hover:text-primary transition-colors"
        >
          Set Models
        </button>
      </td>
    </tr>
  );
}
