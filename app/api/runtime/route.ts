import { isStaffDashboardConfigured } from "@/lib/server/staff-auth";
import { isStructuredCaseStoreConfigured } from "@/lib/server/staff-case-store";
import {
  isNotionDailyDigestConfigured,
  isUsageAnalyticsConfigured,
} from "@/lib/server/usage-analytics";
import { isSupabaseAuthConfigured } from "@/lib/supabase/env";

export async function GET() {
  const caseStoreConfigured = isStructuredCaseStoreConfigured();
  const bookingConfigured = caseStoreConfigured;
  const staffDashboardAuthConfigured = isStaffDashboardConfigured();
  const staffDashboardStorageConfigured = caseStoreConfigured;

  return Response.json({
    bookingConfigured,
    caseStoreConfigured,
    realtimeConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    serverKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    notionDailyDigestConfigured: isNotionDailyDigestConfigured(),
    usageAnalyticsConfigured: isUsageAnalyticsConfigured(),
    supabaseAuthConfigured: isSupabaseAuthConfigured(),
    staffDashboardAuthConfigured,
    staffDashboardStorageConfigured,
    staffDashboardConfigured:
      staffDashboardAuthConfigured && staffDashboardStorageConfigured,
  });
}
