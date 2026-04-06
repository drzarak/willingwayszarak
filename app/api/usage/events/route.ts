import { NextResponse } from "next/server";

import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { logUsageEventFromUnknown } from "@/lib/server/usage-analytics";

const USAGE_EVENT_RATE_LIMIT = {
  limit: 120,
  windowMs: 5 * 60 * 1000,
};

const ALLOWED_EVENT_TYPES = new Set(["realtime-response", "realtime-transcription"]);

interface UsageEventBody {
  eventType?: string;
  route?: string;
  surface?: string;
  sessionId?: string;
  userRole?: string;
  model?: string;
  usage?: unknown;
  metadata?: Record<string, unknown>;
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  const rateLimitResult = checkRateLimit(request, "usage-events", USAGE_EVENT_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many usage events are arriving from this browser right now." },
      { status: 429, headers: responseHeaders },
    );
  }

  let body: UsageEventBody;

  try {
    body = (await request.json()) as UsageEventBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid usage event payload." },
      { status: 400, headers: responseHeaders },
    );
  }

  const eventType = normalizeText(body.eventType, 64);

  if (!ALLOWED_EVENT_TYPES.has(eventType)) {
    return NextResponse.json(
      { error: "Unsupported usage event type." },
      { status: 400, headers: responseHeaders },
    );
  }

  await logUsageEventFromUnknown({
    eventType: eventType as "realtime-response" | "realtime-transcription",
    route: normalizeText(body.route, 120) || "/api/realtime/session",
    surface: normalizeText(body.surface, 80) || "voice",
    sessionId: normalizeText(body.sessionId, 120),
    userRole: normalizeText(body.userRole, 80),
    model: normalizeText(body.model, 80),
    usage: body.usage,
    metadata: body.metadata,
  });

  return NextResponse.json({ ok: true }, { headers: responseHeaders });
}
