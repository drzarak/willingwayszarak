export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

const DEFAULT_SUPABASE_URL = "https://gaseldatahoqdxfbycjt.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Q-hQFPpHT8Qxgitoo7poyw_pvO6Aayt";

function trim(value: string | undefined) {
  return value?.trim() ?? "";
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = trim(process.env.NEXT_PUBLIC_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const publishableKey =
    trim(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    trim(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}

export function isSupabaseAuthConfigured() {
  return getSupabasePublicConfig() !== null;
}

export function shouldProtectStaffRoute() {
  return trim(process.env.SUPABASE_PROTECT_STAFF_ROUTE).toLowerCase() === "true";
}

export function shouldEnforceRoleChecks() {
  return trim(process.env.SUPABASE_ENFORCE_ROLE_CHECKS).toLowerCase() === "true";
}
