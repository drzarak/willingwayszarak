import { NextRequest, NextResponse } from "next/server";

import { normalizeNextPath } from "@/lib/supabase/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OtpType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email";

function normalizeOtpType(value: string | null): OtpType {
  switch ((value ?? "").toLowerCase()) {
    case "invite":
      return "invite";
    case "magiclink":
      return "magiclink";
    case "recovery":
      return "recovery";
    case "email_change":
      return "email_change";
    case "email":
      return "email";
    case "signup":
    default:
      return "signup";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = normalizeOtpType(requestUrl.searchParams.get("type"));
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"), "/");

  if (!tokenHash) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("message", "Missing confirmation token.");
    return NextResponse.redirect(errorUrl);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("message", "Auth provider is not configured.");
    return NextResponse.redirect(errorUrl);
  }

  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("message", error.message);
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
