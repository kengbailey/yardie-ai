"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      setSubmitted(true);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] text-center">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <CircleCheck className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 mb-6">
            If an account exists for <span className="text-white font-medium">{email}</span>,
            we sent a password reset link. Please check your inbox.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary-light hover:text-primary transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white mb-2">Forgot your password?</h1>
        <p className="text-gray-400 mb-6">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

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
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
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
              "Send Reset Link"
            )}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-primary-light hover:text-primary transition-colors font-medium text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
