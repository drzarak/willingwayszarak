import { NextResponse, type NextRequest } from "next/server";

import {
  isSupabaseAuthConfigured,
  shouldEnforceRoleChecks,
} from "@/lib/supabase/env";
import {
  canAccessRouteByRole,
  isAuthRoute,
  isProtectedRoute,
} from "@/lib/supabase/guards";
import { buildLoginUrl, normalizeNextPath } from "@/lib/supabase/navigation";
import { updateSupabaseSession } from "@/lib/supabase/proxy";

function withCopiedCookies(source: NextResponse, target: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  return target;
}

export async function middleware(request: NextRequest) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const { response, authenticated, roles } = await updateSupabaseSession(request, {
    loadRoles: isProtectedRoute(pathname) && shouldEnforceRoleChecks(),
  });

  if (!authenticated && isProtectedRoute(pathname)) {
    const nextPath = normalizeNextPath(`${pathname}${search}`);
    const loginUrl = new URL(buildLoginUrl("/login", nextPath), request.url);
    return withCopiedCookies(response, NextResponse.redirect(loginUrl));
  }

  if (authenticated && !canAccessRouteByRole(pathname, roles)) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("message", "This account cannot access that area yet.");
    return withCopiedCookies(response, NextResponse.redirect(errorUrl));
  }

  if (authenticated && isAuthRoute(pathname)) {
    const requestedNext = normalizeNextPath(request.nextUrl.searchParams.get("next"), "/");
    return withCopiedCookies(response, NextResponse.redirect(new URL(requestedNext, request.url)));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site-assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
