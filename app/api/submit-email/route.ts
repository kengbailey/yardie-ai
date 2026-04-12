import { NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { emailSubmissionSchema } from "@/lib/types";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    let body: Record<string, unknown>;

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await request.text();
      const params = new URLSearchParams(text);
      body = Object.fromEntries(params);
    } else {
      // Try JSON first, fall back to form-urlencoded
      try {
        body = await request.json();
      } catch {
        const text = await request.text();
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params);
      }
    }

    const result = emailSubmissionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { status: "error", message: "Valid email required" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
      );
    }

    await pool.query("INSERT INTO emails (email) VALUES ($1)", [
      result.data.email,
    ]);

    return NextResponse.json(
      { status: "success" },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      JSON.stringify({
        level: "error",
        msg: "Error processing email submission",
        error: message,
      }),
    );
    return NextResponse.json(
      { status: "error", message: "Server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
