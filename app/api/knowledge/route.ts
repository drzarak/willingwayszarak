import { NextResponse } from "next/server";

import { buildKnowledgeContext } from "@/lib/server/knowledge-base";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";

const KNOWLEDGE_RATE_LIMIT = {
  limit: 30,
  windowMs: 5 * 60 * 1000,
};

export async function GET(request: Request) {
  const rateLimitResult = checkRateLimit(request, "knowledge", KNOWLEDGE_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many knowledge requests. Please wait a moment." },
      { status: 429, headers: responseHeaders },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "4") || 4, 6);

  if (query.length < 4) {
    return NextResponse.json(
      {
        hits: [],
        query,
      },
      { headers: responseHeaders },
    );
  }

  const result = buildKnowledgeContext(query, limit);

  return NextResponse.json(
    {
      query,
      hits: result.hits,
    },
    { headers: responseHeaders },
  );
}
