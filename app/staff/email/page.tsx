import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";

import {
  createEmailAliasRequest,
  isEmailAliasStoreConfigured,
  listEmailAliasRequestsForUser,
  normalizeEmailLocalPart,
} from "@/lib/server/email-alias-store";
import {
  getStaffSessionCookieName,
  isStaffDashboardConfigured,
  readStaffSessionToken,
} from "@/lib/server/staff-auth";

export const metadata = {
  title: "Team Email Center | Willing Ways AI Counselor",
  robots: {
    index: false,
    follow: false,
  },
};

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

function getStatusTone(status: string) {
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

async function readCurrentStaffSession() {
  const cookieStore = await cookies();
  const staffToken = cookieStore.get(getStaffSessionCookieName())?.value;
  return readStaffSessionToken(staffToken);
}

async function submitEmailAliasRequest(formData: FormData) {
  "use server";

  const session = await readCurrentStaffSession();

  if (!session) {
    redirect("/staff/email?error=signin");
  }

  if (!isEmailAliasStoreConfigured()) {
    redirect("/staff/email?error=database");
  }

  try {
    await createEmailAliasRequest({
      requesterUserId: session.userId,
      requesterName: session.displayName,
      requesterEmail: session.email,
      desiredLocalPart: String(formData.get("desiredLocalPart") || ""),
      forwardingEmail: String(formData.get("forwardingEmail") || session.email),
      reason: String(formData.get("reason") || ""),
    });
  } catch {
    redirect("/staff/email?error=request");
  }

  revalidatePath("/staff/email");
  revalidatePath("/staff/admin");
  redirect("/staff/email?requested=1");
}

function StaffEmailUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-5xl items-center px-4 py-8 sm:px-6">
      <div className="w-full rounded-[36px] border border-slate-200 bg-white p-8 shadow-[0_28px_90px_rgba(15,23,42,0.08)]">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800">
          Team email unavailable
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-[15px]">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/staff" className="site-action-link">
            Staff desk
          </Link>
          <Link href="/" className="site-action-link">
            AI home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function StaffEmailPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();

  if (!isStaffDashboardConfigured() || !isEmailAliasStoreConfigured()) {
    return (
      <StaffEmailUnavailable
        title="The team email center needs production configuration"
        description="Configure Supabase staff auth, the staff session secret, and the PostgreSQL case store before accepting @willingways.uk alias requests."
      />
    );
  }

  const session = await readCurrentStaffSession();

  if (!session) {
    return (
      <StaffEmailUnavailable
        title="Staff sign-in required"
        description="Please sign in through the staff dashboard first, then open the team email center."
      />
    );
  }

  const params = (await searchParams) ?? {};
  const requests = await listEmailAliasRequestsForUser(session.userId);
  const suggestedLocalPart = normalizeEmailLocalPart(
    session.email.split("@")[0] || session.displayName,
  );
  const requested = params.requested === "1";
  const errorCode = typeof params.error === "string" ? params.error : "";

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7f5ef_0%,#f1ede4_100%)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[34px] border border-white/80 bg-white/94 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
            Team email center
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Request your @willingways.uk alias
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-[15px]">
            This creates an admin-reviewed alias request. After approval, the operations team can
            create the Cloudflare Email Routing rule or connect a full mailbox provider if a real
            inbox is required.
          </p>

          {requested ? (
            <div className="mt-5 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Request received. An admin can approve it from the Dr. Sadaqat admin portal.
            </div>
          ) : null}

          {errorCode ? (
            <div className="mt-5 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              The request could not be saved. Check the alias format and try a different name.
            </div>
          ) : null}

          <form action={submitEmailAliasRequest} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Desired address
              </span>
              <div className="flex rounded-2xl border border-slate-200 bg-white focus-within:border-slate-400">
                <input
                  name="desiredLocalPart"
                  defaultValue={suggestedLocalPart}
                  className="h-12 min-w-0 flex-1 rounded-l-2xl border-0 bg-transparent px-4 text-base text-slate-950 outline-none"
                  placeholder="first.last"
                  pattern="[a-zA-Z0-9._-]{3,48}"
                  required
                />
                <span className="inline-flex h-12 items-center rounded-r-2xl border-l border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600">
                  @willingways.uk
                </span>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Forward to
              </span>
              <input
                name="forwardingEmail"
                type="email"
                defaultValue={session.email}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-slate-400"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Why do you need this alias?
              </span>
              <textarea
                name="reason"
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-slate-400"
                placeholder="Example: counseling follow-up, admissions coordination, family training communication..."
                required
              />
            </label>

            <button type="submit" className="site-cta-button w-full justify-center">
              Submit alias request
            </button>
          </form>

          <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            Cloudflare Email Routing can forward incoming mail to verified destinations. It is not
            a full hosted mailbox with IMAP/SMTP login. For real staff inboxes, connect Google
            Workspace, Microsoft 365, Zoho, or another mailbox provider.
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/94 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                My requests
              </div>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                Alias status
              </h2>
            </div>
            <Link href="/staff" className="site-action-link">
              Staff desk
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              No email alias requests yet.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {requests.map((request) => (
                <div
                  key={request.requestId}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold text-slate-950">
                        {request.aliasEmail}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        Forwards to {request.forwardingEmail}
                      </div>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${getStatusTone(
                        request.status,
                      )}`}
                    >
                      {request.status}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Requested {formatDateTime(request.createdAt)}
                  </div>
                  {request.adminNote ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                      Admin note: {request.adminNote}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
