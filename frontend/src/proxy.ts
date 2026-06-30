import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token");

  const protectedRoutes = [
    "/dashboard",
    "/problems",
    "/battles",
    "/leaderboard",
    "/profile",
    "/settings",
  ];

  const isProtected = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/problems/:path*",
    "/battles/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};