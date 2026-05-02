import Link from "next/link";
import { cookies } from "next/headers";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  BOOKING_BRANCH_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  getBookingOptionLabel,
} from "@/lib/booking";
import { getOpsDashboardOverview } from "@/lib/server/usage-analytics";
import {
  isStaffApprovalsConfigured,
  listPendingStaffApprovalRequests,
  listStaffApprovalBranches,
  resolvePendingStaffApprovalRequest,
} from "@/lib/server/staff-admin-approvals";
import {
  isEmailAliasStoreConfigured,
  listEmailAliasRequests,
  resolveEmailAliasRequest,
  type EmailAliasRequest,
  type EmailAliasStatus,
} from "@/lib/server/email-alias-store";
import {
  getStaffSessionCookieName,
  isStaffDashboardConfigured,
  readStaffSessionToken,
} from "@/lib/server/staff-auth";
import { isStructuredCaseStoreConfigured, listStaffCases } from "@/lib/server/staff-case-store";
import {
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  DR_ZARAK_WEBSITE_DISPLAY,
  DR_ZARAK_WEBSITE_URL,
} from "@/lib/site-contact";
import type { StaffCaseSummary } from "@/lib/staff-cases";

export const metadata = {
  title: "Willing Ways Admin Summary",
  robots: {
    index: false,
    follow: false,
  },
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 1 ? 4 : 2,
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

function getBarHeight(value: number, maxValue: number) {
  if (maxValue <= 0) {
    return 12;
  }

  return Math.max(12, Math.round((value / maxValue) * 100));
}

function formatDateTime(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(new Date(timestamp));
}

function getUrgencyTone(urgency: StaffCaseSummary["urgency"]) {
  if (urgency === "urgent") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (urgency === "priority") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getEmailAliasStatusTone(status: EmailAliasStatus) {
  if (status === "configured") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "approved") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function buildTopList(values: string[], limit = 4) {
  const counts = new Map<string, number>();

  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

const STAFF_APPROVAL_ROLE_OPTIONS = [
  { id: "doctor", label: "Doctor" },
  { id: "counselor", label: "Counselor" },
  { id: "staff", label: "Staff / coordinator" },
] as const;

function normalizeApprovalRole(rawRole: string) {
  const normalized = rawRole.trim().toLowerCase();

  if (normalized === "doctor") {
    return "doctor";
  }

  if (
    normalized === "counselor" ||
    normalized === "counsellor" ||
    normalized === "pending_clinician"
  ) {
    return "counselor";
  }

  return "staff";
}

async function submitStaffApprovalDecision(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffToken = cookieStore.get(getStaffSessionCookieName())?.value;
  const session = readStaffSessionToken(staffToken);

  if (!session || session.role !== "admin") {
    return;
  }

  const requestId = Number(formData.get("requestId"));
  const decisionValue = String(formData.get("decision") || "").toLowerCase();
  const decision =
    decisionValue === "reject"
      ? "reject"
      : decisionValue === "approve"
        ? "approve"
        : null;

  if (!Number.isInteger(requestId) || requestId <= 0 || !decision) {
    return;
  }

  const role = normalizeApprovalRole(String(formData.get("approvedRole") || ""));
  const branchId = String(formData.get("approvedBranchId") || "").trim() || null;

  await resolvePendingStaffApprovalRequest({
    requestId,
    decidedByUserId: session.userId,
    decision,
    approvedRole: role,
    approvedBranchId: branchId,
  });

  revalidatePath("/staff/admin");
}

async function submitEmailAliasDecision(formData: FormData) {
  "use server";

  const cookieStore = await cookies();
  const staffToken = cookieStore.get(getStaffSessionCookieName())?.value;
  const session = readStaffSessionToken(staffToken);

  if (!session || session.role !== "admin") {
    return;
  }

  const requestId = String(formData.get("requestId") || "").trim();
  const decisionValue = String(formData.get("decision") || "").trim().toLowerCase();
  const status: EmailAliasStatus | null =
    decisionValue === "approve"
      ? "approved"
      : decisionValue === "configured"
        ? "configured"
        : decisionValue === "reject"
          ? "rejected"
          : null;

  if (!requestId || !status) {
    return;
  }

  await resolveEmailAliasRequest({
    requestId,
    status,
    decidedByUserId: session.userId,
    adminNote: String(formData.get("adminNote") || ""),
  });

  revalidatePath("/staff/admin");
  revalidatePath("/staff/email");
}

function AdminUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div id="main-content" className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7f5ef_0%,#f1ede4_100%)] px-4 py-8 text-slate-950 sm:px-6">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-white/80 bg-white/94 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
          Admin summary unavailable
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/staff" className="site-action-link">
            Back to staff desk
          </Link>
          <Link href="/" className="site-action-link">
            AI home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function StaffAdminPage() {
  noStore();

  if (!isStaffDashboardConfigured() || !isStructuredCaseStoreConfigured()) {
    return (
      <AdminUnavailable
        title="The operations summary is not configured yet"
        description="Configure Supabase auth, the staff dashboard session secret, and the PostgreSQL case store before using the admin summary."
      />
    );
  }

  const cookieStore = await cookies();
  const staffToken = cookieStore.get(getStaffSessionCookieName())?.value;
  const session = readStaffSessionToken(staffToken);

  if (!session) {
    return (
      <AdminUnavailable
        title="Staff sign-in required"
        description="Please sign in through the staff dashboard first, then open the admin summary."
      />
    );
  }

  if (session.role !== "admin") {
    return (
      <AdminUnavailable
        title="Admin access required"
        description="This view is reserved for Dr. Sadaqat and approved administrators because it exposes operational load and AI cost reporting."
      />
    );
  }

  const overview = await getOpsDashboardOverview(7);
  const caseStore = await listStaffCases("", "");
  const staffCases = caseStore.cases;
  const openCases = staffCases.filter((item) => item.status !== "closed");
  const recentBriefs = staffCases.slice(0, 6);
  const topRiskFlags = buildTopList(openCases.flatMap((item) => item.riskFlags), 5);
  const topQueueLabels = buildTopList(openCases.map((item) => item.queueLabel), 4);
  const topPrograms = buildTopList(openCases.map((item) => item.recommendedProgramLabel), 4);
  const topBranches = buildTopList(
    openCases.map((item) =>
      getBookingOptionLabel(BOOKING_BRANCH_OPTIONS, item.branchPreference),
    ),
    4,
  );
  const topServices = buildTopList(
    openCases.map((item) =>
      getBookingOptionLabel(BOOKING_SERVICE_OPTIONS, item.serviceInterest),
    ),
    4,
  );
  const maxDailyCost = Math.max(...overview.daily.map((item) => item.estimatedCostUsd), 0);
  const maxDailySessions = Math.max(
    ...overview.daily.map((item) => item.chatCompletions + item.realtimeSessions),
    0,
  );
  const approvalsConfigured = isStaffApprovalsConfigured();
  let pendingApprovals: Awaited<ReturnType<typeof listPendingStaffApprovalRequests>> = [];
  let approvalBranches: Awaited<ReturnType<typeof listStaffApprovalBranches>> = [];
  let approvalsError: string | null = null;
  const emailAliasStoreConfigured = isEmailAliasStoreConfigured();
  let emailAliasRequests: EmailAliasRequest[] = [];
  let emailAliasError: string | null = null;

  if (approvalsConfigured) {
    try {
      [pendingApprovals, approvalBranches] = await Promise.all([
        listPendingStaffApprovalRequests(),
        listStaffApprovalBranches(),
      ]);
    } catch (error) {
      approvalsError =
        error instanceof Error
          ? error.message
          : "Pending signup requests could not be loaded right now.";
    }
  }

  if (emailAliasStoreConfigured) {
    try {
      emailAliasRequests = await listEmailAliasRequests("all");
    } catch (error) {
      emailAliasError =
        error instanceof Error
          ? error.message
          : "Team email alias requests could not be loaded right now.";
    }
  }

  const pendingEmailAliasRequests = emailAliasRequests.filter(
    (request) => request.status === "pending",
  );

  return (
    <div id="main-content" className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7f5ef_0%,#f1ede4_100%)] px-4 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-4">
        <header className="rounded-[32px] border border-white/80 bg-white/94 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
                Dr Sadaqat admin view
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
                Daily operations and AI cost summary
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                One page for workload pressure, overdue follow-up, and estimated OpenAI spend so
                the team can act before cases or costs drift.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/staff" className="site-action-link">
                Staff desk
              </Link>
              <Link href="/staff/email" className="site-action-link">
                Team email
              </Link>
              <Link href="/login" className="site-action-link">
                Role-based login
              </Link>
              <a
                href={DR_ZARAK_WEBSITE_URL}
                target="_blank"
                rel="noreferrer"
                className="site-action-link"
              >
                Platform: {DR_ZARAK_WEBSITE_DISPLAY}
              </a>
              <a href={DR_ZARAK_PHONE_HREF} className="site-action-link">
                {DR_ZARAK_PHONE_DISPLAY}
              </a>
              <a
                href="/api/ops/daily-digest"
                target="_blank"
                rel="noreferrer"
                className="site-action-link"
              >
                Run Notion digest
              </a>
            </div>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Today's AI cost",
              value: formatUsd(overview.today.estimatedCostUsd),
              tone: "border-sky-200 bg-sky-50 text-sky-950",
            },
            {
              label: "Open cases",
              value: String(overview.queue.openCases),
              tone: "border-emerald-200 bg-emerald-50 text-emerald-950",
            },
            {
              label: "Overdue open",
              value: String(overview.queue.overdueOpenCases),
              tone: "border-amber-200 bg-amber-50 text-amber-950",
            },
            {
              label: "Urgent open",
              value: String(overview.queue.urgentOpenCases),
              tone: "border-rose-200 bg-rose-50 text-rose-950",
            },
            {
              label: "Unassigned open",
              value: String(overview.queue.unassignedOpenCases),
              tone: "border-violet-200 bg-violet-50 text-violet-950",
            },
          ].map((item) => (
            <div
              key={item.label}
              className={`rounded-[24px] border px-4 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${item.tone}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{item.value}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              System map
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
              Where the information lives
            </h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                {
                  title: "Supabase",
                  body: approvalsConfigured
                    ? `Auth, staff roles, and ${pendingApprovals.length} pending access requests.`
                    : "Auth and roles are wired, but approval actions still need the service key.",
                },
                {
                  title: "Neon / PostgreSQL",
                  body: `${staffCases.length} structured patient and family briefs are available for dashboard review.`,
                },
                {
                  title: "Realtime AI",
                  body: `${overview.today.realtimeSessions} voice sessions and ${overview.today.realtimeTranscriptions} transcription events were logged today.`,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">{item.body}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Clinical demand map
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
              What the AI line is surfacing most
            </h2>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Top risk cues",
                  items: topRiskFlags.length
                    ? topRiskFlags.map((item) => `${item.label} · ${item.count}`)
                    : ["No risk flags captured yet."],
                },
                {
                  title: "Busiest queues",
                  items: topQueueLabels.length
                    ? topQueueLabels.map((item) => `${item.label} · ${item.count}`)
                    : ["No queue data yet."],
                },
                {
                  title: "Most requested services",
                  items: topServices.length
                    ? topServices.map((item) => `${item.label} · ${item.count}`)
                    : ["No service demand yet."],
                },
                {
                  title: "Branch demand",
                  items: topBranches.length
                    ? topBranches.map((item) => `${item.label} · ${item.count}`)
                    : ["No branch preferences captured yet."],
                },
                {
                  title: "Program mix",
                  items: topPrograms.length
                    ? topPrograms.map((item) => `${item.label} · ${item.count}`)
                    : ["No program recommendations yet."],
                },
              ].map((group) => (
                <div
                  key={group.title}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="text-sm font-semibold text-slate-950">{group.title}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.items.map((item) => (
                      <div
                        key={`${group.title}:${item}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Staff onboarding approvals
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Pending clinician and staff signups
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Review each pending access request and approve only verified Willing Ways team
                members.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              Pending now: {pendingApprovals.length}
            </div>
          </div>

          {!approvalsConfigured ? (
            <div className="mt-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to enable approval actions for pending
              clinician and staff requests.
            </div>
          ) : approvalsError ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {approvalsError}
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No pending staff signups right now.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {pendingApprovals.map((request) => (
                <form
                  key={request.requestId}
                  action={submitStaffApprovalDecision}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <input type="hidden" name="requestId" value={String(request.requestId)} />

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {request.fullName || "Unnamed request"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {request.email || request.userId}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Requested: {request.requestedRoleLabel}
                        {request.branchName ? ` · ${request.branchName}` : ""}
                        {request.preferredLanguage
                          ? ` · Language: ${request.preferredLanguage}`
                          : ""}
                      </div>
                    </div>

                    <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                      {new Date(request.requestedAt).toLocaleString("en-PK", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Karachi",
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Activate role
                      </span>
                      <select
                        name="approvedRole"
                        defaultValue={normalizeApprovalRole(request.requestedRole)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                      >
                        {STAFF_APPROVAL_ROLE_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Assign branch
                      </span>
                      <select
                        name="approvedBranchId"
                        defaultValue={request.branchId ?? ""}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                      >
                        <option value="">No branch assignment</option>
                        {approvalBranches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                            {branch.city ? ` (${branch.city})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Approve request
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
                    >
                      Reject request
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Team email approvals
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                @willingways.uk alias requests
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Staff can request a branded alias from the team email center. Admin approval records
                the request and marks it ready for Cloudflare Email Routing or a full mailbox
                provider.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                Pending: {pendingEmailAliasRequests.length}
              </div>
              <Link href="/staff/email" className="site-action-link">
                Staff request page
              </Link>
            </div>
          </div>

          {!emailAliasStoreConfigured ? (
            <div className="mt-5 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Add <code>DATABASE_URL</code> or <code>NEON_DATABASE_URL</code> to store team email
              alias requests.
            </div>
          ) : emailAliasError ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {emailAliasError}
            </div>
          ) : emailAliasRequests.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No team email alias requests yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {emailAliasRequests.map((request) => (
                <form
                  key={request.requestId}
                  action={submitEmailAliasDecision}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <input type="hidden" name="requestId" value={request.requestId} />

                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-900">
                        {request.aliasEmail}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {request.requesterName || request.requesterEmail}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Forwarding target: {request.forwardingEmail}
                      </div>
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getEmailAliasStatusTone(
                        request.status,
                      )}`}
                    >
                      {request.status}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Staff reason
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {request.reason || "No reason supplied."}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-slate-200 bg-white px-3 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Routing state
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {request.cloudflareStatus.replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Requested: {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Admin note
                    </span>
                    <input
                      name="adminNote"
                      defaultValue={request.adminNote}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                      placeholder="Example: Verify role, then add Cloudflare route."
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                    >
                      Approve alias
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="configured"
                      className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Mark configured
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 transition hover:bg-rose-100"
                    >
                      Reject
                    </button>
                  </div>
                </form>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Last 7 days
                </div>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                  AI cost and conversation volume
                </h2>
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                Pakistan day
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-slate-700">Estimated OpenAI cost</div>
                <div className="mt-4 flex h-40 items-end gap-3">
                  {overview.daily.map((item) => (
                    <div key={`cost-${item.date}`} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t-[16px] bg-[linear-gradient(180deg,#7dd3fc_0%,#0ea5e9_100%)]"
                        style={{ height: `${getBarHeight(item.estimatedCostUsd, maxDailyCost)}%` }}
                      />
                      <div className="text-[11px] text-slate-500">{item.date.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700">Chats + voice starts</div>
                <div className="mt-4 flex h-40 items-end gap-3">
                  {overview.daily.map((item) => {
                    const combined = item.chatCompletions + item.realtimeSessions;
                    return (
                      <div key={`volume-${item.date}`} className="flex flex-1 flex-col items-center gap-2">
                        <div
                          className="w-full rounded-t-[16px] bg-[linear-gradient(180deg,#c4b5fd_0%,#8b5cf6_100%)]"
                          style={{ height: `${getBarHeight(combined, maxDailySessions)}%` }}
                        />
                        <div className="text-[11px] text-slate-500">{item.date.slice(5)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Today
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
              Operational focus
            </h2>

            <div className="mt-5 space-y-3">
              {[
                `New cases today: ${overview.queue.newCasesToday}`,
                `Active follow-up cases: ${overview.queue.activeFollowUpCases}`,
                `Chat completions today: ${overview.today.chatCompletions}`,
                `Voice sessions started today: ${overview.today.realtimeSessions}`,
                `Voice transcription events today: ${overview.today.realtimeTranscriptions}`,
                `Read-aloud requests today: ${overview.today.speechGenerations}`,
                `Booking submissions today: ${overview.today.bookingSubmissions}`,
                `Tokens processed today: ${overview.today.totalTokens.toLocaleString("en-US")}`,
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                >
                  {line}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[20px] border border-slate-200 bg-white px-4 py-4">
              <div className="text-sm font-medium text-slate-900">Notion daily digest</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {overview.notionDigest.configured
                  ? overview.notionDigest.lastSyncedAt
                    ? `Configured. Last sync: ${overview.notionDigest.lastSyncedDate} at ${overview.notionDigest.lastSyncedAt}.`
                    : "Configured, but no daily digest has been synced yet."
                  : "Not configured. The app will keep running without Notion."}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[30px] border border-white/80 bg-white/94 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Patient and family briefs
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Recent cases the AI line has documented
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                These are the structured briefs coming out of the live intake and voice workflow.
                This is the clearest operational proof that the app reduces documentation friction
                while keeping the team informed.
              </p>
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
              Total recorded briefs: {staffCases.length}
            </div>
          </div>

          {recentBriefs.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
              No structured patient briefs are stored yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 xl:grid-cols-2">
              {recentBriefs.map((caseItem) => (
                <div
                  key={caseItem.caseId}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        {caseItem.patientName || caseItem.requesterName || "Unnamed case"}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {getBookingOptionLabel(BOOKING_SERVICE_OPTIONS, caseItem.serviceInterest)}
                        {" · "}
                        {getBookingOptionLabel(BOOKING_BRANCH_OPTIONS, caseItem.branchPreference)}
                      </div>
                    </div>

                    <div
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${getUrgencyTone(
                        caseItem.urgency,
                      )}`}
                    >
                      {caseItem.urgency}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Counselor brief
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {caseItem.counselorBrief || caseItem.teamSummary || "No brief captured yet."}
                      </p>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Queue and next step
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {caseItem.queueLabel} · {caseItem.recommendedProgramLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Due: {formatDateTime(caseItem.nextContactDueAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {(caseItem.riskFlags.length > 0 ? caseItem.riskFlags : [caseItem.laneLabel])
                      .slice(0, 4)
                      .map((item) => (
                        <div
                          key={`${caseItem.caseId}:${item}`}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {item}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
