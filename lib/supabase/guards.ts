import {
  shouldEnforceRoleChecks,
  shouldProtectStaffRoute,
} from "@/lib/supabase/env";

const AUTH_ROUTE_PREFIXES = ["/login", "/sign-up", "/auth/confirm", "/auth/error"];
const BASE_PROTECTED_PREFIXES = ["/admin", "/portal", "/clinician"];

const ROUTE_ROLE_REQUIREMENTS: Array<{
  prefix: string;
  allowedRoles: string[];
}> = [
  {
    prefix: "/admin",
    allowedRoles: ["admin", "founder_admin", "platform_admin", "branch_admin"],
  },
  {
    prefix: "/clinician",
    allowedRoles: ["admin", "founder_admin", "platform_admin", "doctor", "counselor"],
  },
  {
    prefix: "/portal",
    allowedRoles: [
      "admin",
      "founder_admin",
      "platform_admin",
      "doctor",
      "counselor",
      "staff",
      "patient",
      "family",
      "family_member",
    ],
  },
  {
    prefix: "/staff",
    allowedRoles: [
      "admin",
      "founder_admin",
      "platform_admin",
      "branch_admin",
      "doctor",
      "counselor",
      "staff",
    ],
  },
];

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedRoute(pathname: string) {
  const prefixes = shouldProtectStaffRoute()
    ? [...BASE_PROTECTED_PREFIXES, "/staff"]
    : BASE_PROTECTED_PREFIXES;

  return prefixes.some((prefix) => pathname.startsWith(prefix));
}
export function canAccessRouteByRole(pathname: string, roles: string[]) {
  if (!shouldEnforceRoleChecks()) {
    return true;
  }

  const requirement = ROUTE_ROLE_REQUIREMENTS.find((item) =>
    pathname.startsWith(item.prefix),
  );

  if (!requirement) {
    return true;
  }

  if (requirement.prefix === "/staff" && !shouldProtectStaffRoute()) {
    return true;
  }

  return roles.some((role) => requirement.allowedRoles.includes(role));
}
