"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function Nav() {
  const { data: session } = authClient.useSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-dark-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <Link href="/" className="text-xl font-bold">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Yardie
          </span>
          <span className="text-white">AI</span>
        </Link>

        <div>
          {session?.user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm text-white bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-300"
            >
              Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl font-medium text-sm text-white bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-300"
            >
              Sign In
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
