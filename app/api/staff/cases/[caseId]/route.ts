import { NextResponse } from "next/server";

import { appendStaffCaseEvent } from "@/lib/server/staff-case-store";
import {
  readStaffSessionFromCookieHeader,
} from "@/lib/server/staff-auth";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { isStructuredCaseStoreConfigured } from "@/lib/server/staff-case-store";
import {
  STAFF_CASE_STATUS_OPTIONS,
  type StaffCaseActionInput,
} from "@/lib/staff-cases";

const STAFF_CASE_ACTION_RATE_LIMIT = {
  limit: 40,
  windowMs: 5 * 60 * 1000,
};

const STAFF_CASE_STATUS_IDS = new Set(STAFF_CASE_STATUS_OPTIONS.map((option) => option.id));

export async function POST(
  request: Request,
  context: { params: Promise<{ caseId: string }> },
) {
  const rateLimitResult = checkRateLimit(
    request,
    "staff-case-action",
    STAFF_CASE_ACTION_RATE_LIMIT,
  );
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many case actions. Please wait a moment." },
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

  let body: StaffCaseActionInput;

  try {
    body = (await request.json()) as StaffCaseActionInput;
  } catch {
    return NextResponse.json(
      { error: "Invalid case action payload." },
      { status: 400, headers: responseHeaders },
    );
  }

  const fallbackActor = session.displayName || session.email;
  body.actor = body.actor?.trim() || fallbackActor;

  if (!body.actor?.trim()) {
    return NextResponse.json(
      { error: "Please enter the staff member or owner name." },
      { status: 400, headers: responseHeaders },
    );
  }

  if (
    body.status &&
    !STAFF_CASE_STATUS_IDS.has(body.status)
  ) {
    return NextResponse.json(
      { error: "Please choose a valid case status." },
      { status: 400, headers: responseHeaders },
    );
  }

  const caseId = (await context.params).caseId;

  if (!caseId) {
    return NextResponse.json(
      { error: "The staff case identifier is missing." },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const event = await appendStaffCaseEvent(
      "",
      "",
      caseId,
      body,
    );
    return NextResponse.json({ ok: true, event }, { headers: responseHeaders });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The case update could not be saved.",
      },
      { status: 502, headers: responseHeaders },
    );
  }
}
