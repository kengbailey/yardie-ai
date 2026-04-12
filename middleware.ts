/**
 * Next.js middleware for route protection.
 *
 * Protected routes:
 *   /dashboard/*   - requires authenticated user
 *   /instances/*   - requires authenticated user; /instances/:id/manage requires manager or sysadmin
 *   /admin/*       - requires sysadmin global role
 *
 * Unauthenticated users are redirected to /login.
 * Unauthorized users are redirected to /unauthorized.
 *
 * This middleware uses the Node.js runtime (not Edge) because it needs direct
 * PostgreSQL access for RBAC checks.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Session resolution: call the Better Auth session endpoint internally.
// This works in both Edge and Node.js middleware runtimes.
// ---------------------------------------------------------------------------

interface SessionResponse {
  session: { userId: string } | null;
  user: { id: string; email: string } | null;
}

async function getSessionUser(
  request: NextRequest,
): Promise<{ userId: string } | null> {
  const APP_URL = process.env.INTERNAL_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    // Forward cookies to the internal session endpoint
    const cookieHeader = request.headers.get("cookie") ?? "";

    const response = await fetch(`${APP_URL}/api/auth/get-session`, {
      method: "GET",
      headers: {
        cookie: cookieHeader,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as SessionResponse;

    if (!data.session?.userId) {
      return null;
    }

    return { userId: data.session.userId };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// RBAC checks: call internal API for role verification.
// The middleware avoids direct DB imports so it can run in Edge Runtime.
// For /admin and /instances/:id/manage routes, we query via internal fetch.
// ---------------------------------------------------------------------------

async function checkRoleViaApi(
  request: NextRequest,
  userId: string,
  check: "sysadmin" | { instanceId: string; roles: string[] },
): Promise<boolean> {
  const APP_URL = process.env.INTERNAL_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    const params = new URLSearchParams({ userId });

    if (check === "sysadmin") {
      params.set("check", "sysadmin");
    } else {
      params.set("check", "instance");
      params.set("instanceId", check.instanceId);
      params.set("roles", check.roles.join(","));
    }

    const response = await fetch(
      `${APP_URL}/api/auth/check-role?${params.toString()}`,
      {
        method: "GET",
        headers: { cookie: cookieHeader },
      },
    );

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { allowed: boolean };
    return data.allowed === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route matching helpers
// ---------------------------------------------------------------------------

const PROTECTED_PREFIXES = ["/dashboard", "/instances", "/admin"];
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
  "/api/auth",
  "/api/submit-email",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

/**
 * Extract instance ID and check if route is a manage route.
 * Pattern: /instances/:instanceId/manage
 */
function parseInstanceRoute(pathname: string): {
  instanceId: string;
  isManage: boolean;
} | null {
  const match = pathname.match(/^\/instances\/([^/]+)(\/manage)?/);
  if (!match || !match[1]) {
    return null;
  }
  return {
    instanceId: match[1],
    isManage: match[2] === "/manage",
  };
}

// ---------------------------------------------------------------------------
// Middleware handler
// ---------------------------------------------------------------------------

export async function middleware(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    isPublicPath(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Only check protected routes
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  // Resolve session
  const sessionUser = await getSessionUser(request);

  if (!sessionUser) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { userId } = sessionUser;

  // /admin/* requires sysadmin
  if (pathname.startsWith("/admin")) {
    const isAdmin = await checkRoleViaApi(request, userId, "sysadmin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
    return NextResponse.next();
  }

  // /instances/:id/manage requires manager or sysadmin for that instance
  if (pathname.startsWith("/instances")) {
    const parsed = parseInstanceRoute(pathname);
    if (parsed?.isManage) {
      // Check sysadmin first, then manager
      const isAdmin = await checkRoleViaApi(request, userId, "sysadmin");
      if (isAdmin) {
        return NextResponse.next();
      }
      const isManager = await checkRoleViaApi(request, userId, {
        instanceId: parsed.instanceId,
        roles: ["manager"],
      });
      if (!isManager) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
    return NextResponse.next();
  }

  // /dashboard/* -- authenticated user is sufficient
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
