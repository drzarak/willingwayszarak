import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicConfig } from "@/lib/supabase/env";
import { extractRoleIds, listActiveRolesForSupabaseClient } from "@/lib/supabase/roles";

interface UpdatedSessionResult {
  response: NextResponse;
  authenticated: boolean;
  roles: string[];
}

interface UpdateSessionOptions {
  loadRoles?: boolean;
}

export async function updateSupabaseSession(
  request: NextRequest,
  options: UpdateSessionOptions = {},
): Promise<UpdatedSessionResult> {
  let response = NextResponse.next({
    request,
  });
  const config = getSupabasePublicConfig();

  if (!config) {
    return {
      response,
      authenticated: false,
      roles: [],
    };
  }

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Keep auth refresh adjacent to client creation to avoid session drift.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;
  const userId = typeof claims?.sub === "string" ? claims.sub.trim() : "";
  const roleRows =
    userId && options.loadRoles ? await listActiveRolesForSupabaseClient(supabase, userId) : [];

  return {
    response,
    authenticated: Boolean(userId),
    roles: extractRoleIds(roleRows),
  };
}
