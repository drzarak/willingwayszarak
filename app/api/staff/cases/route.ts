import { NextResponse } from "next/server";

import { listStaffCases } from "@/lib/server/staff-case-store";
import {
  readStaffSessionFromCookieHeader,
} from "@/lib/server/staff-auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { isStructuredCaseStoreConfigured } from "@/lib/server/staff-case-store";

const STAFF_CASES_RATE_LIMIT = {
  limit: 40,
  windowMs: 5 * 60 * 1000,
};

export async function GET(request: Request) {
  const rateLimitResult = checkRateLimit(request, "staff-cases", STAFF_CASES_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many dashboard requests. Please wait a moment." },
      { status: 429, headers: responseHeaders },
    );
  }

  const session = readStaffSessionFromCookieHeader(request.headers.get("cookie"));

  if (!session) {
    return NextResponse.json(
      { error: "Staff sign-in required." },
      { status: 401, headers: responseHeaders },
    );
  }

  if (!isStructuredCaseStoreConfigured()) {
    return NextResponse.json(
      { error: "Staff dashboard storage is not configured." },
      { status: 503, headers: responseHeaders },
    );
  }

  try {
    const data = await listStaffCases("", "");
    return NextResponse.json(data, { headers: responseHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The staff queue could not be loaded.",
      },
      { status: 502, headers: responseHeaders },
    );
  }
}
