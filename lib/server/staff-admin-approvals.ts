import { getSupabasePublicConfig } from "@/lib/supabase/env";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  "";

const APPROVAL_ROLE_VALUES = new Set(["doctor", "counselor", "staff"]);

interface SupabaseAdminConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}

interface UserRoleRow {
  id: number;
  user_id: string;
  role: string;
  branch_id: string | null;
  status: string;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  phone_e164: string | null;
  preferred_language: string | null;
}

interface BranchRow {
  id: string;
  code: string;
  name: string;
  city: string;
  is_active: boolean;
}

interface AuthAdminUser {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthAdminUsersResponse {
  users?: AuthAdminUser[];
}

export interface StaffApprovalBranch {
  id: string;
  code: string;
  name: string;
  city: string;
}

export interface PendingStaffApprovalRequest {
  requestId: number;
  userId: string;
  requestedRole: string;
  requestedRoleLabel: string;
  status: string;
  requestedAt: string;
  branchId: string | null;
  branchCode: string | null;
  branchName: string | null;
  fullName: string;
  email: string;
  phone: string;
  preferredLanguage: string;
}

function parseErrorResponse(responseText: string) {
  if (!responseText.trim()) {
    return "Supabase request failed.";
  }

  try {
    const payload = JSON.parse(responseText) as {
      message?: string;
      error?: string;
      hint?: string;
      msg?: string;
    };

    return (
      payload.message?.trim() ||
      payload.error?.trim() ||
      payload.hint?.trim() ||
      payload.msg?.trim() ||
      responseText.trim()
    );
  } catch {
    return responseText.trim();
  }
}

function toRoleLabel(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized === "doctor") {
    return "Doctor";
  }

  if (normalized === "counselor" || normalized === "counsellor") {
    return "Counselor";
  }

  if (normalized === "staff") {
    return "Staff";
  }

  if (normalized === "pending_clinician") {
    return "Pending clinician";
  }

  if (normalized === "pending_staff") {
    return "Pending staff";
  }

  return role;
}

function getSupabaseAdminConfig(): SupabaseAdminConfig | null {
  const publicConfig = getSupabasePublicConfig();
  const supabaseUrl =
    publicConfig?.url?.trim() || process.env.SUPABASE_URL?.trim() || "";
  const serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

export function isStaffApprovalsConfigured() {
  return getSupabaseAdminConfig() !== null;
}

async function fetchSupabaseAdminJson<T>(
  config: SupabaseAdminConfig,
  path: string,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Accept", "application/json");

  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(parseErrorResponse(responseText));
  }

  if (!responseText) {
    return null as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error("Supabase returned an invalid JSON response.");
  }
}

function buildInFilter(values: string[]) {
  return `in.(${values.map((value) => `"${value.replaceAll('"', "")}"`).join(",")})`;
}

function getProfileDisplayName(profile: ProfileRow | undefined, fallback: string) {
  const fullName = profile?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  return fallback;
}

function getMetadataFullName(user: AuthAdminUser | undefined) {
  if (!user?.user_metadata || typeof user.user_metadata !== "object") {
    return "";
  }

  const candidates = [
    user.user_metadata.full_name,
    user.user_metadata.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

async function listAuthUsersById(
  config: SupabaseAdminConfig,
  userIds: string[],
) {
  const unresolved = new Set(userIds);
  const found = new Map<string, AuthAdminUser>();
  const perPage = 200;

  for (let page = 1; page <= 10 && unresolved.size > 0; page += 1) {
    const payload = await fetchSupabaseAdminJson<AuthAdminUsersResponse>(
      config,
      `/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
    );
    const users = Array.isArray(payload?.users) ? payload.users : [];

    if (users.length === 0) {
      break;
    }

    for (const user of users) {
      const id = user.id?.trim();
      if (!id || !unresolved.has(id)) {
        continue;
      }

      found.set(id, user);
      unresolved.delete(id);
    }

    if (users.length < perPage) {
      break;
    }
  }

  return found;
}

function mapRequestedRoleToApprovalRole(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized === "pending_clinician") {
    return "counselor";
  }

  if (normalized === "pending_staff") {
    return "staff";
  }

  if (APPROVAL_ROLE_VALUES.has(normalized)) {
    return normalized;
  }

  return "staff";
}

export async function listStaffApprovalBranches() {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error(
      "Supabase admin approvals are not configured. Add SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const query = new URLSearchParams({
    select: "id,code,name,city,is_active",
    order: "name.asc",
    is_active: "eq.true",
  });

  const rows = await fetchSupabaseAdminJson<BranchRow[]>(
    config,
    `/rest/v1/branches?${query.toString()}`,
  );

  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    city: row.city,
  }));
}

export async function listPendingStaffApprovalRequests() {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error(
      "Supabase admin approvals are not configured. Add SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const rolesQuery = new URLSearchParams({
    select: "id,user_id,role,branch_id,status,created_at",
    status: "eq.pending",
    order: "created_at.asc",
    limit: "100",
  });

  const roleRows = await fetchSupabaseAdminJson<UserRoleRow[]>(
    config,
    `/rest/v1/user_roles?${rolesQuery.toString()}`,
  );

  const pendingRows = (Array.isArray(roleRows) ? roleRows : []).filter((row) =>
    Boolean(row.user_id?.trim()),
  );

  if (pendingRows.length === 0) {
    return [] as PendingStaffApprovalRequest[];
  }

  const userIds = [...new Set(pendingRows.map((row) => row.user_id.trim()))];
  const branchIds = [
    ...new Set(
      pendingRows
        .map((row) => row.branch_id?.trim() || "")
        .filter(Boolean),
    ),
  ];

  const profileMap = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const profileQuery = new URLSearchParams({
      select: "id,full_name,phone_e164,preferred_language",
      id: buildInFilter(userIds),
    });
    const profiles = await fetchSupabaseAdminJson<ProfileRow[]>(
      config,
      `/rest/v1/profiles?${profileQuery.toString()}`,
    );

    for (const row of Array.isArray(profiles) ? profiles : []) {
      if (typeof row.id === "string" && row.id.trim()) {
        profileMap.set(row.id, row);
      }
    }
  }

  const branchMap = new Map<string, BranchRow>();
  if (branchIds.length > 0) {
    const branchQuery = new URLSearchParams({
      select: "id,code,name,city,is_active",
      id: buildInFilter(branchIds),
    });
    const branches = await fetchSupabaseAdminJson<BranchRow[]>(
      config,
      `/rest/v1/branches?${branchQuery.toString()}`,
    );

    for (const row of Array.isArray(branches) ? branches : []) {
      if (typeof row.id === "string" && row.id.trim()) {
        branchMap.set(row.id, row);
      }
    }
  }

  const authUsersMap = await listAuthUsersById(config, userIds);

  return pendingRows.map((row) => {
    const profile = profileMap.get(row.user_id);
    const authUser = authUsersMap.get(row.user_id);
    const branch = row.branch_id ? branchMap.get(row.branch_id) : undefined;
    const email = authUser?.email?.trim() || "";
    const fallbackName = getMetadataFullName(authUser) || email || row.user_id;

    return {
      requestId: row.id,
      userId: row.user_id,
      requestedRole: row.role,
      requestedRoleLabel: toRoleLabel(row.role),
      status: row.status,
      requestedAt: row.created_at,
      branchId: row.branch_id,
      branchCode: branch?.code ?? null,
      branchName: branch?.name ?? null,
      fullName: getProfileDisplayName(profile, fallbackName),
      email,
      phone: profile?.phone_e164?.trim() || "",
      preferredLanguage: profile?.preferred_language?.trim() || "english",
    };
  });
}

interface ResolvePendingStaffApprovalInput {
  requestId: number;
  decidedByUserId: string;
  decision: "approve" | "reject";
  approvedRole?: string;
  approvedBranchId?: string | null;
}

export async function resolvePendingStaffApprovalRequest(
  input: ResolvePendingStaffApprovalInput,
) {
  const config = getSupabaseAdminConfig();

  if (!config) {
    throw new Error(
      "Supabase admin approvals are not configured. Add SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  if (!Number.isInteger(input.requestId) || input.requestId <= 0) {
    throw new Error("A valid pending request id is required.");
  }

  const decidedByUserId = input.decidedByUserId.trim();
  if (!decidedByUserId) {
    throw new Error("Admin identity is required to resolve a request.");
  }

  const decision = input.decision;
  if (decision !== "approve" && decision !== "reject") {
    throw new Error("Invalid approval decision.");
  }

  const updates: Record<string, string | null> = {
    assigned_by: decidedByUserId,
    status: decision === "approve" ? "active" : "suspended",
  };

  if (decision === "approve") {
    const approvedRole = input.approvedRole
      ? input.approvedRole.trim().toLowerCase()
      : "";
    const normalizedRole =
      approvedRole && APPROVAL_ROLE_VALUES.has(approvedRole)
        ? approvedRole
        : mapRequestedRoleToApprovalRole(approvedRole);

    updates.role = normalizedRole;
    updates.branch_id = input.approvedBranchId?.trim() || null;
  }

  const updateQuery = new URLSearchParams({
    id: `eq.${input.requestId}`,
    status: "eq.pending",
    select: "id,user_id,role,branch_id,status,created_at",
  });

  const updatedRows = await fetchSupabaseAdminJson<UserRoleRow[]>(
    config,
    `/rest/v1/user_roles?${updateQuery.toString()}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    },
  );

  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    throw new Error("The request could not be updated. It may no longer be pending.");
  }

  return updatedRows[0];
}
