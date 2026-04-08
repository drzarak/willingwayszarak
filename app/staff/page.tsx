import { cookies } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";

import { StaffDashboard } from "@/components/staff-dashboard";
import { StaffDashboardAuth } from "@/components/staff-dashboard-auth";
import { listStaffCases } from "@/lib/server/staff-case-store";
import {
  getStaffSessionCookieName,
  isStaffDashboardConfigured,
  readStaffSessionToken,
} from "@/lib/server/staff-auth";
import { isStructuredCaseStoreConfigured } from "@/lib/server/staff-case-store";

export const metadata = {
  title: "Willing Ways Staff Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

function StaffDashboardUnavailable() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl items-center px-4 py-8 sm:px-6">
      <div className="w-full rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
          Staff setup required
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
          The staff dashboard is not configured yet
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
          Add <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
          {" "}or <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and <code>STAFF_DASHBOARD_SESSION_SECRET</code>,
          plus the PostgreSQL case store, so the
          internal follow-up desk can run through approved Supabase staff accounts.
        </p>
      </div>
    </div>
  );
}

export default async function StaffPage() {
  noStore();

  if (!isStaffDashboardConfigured()) {
    return <StaffDashboardUnavailable />;
  }

  const cookieStore = await cookies();
  const staffToken = cookieStore.get(getStaffSessionCookieName())?.value;
  const session = readStaffSessionToken(staffToken);

  if (!session) {
    return <StaffDashboardAuth />;
  }

  if (!isStructuredCaseStoreConfigured()) {
    return <StaffDashboardUnavailable />;
  }

  let initialData = null;
  let initialError: string | null = null;

  try {
    initialData = await listStaffCases("", "");
  } catch (error) {
    initialError =
      error instanceof Error
        ? error.message
        : "The staff queue could not be loaded right now.";
  }

  return (
    <StaffDashboard
      initialData={initialData}
      initialError={initialError}
      currentStaff={{
        userId: session.userId,
        displayName: session.displayName,
        email: session.email,
        role: session.role,
      }}
    />
  );
}
