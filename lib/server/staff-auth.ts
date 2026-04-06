import { createHmac, timingSafeEqual } from "node:crypto";

import {
  getAllowedStaffRoles,
  isSupabaseStaffAuthConfigured,
  type StaffRole,
} from "@/lib/server/staff-auth-adapter";

const STAFF_SESSION_COOKIE = "ww_staff_session";
const STAFF_SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

interface StaffSessionPayload {
  exp: number;
  userId: string;
  email: string;
  role: StaffRole;
  displayName: string;
}

function getStaffSecret() {
  return process.env.STAFF_DASHBOARD_SESSION_SECRET?.trim() || "";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getStaffSecret()).update(value).digest("base64url");
}

export function isStaffDashboardConfigured() {
  return Boolean(getStaffSecret() && isSupabaseStaffAuthConfigured());
}

export function createStaffSessionToken(
  session: Omit<StaffSessionPayload, "exp">,
  now = Date.now(),
) {
  const payload: StaffSessionPayload = {
    exp: now + STAFF_SESSION_DURATION_MS,
    userId: session.userId.trim(),
    email: session.email.trim(),
    role: session.role,
    displayName: session.displayName.trim(),
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function readStaffSessionToken(token: string | undefined | null) {
  if (!token || !getStaffSecret()) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encodedPayload)) as StaffSessionPayload;

    if (
      typeof payload.exp !== "number" ||
      payload.exp <= Date.now() ||
      typeof payload.userId !== "string" ||
      !payload.userId.trim() ||
      typeof payload.email !== "string" ||
      !payload.email.trim() ||
      typeof payload.role !== "string"
    ) {
      return null;
    }

    const allowedRoles = getAllowedStaffRoles();
    const normalizedRole = payload.role as StaffRole;

    if (!allowedRoles.has(normalizedRole)) {
      return null;
    }

    return {
      exp: payload.exp,
      userId: payload.userId.trim(),
      email: payload.email.trim(),
      role: normalizedRole,
      displayName:
        typeof payload.displayName === "string" && payload.displayName.trim()
          ? payload.displayName.trim()
          : payload.email.trim(),
    };
  } catch {
    return null;
  }
}

export function verifyStaffSessionToken(token: string | undefined | null) {
  return readStaffSessionToken(token) !== null;
}

export function extractStaffSessionTokenFromCookie(cookieHeader: string | null | undefined) {
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STAFF_SESSION_COOKIE}=`))
    ?.slice(STAFF_SESSION_COOKIE.length + 1);
}

export function readStaffSessionFromCookieHeader(cookieHeader: string | null | undefined) {
  return readStaffSessionToken(extractStaffSessionTokenFromCookie(cookieHeader));
}

export function getStaffSessionCookieName() {
  return STAFF_SESSION_COOKIE;
}

export function getStaffSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(STAFF_SESSION_DURATION_MS / 1000),
  };
}
