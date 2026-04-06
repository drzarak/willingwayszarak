import { NextResponse } from "next/server";

import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { readStaffSessionFromCookieHeader } from "@/lib/server/staff-auth";
import { syncDailyUsageDigestToNotion } from "@/lib/server/usage-analytics";

const DAILY_DIGEST_RATE_LIMIT = {
  limit: 12,
  windowMs: 60 * 60 * 1000,
};

function isAuthorized(request: Request) {
  if (request.headers.get("x-vercel-cron")) {
    return true;
  }

  const configuredSecret = process.env.OPS_DAILY_DIGEST_SECRET?.trim();
  const authorization = request.headers.get("authorization") ?? "";

  if (
    configuredSecret &&
    authorization.toLowerCase().startsWith("bearer ") &&
    authorization.slice(7).trim() === configuredSecret
  ) {
    return true;
  }

  const staffSession = readStaffSessionFromCookieHeader(request.headers.get("cookie"));
  return staffSession?.role === "admin";
}

function normalizeDateKey(value: string | null) {
  if (!value) {
    return "";
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export async function GET(request: Request) {
  const rateLimitResult = checkRateLimit(request, "ops-daily-digest", DAILY_DIGEST_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many digest sync attempts. Please try again later." },
      { status: 429, headers: responseHeaders },
    );
  }

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Admin authorization is required for the daily digest." },
      { status: 401, headers: responseHeaders },
    );
  }

  const url = new URL(request.url);
  const requestedDate = normalizeDateKey(url.searchParams.get("date"));

  try {
    const result = await syncDailyUsageDigestToNotion(requestedDate || undefined);
    return NextResponse.json(result, { headers: responseHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The daily digest could not be synced.",
      },
      { status: 500, headers: responseHeaders },
    );
  }
}
