"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md text-center text-gray-400">Verifying...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verify() {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        const { error } = await authClient.verifyEmail({ query: { token } });

        if (error) {
          setStatus("error");
          setMessage(error.message ?? "Verification failed. The link may be expired or invalid.");
        } else {
          setStatus("success");
          setMessage("Your email has been verified successfully.");
        }
      } catch {
        setStatus("error");
        setMessage("Verification failed. The link may be expired or invalid.");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl p-8 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Verifying your email</h1>
            <p className="text-gray-400">Please wait...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <CircleCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Email verified</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] transition-all duration-300"
            >
              Sign in to your account
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-500/10 border border-red-500/30">
              <CircleX className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Verification failed</h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <Link
              href="/login"
              className="text-primary-light hover:text-primary transition-colors font-medium text-sm"
            >
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
