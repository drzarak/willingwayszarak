import { NextResponse } from "next/server";

import {
  createStaffSessionToken,
  getStaffSessionCookieName,
  getStaffSessionCookieOptions,
  isStaffDashboardConfigured,
} from "@/lib/server/staff-auth";
import { signInStaffWithSupabase } from "@/lib/server/staff-auth-adapter";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";

const LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
};

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(request, "staff-login", LOGIN_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many staff sign-in attempts. Please wait a moment." },
      { status: 429, headers: responseHeaders },
    );
  }

  if (!isStaffDashboardConfigured()) {
    return NextResponse.json(
      { error: "The staff dashboard is not configured on the server." },
      { status: 503, headers: responseHeaders },
    );
  }

  let body: { email?: string; password?: string };

  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid sign-in request." },
      { status: 400, headers: responseHeaders },
    );
  }

  const email = body.email?.trim() || "";
  const password = body.password ?? "";

  if (!email || !password.trim()) {
    return NextResponse.json(
      { error: "Please enter your staff email and password." },
      { status: 400, headers: responseHeaders },
    );
  }

  let result: Awaited<ReturnType<typeof signInStaffWithSupabase>>;

  try {
    result = await signInStaffWithSupabase(email, password);
  } catch {
    return NextResponse.json(
      {
        error:
          "The staff sign-in service is temporarily unavailable. Please retry in a moment.",
      },
      { status: 502, headers: responseHeaders },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status, headers: responseHeaders },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: responseHeaders });
  response.cookies.set(
    getStaffSessionCookieName(),
    createStaffSessionToken({
      userId: result.userId,
      email: result.email,
      role: result.role,
      displayName: result.displayName,
    }),
    getStaffSessionCookieOptions(),
  );
  return response;
}
