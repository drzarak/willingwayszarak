import type { SupabaseClient } from "@supabase/supabase-js";

export interface ActiveRoleRow {
  role: string;
  branchId: string | null;
}

function normalizeRoleValue(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toActiveRoleRows(rows: unknown): ActiveRoleRow[] {
  if (!Array.isArray(rows)) {
    return [];
  }

  const seen = new Set<string>();
  const normalizedRows: ActiveRoleRow[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue;
    }

    const candidate = row as {
      role?: unknown;
      branch_id?: unknown;
      branchId?: unknown;
    };
    const role = normalizeRoleValue(candidate.role);

    if (!role) {
      continue;
    }

    const branchValue =
      typeof candidate.branch_id === "string"
        ? candidate.branch_id.trim()
        : typeof candidate.branchId === "string"
          ? candidate.branchId.trim()
          : "";
    const branchId = branchValue || null;
    const dedupeKey = `${role}:${branchId ?? ""}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalizedRows.push({ role, branchId });
  }

  return normalizedRows;
}

export function extractRoleIds(rows: ActiveRoleRow[]) {
  return [...new Set(rows.map((row) => row.role))];
}

export async function listActiveRolesForSupabaseClient(
  supabase: SupabaseClient,
  userId: string,
) {
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return [] as ActiveRoleRow[];
  }

  const { data, error } = await supabase
    .from("user_roles")
    .select("role, branch_id")
    .eq("user_id", normalizedUserId)
    .eq("status", "active");

  if (error) {
    return [];
  }

  return toActiveRoleRows(data);
}

function parseRestResponseError(responseText: string) {
  if (!responseText.trim()) {
    return "Supabase role lookup failed.";
  }

  try {
    const parsed = JSON.parse(responseText) as {
      message?: string;
      error?: string;
      hint?: string;
    };

    return parsed.message?.trim() || parsed.error?.trim() || parsed.hint?.trim() || responseText;
  } catch {
    return responseText.trim();
  }
}

interface AccessTokenRoleLookupConfig {
  accessToken: string;
  publishableKey: string;
  supabaseUrl: string;
  userId: string;
}

export async function listActiveRolesForAccessToken(
  config: AccessTokenRoleLookupConfig,
) {
  const { accessToken, publishableKey, supabaseUrl, userId } = config;
  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    return {
      ok: false as const,
      status: 400,
      error: "Supabase role lookup requires a user id.",
      roles: [] as ActiveRoleRow[],
    };
  }

  const query = new URLSearchParams({
    select: "role,branch_id",
    user_id: `eq.${normalizedUserId}`,
    status: "eq.active",
  });

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1/user_roles?${query}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: parseRestResponseError(responseText),
      roles: [] as ActiveRoleRow[],
    };
  }

  let parsed: unknown;

  try {
    parsed = responseText ? (JSON.parse(responseText) as unknown) : [];
  } catch {
    return {
      ok: false as const,
      status: 502,
      error: "Supabase returned an invalid role lookup response.",
      roles: [] as ActiveRoleRow[],
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: "",
    roles: toActiveRoleRows(parsed),
  };
}
