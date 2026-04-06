import { extractRoleIds, listActiveRolesForAccessToken } from "@/lib/supabase/roles";
import { getSupabasePublicConfig } from "@/lib/supabase/env";

const STAFF_ROLE_VALUES = ["admin", "doctor", "counselor", "staff"] as const;

export type StaffRole = (typeof STAFF_ROLE_VALUES)[number];

interface SupabaseAuthSuccess {
  access_token?: string;
  user?: {
    id?: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
}

function normalizeRoleValue(value: string): StaffRole | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "admin" || normalized === "founder_admin" || normalized === "branch_admin") {
    return "admin";
  }

  if (normalized === "doctor" || normalized === "psychiatrist") {
    return "doctor";
  }

  if (normalized === "counselor" || normalized === "counsellor" || normalized === "therapist") {
    return "counselor";
  }

  if (normalized === "staff" || normalized === "intake_staff" || normalized === "coordinator") {
    return "staff";
  }

  return null;
}

function getStringCandidate(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function isSupabaseStaffAuthConfigured() {
  return getSupabasePublicConfig() !== null;
}

function getSupabaseAuthConfig() {
  const publicConfig = getSupabasePublicConfig();

  if (!publicConfig) {
    return null;
  }

  return {
    supabaseUrl: publicConfig.url.replace(/\/+$/, ""),
    supabasePublishableKey: publicConfig.publishableKey,
  };
}

function parseSupabaseError(responseText: string) {
  const fallback = "Staff sign-in could not be completed right now.";

  if (!responseText.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error_description?: string;
      msg?: string;
      message?: string;
    };

    return (
      parsed.error_description?.trim() ||
      parsed.message?.trim() ||
      parsed.msg?.trim() ||
      fallback
    );
  } catch {
    return responseText.trim() || fallback;
  }
}

export async function signInStaffWithSupabase(email: string, password: string) {
  const config = getSupabaseAuthConfig();

  if (!config) {
    return {
      ok: false as const,
      status: 503,
      error:
        "Supabase auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    };
  }

  const response = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: config.supabasePublishableKey,
        Authorization: `Bearer ${config.supabasePublishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: parseSupabaseError(responseText),
    };
  }

  let payload: SupabaseAuthSuccess;

  try {
    payload = JSON.parse(responseText) as SupabaseAuthSuccess;
  } catch {
    return {
      ok: false as const,
      status: 502,
      error: "Supabase returned an unexpected sign-in response.",
    };
  }

  const user = payload.user;
  const userId = user?.id?.trim() || "";
  const userEmail = user?.email?.trim() || email.trim();

  if (!user || !userId || !userEmail) {
    return {
      ok: false as const,
      status: 502,
      error: "Supabase did not return a valid staff user profile.",
    };
  }

  const accessToken = payload.access_token?.trim() || "";

  if (!accessToken) {
    return {
      ok: false as const,
      status: 502,
      error: "Supabase did not return an access token for the staff sign-in session.",
    };
  }

  const roleLookup = await listActiveRolesForAccessToken({
    accessToken,
    publishableKey: config.supabasePublishableKey,
    supabaseUrl: config.supabaseUrl,
    userId,
  });

  if (!roleLookup.ok) {
    return {
      ok: false as const,
      status: roleLookup.status,
      error:
        roleLookup.status >= 500
          ? "The staff role check could not be completed right now."
          : roleLookup.error,
    };
  }

  const roleIds = extractRoleIds(roleLookup.roles);
  const role =
    roleIds
      .map((value) => normalizeRoleValue(value))
      .find((value): value is StaffRole => value !== null) || null;

  if (!role) {
    if (process.env.STAFF_ALLOW_ANY_AUTH_USER?.trim().toLowerCase() === "true") {
      return {
        ok: true as const,
        userId,
        email: userEmail,
        role: "staff" as const,
        displayName:
          [
            getStringCandidate(user.user_metadata?.full_name),
            getStringCandidate(user.user_metadata?.name),
          ].find(Boolean) || userEmail,
      };
    }

    return {
      ok: false as const,
      status: 403,
      error:
        "This account is authenticated but does not have an active staff, counselor, doctor, or admin role yet.",
    };
  }

  const displayName = [
    getStringCandidate(user.user_metadata?.full_name),
    getStringCandidate(user.user_metadata?.name),
  ].find(Boolean) || userEmail;

  return {
    ok: true as const,
    userId,
    email: userEmail,
    role,
    displayName,
  };
}

export function getAllowedStaffRoles() {
  const configuredRoles = (process.env.STAFF_DASHBOARD_ALLOWED_ROLES || "")
    .split(",")
    .map((value) => normalizeRoleValue(value))
    .filter((value): value is StaffRole => value !== null);

  if (configuredRoles.length > 0) {
    return new Set(configuredRoles);
  }

  return new Set<StaffRole>(STAFF_ROLE_VALUES);
}
