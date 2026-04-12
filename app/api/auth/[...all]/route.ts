/**
 * Better Auth catch-all API route handler.
 *
 * Handles all auth endpoints: signup, login, logout, email verification,
 * password reset, session management, etc.
 *
 * Routes handled (examples):
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 *   POST /api/auth/forget-password
 *   POST /api/auth/reset-password
 *   GET  /api/auth/verify-email
 */
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
