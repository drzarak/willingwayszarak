import { NextResponse } from "next/server";

import {
  getStaffSessionCookieName,
  getStaffSessionCookieOptions,
} from "@/lib/server/staff-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getStaffSessionCookieName(), "", {
    ...getStaffSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
