import { NextResponse } from "next/server";

import {
  createStaffSessionToken,
  getStaffSessionCookieName,
  getStaffSessionCookieOptions,
  isStaffDashboardConfigured,
} from "@/lib/server/staff-auth";
import {
  isSupabaseStaffAuthConfigured,
  signInStaffWithSupabase,
} from "@/lib/server/staff-auth-adapter";
import {
  isStaffAccountStoreConfigured,
  signInStaffWithNeon,
} from "@/lib/server/staff-account-store";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";

const LOGIN_RATE_LIMIT = {
  limit: 10,
  windowMs: 10 * 60 * 1000,
};

type StaffSignInResult =
  | Awaited<ReturnType<typeof signInStaffWithSupabase>>
  | Awaited<ReturnType<typeof signInStaffWithNeon>>;

function createLoginResponse(
  result: Extract<StaffSignInResult, { ok: true }>,
  headers: HeadersInit,
) {
  const response = NextResponse.json({ ok: true }, { headers });
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

  let signInError: Extract<StaffSignInResult, { ok: false }> | null = null;

  if (isSupabaseStaffAuthConfigured()) {
    try {
      const supabaseResult = await signInStaffWithSupabase(email, password);

      if (supabaseResult.ok) {
        return createLoginResponse(supabaseResult, responseHeaders);
      }

      signInError = supabaseResult;
    } catch {
      signInError = {
        ok: false,
        status: 502,
        error: "The Supabase staff sign-in service is temporarily unavailable.",
      };
    }
  }

  if (isStaffAccountStoreConfigured()) {
    try {
      const neonResult = await signInStaffWithNeon(email, password);

      if (neonResult.ok) {
        return createLoginResponse(neonResult, responseHeaders);
      }

      if (!signInError || signInError.status >= 500 || signInError.status === 503) {
        signInError = neonResult;
      }
    } catch {
      if (!signInError || signInError.status >= 500 || signInError.status === 503) {
        signInError = {
          ok: false,
          status: 502,
          error:
            "The backup staff account database is temporarily unavailable. Please retry in a moment.",
        };
      }
    }
  }

  if (!signInError) {
    return NextResponse.json(
      {
        error:
          "The staff sign-in service is temporarily unavailable. Please retry in a moment.",
      },
      { status: 502, headers: responseHeaders },
    );
  }

  return NextResponse.json(
    { error: signInError.error },
    { status: signInError.status, headers: responseHeaders },
  );
}
