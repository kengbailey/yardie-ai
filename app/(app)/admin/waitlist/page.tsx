import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { auth } from "@/lib/auth";
import { query } from "@/lib/db";

interface WaitlistRow {
  [key: string]: unknown;
  id: number;
  email: string;
  submitted_at: string;
}

export default async function AdminWaitlistPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  const emails = await query<WaitlistRow>(
    `SELECT id, email, submitted_at FROM emails ORDER BY submitted_at DESC`,
  );

  return (
    <main className="min-h-screen px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Waitlist</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary-light border border-primary/30">
              {emails.length} {emails.length === 1 ? "email" : "emails"}
            </span>
          </div>
        </div>

        <div className="bg-[rgba(40,40,40,0.9)] backdrop-blur-[10px] border border-white/15 rounded-2xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.5),0_2px_4px_-1px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Email
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Submitted
                  </th>
                  <th className="px-6 py-4 text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No waitlist submissions yet.
                    </td>
                  </tr>
                ) : (
                  emails.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-white font-medium">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {entry.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(entry.submitted_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          disabled
                          className="text-sm text-gray-500 cursor-not-allowed"
                          title="Invite functionality will be available after user provisioning is complete"
                        >
                          Invite (coming soon)
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
