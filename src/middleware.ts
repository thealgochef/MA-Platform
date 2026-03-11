import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isProtectedRoute, isPublicOnlyRoute, getRedirectForUser } from "@/lib/auth-helpers";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Create supabase client to refresh session
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log(`[middleware] ${pathname} | user: ${user ? user.email : "none"} | protected: ${isProtectedRoute(pathname)} | publicOnly: ${isPublicOnlyRoute(pathname)}`);

  // Unauthenticated user trying to access protected route
  if (!user && isProtectedRoute(pathname)) {
    console.log(`[middleware] → redirect to /login (unauthenticated on protected route)`);
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated user trying to access login/signup pages
  if (user && isPublicOnlyRoute(pathname)) {
    // Allow access — page will handle redirect if profile is complete
  }

  // Authenticated user — check role/status routing
  if (user && isProtectedRoute(pathname)) {
    const { data: profile } = await supabase
      .from("users")
      .select("role, status, membership_agreement_signed")
      .eq("id", user.id)
      .single();

    console.log(`[middleware] profile:`, profile ? `role=${profile.role} status=${profile.status} agreement=${profile.membership_agreement_signed}` : "null");

    if (profile) {
      const redirect = getRedirectForUser(profile, pathname);
      console.log(`[middleware] getRedirectForUser → ${redirect ?? "null (allow)"}`);
      if (redirect) {
        const url = request.nextUrl.clone();
        url.pathname = redirect.split("?")[0];
        if (redirect.includes("?")) {
          const params = new URLSearchParams(redirect.split("?")[1]);
          params.forEach((value, key) => url.searchParams.set(key, value));
        }
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
