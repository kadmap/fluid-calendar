import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// List of public routes that don't require authentication
const publicRoutes = [
  "/auto_auth",
  "/setup",
  "/api/setup/check",
  "/auth/signin",
  "/auth/error",
  "/api/auth/register",
  "/beta",
  "/terms",
  "/privacy",
];

// Routes that only admins can access
const adminRoutes = ["/admin", "/logs", "/settings/system"];
export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to auto_auth route without authentication
        if (publicRoutes.includes(req.nextUrl.pathname)) {
          return true;
        }
        // Require authentication for other routes
        return !!token;
      },
      adminAuthorized: ({ token, req }) => {
        // Check if the route is admin-only
        if (
          adminRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
        ) {
          // If the user is not an admin, redirect to the home page
          if (token.role !== "admin") {
            return NextResponse.redirect(new URL("/", req.url));
          }
        }
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
