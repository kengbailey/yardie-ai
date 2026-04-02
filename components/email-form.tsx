"use client";

import { useState, type FormEvent } from "react";
import { CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmailForm() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [email, setEmail] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;

    setStatus("submitting");

    try {
      const res = await fetch("/api/submit-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        alert("There was an error submitting your email. Please try again.");
        setStatus("idle");
      }
    } catch {
      setStatus("error");
      alert("There was an error submitting your email. Please try again.");
      setStatus("idle");
    }
  }

  const isSuccess = status === "success";
  const isSubmitting = status === "submitting";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div>
        <input
          type="email"
          name="email"
          placeholder="Your Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSuccess}
          required
          className="w-full rounded-xl px-6 py-4 bg-[rgba(30,30,30,0.7)] border border-white/10 text-white transition-all duration-300 focus:outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(99,102,241,0.3)] disabled:bg-[rgba(20,20,20,0.5)] disabled:border-white/5 disabled:text-white/40 disabled:cursor-not-allowed"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || isSuccess}
        className={cn(
          "w-full px-8 py-4 rounded-xl font-medium text-lg text-white border-none transition-all duration-300",
          isSuccess
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-default"
            : "bg-gradient-to-br from-primary to-accent hover:-translate-y-0.5 hover:shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)] disabled:opacity-70 disabled:hover:translate-y-0"
        )}
      >
        {isSubmitting
          ? "Submitting..."
          : isSuccess
            ? "\u2713 Added to List!"
            : "Join Waiting List"}
      </button>
      <div
        className={cn(
          "text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center font-medium flex items-center justify-center gap-2 transition-all duration-300",
          isSuccess
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2.5 hidden"
        )}
      >
        <CircleCheck className="w-5 h-5" />
        Thanks! We&apos;ll be in touch soon.
      </div>
      <p className="text-gray-400 text-sm mt-4 text-center">
        We&apos;ll send you updates about our launch. No spam, unsubscribe
        anytime.
      </p>
    </form>
  );
}
