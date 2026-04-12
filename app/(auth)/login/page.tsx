"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        setError(authError.message ?? "Invalid email or password");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Invalid email or password");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)]">
        <h1 className="text-2xl font-bold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400 mb-6">Sign in to your account</p>

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

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                className="w-full rounded-xl pl-11 pr-4 py-3 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)]"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm text-primary-light hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
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
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary-light hover:text-primary transition-colors font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
