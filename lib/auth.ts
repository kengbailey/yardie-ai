/**
 * Better Auth server-side configuration.
 *
 * Environment variables:
 *   DATABASE_URL       - PostgreSQL connection string
 *   BETTER_AUTH_SECRET - Secret key for signing sessions/tokens
 *   RESEND_API_KEY     - Resend email service API key
 *   NEXT_PUBLIC_APP_URL - Public URL of the portal (e.g. http://localhost:3000)
 */
import { betterAuth } from "better-auth";
import * as argon2 from "argon2";

import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Resend email transport helper
// ---------------------------------------------------------------------------
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM_EMAIL = "Yardie AI <noreply@yardie.ai>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "RESEND_API_KEY not set. Email not sent.",
        to,
        subject,
      }),
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Better Auth instance
// ---------------------------------------------------------------------------
export const auth = betterAuth({
  database: pool,

  secret: process.env.BETTER_AUTH_SECRET ?? "build-placeholder-not-for-production",

  baseURL: APP_URL,

  // ---------------------------------------------------------------------------
  // Email/password provider
  // ---------------------------------------------------------------------------
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,

    // Argon2id password hashing (memory 65536 = 64 MB, time 3, parallelism 4)
    password: {
      async hash(password: string): Promise<string> {
        return argon2.hash(password, {
          type: argon2.argon2id,
          memoryCost: 65_536,
          timeCost: 3,
          parallelism: 4,
        });
      },

      async verify({
        password,
        hash,
      }: {
        password: string;
        hash: string;
      }): Promise<boolean> {
        return argon2.verify(hash, password);
      },
    },

    // Resend email transport for password reset
    async sendResetPassword({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Reset your Yardie AI password",
        html: `
          <h2>Password Reset</h2>
          <p>Click the link below to reset your password. This link expires in 1 hour.</p>
          <p><a href="${url}">Reset Password</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    },
  },

  // ---------------------------------------------------------------------------
  // Email verification configuration
  // ---------------------------------------------------------------------------
  emailVerification: {
    sendOnSignUp: true,

    async sendVerificationEmail({ user, url }) {
      await sendEmail({
        to: user.email,
        subject: "Verify your Yardie AI account",
        html: `
          <h2>Welcome to Yardie AI</h2>
          <p>Click the link below to verify your email address:</p>
          <p><a href="${url}">Verify Email</a></p>
          <p>If you did not create an account, you can ignore this email.</p>
        `,
      });
    },
  },

  // ---------------------------------------------------------------------------
  // Session configuration
  // ---------------------------------------------------------------------------
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  // ---------------------------------------------------------------------------
  // Cookie configuration
  // ---------------------------------------------------------------------------
  advanced: {
    cookiePrefix: "yardie",
    defaultCookieAttributes: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://localhost"),
      sameSite: "lax" as const,
      path: "/",
    },
  },

  // ---------------------------------------------------------------------------
  // Database hooks (placeholder for provisioning pipeline)
  // ---------------------------------------------------------------------------
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // TODO: Phase 1 -- trigger provisioning pipeline
          // When a user is created and assigned to an instance, we will:
          //   1. Create OpenWebUI account
          //   2. Create LiteLLM virtual key
          //   3. Send welcome email
          console.info(
            JSON.stringify({
              level: "info",
              msg: "User created",
              userId: user.id,
              email: user.email,
            }),
          );
        },
      },
    },
  },
});
