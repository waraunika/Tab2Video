import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";
import { createServerClient} from '@supabase/ssr';
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // first, run the existing session update
  const response = await updateSession(request);

  const authRoutes = [
    '/auth/login',
    '/auth/sign-up', 
    '/auth/forgot-password',
    '/auth/confirm',
    '/auth/sign-up-success',
    '/auth/error',
    '/auth/update-password',
  ];

  const isAuthRoute = authRoutes.some(route => request.nextUrl.pathname.startsWith(route));

  const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard');

  const isTabRoute = request.nextUrl.pathname.startsWith('/upload-tab')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() { },
      },
    }
  );

  // if user is logged in and trying to access auth routes, redirect to dashboard
  const { data: { user } } = await supabase.auth.getUser();

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // If user is not logged in and trying to access dashboard, redirect to login
  if (!user && (isDashboardRoute || isTabRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // check admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }

    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
