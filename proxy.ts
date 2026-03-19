import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const authRoutes = [
    '/auth/login',
    '/auth/sign-up', 
    '/auth/forgot-password',
    '/auth/confirm',
    '/auth/sign-up-success',
    '/auth/error',
    '/auth/update-password',
  ];

  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  );

  // 🔑 Just check cookie existence (FAST)
  const hasSession =
    request.cookies.get('sb-access-token') ||
    request.cookies.get('sb-refresh-token');

  // Logged in user hitting auth pages
  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}