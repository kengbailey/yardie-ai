/**
 * Better Auth client-side configuration for React.
 *
 * Usage in components:
 *   import { authClient } from "@/lib/auth-client";
 *   const { signIn, signUp, signOut, useSession } = authClient;
 */
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});
