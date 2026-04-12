"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, CircleX } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md text-center text-gray-400">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
            <CircleX className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Invalid reset link</h1>
          <p className="text-gray-400 mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-300"
          >
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token: token ?? undefined,
      });

      if (authError) {
        setError(authError.message ?? "Failed to reset password. The link may be expired.");
        setLoading(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Failed to reset password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-gray-400 mb-6">Enter your new password below.</p>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-4 text-red-400 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 characters"
                className="w-full rounded-xl pl-11 pr-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Confirm your password"
                className="w-full rounded-xl pl-11 pr-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full px-6 py-3 rounded-xl font-medium text-white border-none transition-all duration-300 flex items-center justify-center gap-2",
              "bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]",
              "disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Reset Password
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
