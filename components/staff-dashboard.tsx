"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  LogOut,
  PhoneCall,
  RefreshCcw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DR_ZARAK_LINKEDIN_URL,
  DR_ZARAK_NAME,
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  DR_ZARAK_WEBSITE_DISPLAY,
  DR_ZARAK_WEBSITE_URL,
} from "@/lib/site-contact";
import {
  getStaffCaseStatusLabel,
  type StaffCaseActionInput,
  type StaffCaseStatus,
  type StaffCasesResponse,
  type StaffCaseSummary,
} from "@/lib/staff-cases";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

type StaffActionType = StaffCaseActionInput["type"];
type CaseFilter = "all" | "due" | "urgent" | "open" | "closed";

interface CurrentStaffIdentity {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

interface StaffDashboardProps {
  initialData: StaffCasesResponse | null;
  initialError: string | null;
  currentStaff: CurrentStaffIdentity;
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

function formatForDateTimeInput(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getUrgencyBadgeClass(urgency: StaffCaseSummary["urgency"]) {
  if (urgency === "urgent") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (urgency === "priority") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getStatusBadgeClass(status: StaffCaseStatus) {
  if (status === "closed") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (status === "escalated") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "active-follow-up" || status === "scheduled") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function buildDefaultAction(caseItem: StaffCaseSummary): StaffActionType {
  if (caseItem.status === "new") {
    return "assign";
  }

  if (caseItem.status === "attempting-contact" || caseItem.status === "waiting-on-family") {
    return "schedule-follow-up";
  }

  return "status";
}

function matchesCaseFilter(caseItem: StaffCaseSummary, filter: CaseFilter) {
  if (filter === "all") {
    return true;
  }

  if (filter === "due") {
    return caseItem.overdue && caseItem.status !== "closed";
  }

  if (filter === "urgent") {
    return caseItem.urgency === "urgent" && caseItem.status !== "closed";
  }

  if (filter === "open") {
    return caseItem.status !== "closed";
  }

  return caseItem.status === "closed";
}

function buildCaseSearchText(caseItem: StaffCaseSummary) {
  return [
    caseItem.caseId,
    caseItem.requesterName,
    caseItem.patientName,
    caseItem.phone,
    caseItem.email,
    caseItem.queueLabel,
    caseItem.laneLabel,
    caseItem.recommendedProgramLabel,
    caseItem.presentingProblem,
    caseItem.teamSummary,
    caseItem.counselorBrief,
  ]
    .join(" ")
    .toLowerCase();
}

function formatRoleLabel(rawRole: string) {
  const normalized = rawRole.trim().toLowerCase();

  if (normalized === "admin") {
    return "Admin";
  }

  if (normalized === "doctor") {
    return "Doctor";
  }

  if (normalized === "counselor") {
    return "Counselor";
  }

  return "Staff";
}

export function StaffDashboard({ initialData, initialError, currentStaff }: StaffDashboardProps) {
  const [data, setData] = useState<StaffCasesResponse | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(initialData === null && !initialError);
  const [selectedCaseId, setSelectedCaseId] = useState(initialData?.cases[0]?.caseId ?? "");
  const [filter, setFilter] = useState<CaseFilter>("open");
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<StaffCaseStatus>("assigned");
  const [nextContactDueAt, setNextContactDueAt] = useState("");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState("");
  const [actionType, setActionType] = useState<StaffActionType>("assign");
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const actor = currentStaff.displayName?.trim() || currentStaff.email.trim();

  const refreshCases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/staff/cases", {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "The dashboard could not be refreshed.");
      }

      const nextData = (await response.json()) as StaffCasesResponse;
      setData(nextData);
      if (!selectedCaseId || !nextData.cases.some((item) => item.caseId === selectedCaseId)) {
        setSelectedCaseId(nextData.cases[0]?.caseId ?? "");
      }
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "The dashboard could not be refreshed.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCaseId]);

  useEffect(() => {
    if (!initialData && !initialError) {
      void refreshCases();
    }
  }, [initialData, initialError, refreshCases]);

  const filteredCases = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const items = data?.cases ?? [];

    return items.filter((caseItem) => {
      if (!matchesCaseFilter(caseItem, filter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return buildCaseSearchText(caseItem).includes(normalizedQuery);
    });
  }, [data?.cases, filter, query]);

  const selectedCase =
    filteredCases.find((caseItem) => caseItem.caseId === selectedCaseId) ??
    data?.cases.find((caseItem) => caseItem.caseId === selectedCaseId) ??
    filteredCases[0] ??
    data?.cases[0] ??
    null;

  useEffect(() => {
    if (!selectedCase) {
      return;
    }

    setSelectedCaseId(selectedCase.caseId);
    setOwner(selectedCase.owner === "Unassigned" ? "" : selectedCase.owner);
    setStatus(selectedCase.status);
    setNextContactDueAt(formatForDateTimeInput(selectedCase.nextContactDueAt));
    setActionType(buildDefaultAction(selectedCase));
  }, [selectedCase]);

  async function handleSubmitAction(nextType: StaffActionType) {
    if (!selectedCase) {
      return;
    }

    if (!actor.trim()) {
      setError("Your staff session is missing identity details. Please sign in again.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: StaffCaseActionInput = {
        actor: actor.trim(),
        type: nextType,
      };

      if (owner.trim()) {
        payload.owner = owner.trim();
      }

      if (status) {
        payload.status = status;
      }

      if (note.trim()) {
        payload.note = note.trim();
      }

      if (nextContactDueAt) {
        payload.nextContactDueAt = new Date(nextContactDueAt).toISOString();
      }

      if (outcome.trim()) {
        payload.outcome = outcome.trim();
      }

      const response = await fetch(`/api/staff/cases/${selectedCase.caseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error || "The case update could not be saved.");
      }

      setNote("");
      setOutcome("");
      await refreshCases();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The case update could not be saved.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);

    try {
      await fetch("/api/staff/logout", {
        method: "POST",
      });
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[linear-gradient(180deg,#f7f5ef_0%,#f1ede4_100%)] px-3 py-3 text-slate-950 sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-[1540px] flex-col gap-4">
        <header className="rounded-[30px] border border-white/80 bg-white/92 px-5 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Staff operations
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
                Willing Ways follow-up dashboard
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Handle AI handoffs, assign owners, track callback due times, and keep aftercare
                and family follow-up from getting lost.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => void refreshCases()}
                disabled={loading}
              >
                <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
              <Link href="/" className="site-action-link">
                <ArrowUpRight className="h-4 w-4" />
                AI home
              </Link>
              <Link href="/staff/admin" className="site-action-link">
                <ArrowUpRight className="h-4 w-4" />
                Admin summary
              </Link>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
              >
                <LogOut className="h-4 w-4" />
                {signingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </header>

        {data?.legacyQueueOnly ? (
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Legacy queue-only data exists in Notion. New structured cases are available, but older
            entries may still need to be reviewed in Notion until they are recreated through the AI
            or booking flow.
          </div>
        ) : null}

        {error ? (
          <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Open cases",
              value: String(data?.summary.totalOpen ?? 0),
              icon: ShieldCheck,
              tone: "emerald",
            },
            {
              label: "Due now",
              value: String(data?.summary.dueNow ?? 0),
              icon: Clock3,
              tone: "amber",
            },
            {
              label: "Urgent open",
              value: String(data?.summary.urgentOpen ?? 0),
              icon: AlertTriangle,
              tone: "rose",
            },
            {
              label: "Family queue",
              value: String(data?.summary.familyQueue ?? 0),
              icon: UserRoundCheck,
              tone: "sky",
            },
            {
              label: "Aftercare queue",
              value: String(data?.summary.aftercareQueue ?? 0),
              icon: CheckCircle2,
              tone: "violet",
            },
          ].map((item) => {
            const toneClass =
              item.tone === "emerald"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : item.tone === "amber"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : item.tone === "rose"
                    ? "border-rose-200 bg-rose-50 text-rose-900"
                    : item.tone === "sky"
                      ? "border-sky-200 bg-sky-50 text-sky-900"
                      : "border-violet-200 bg-violet-50 text-violet-900";
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className={`rounded-[24px] border px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${toneClass}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                      {item.label}
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-[-0.03em]">{item.value}</div>
                  </div>
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[460px_minmax(0,1fr)]">
          <div className="min-h-0 rounded-[30px] border border-white/80 bg-white/92 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, phone, queue, or summary"
                  className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                />

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "open", label: "Open" },
                    { id: "due", label: "Due now" },
                    { id: "urgent", label: "Urgent" },
                    { id: "closed", label: "Closed" },
                    { id: "all", label: "All" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFilter(option.id as CaseFilter)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        filter === option.id
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-[calc(100dvh-25rem)] overflow-y-auto px-3 py-3 sm:px-4">
              {loading && !data ? (
                <div className="flex items-center justify-center py-14 text-sm text-slate-500">
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Loading the staff queue...
                </div>
              ) : filteredCases.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No cases match this filter yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCases.map((caseItem) => (
                    <button
                      key={caseItem.caseId}
                      type="button"
                      onClick={() => setSelectedCaseId(caseItem.caseId)}
                      className={cn(
                        "w-full rounded-[24px] border px-4 py-4 text-left transition",
                        selectedCase?.caseId === caseItem.caseId
                          ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          : "border-slate-200 bg-white hover:border-slate-300",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold tracking-[-0.02em]">
                            {caseItem.requesterName}
                            {caseItem.patientName ? ` → ${caseItem.patientName}` : ""}
                          </div>
                          <div
                            className={cn(
                              "mt-1 text-sm leading-6",
                              selectedCase?.caseId === caseItem.caseId ? "text-white/76" : "text-slate-600",
                            )}
                          >
                            {caseItem.recommendedProgramLabel} · {caseItem.queueLabel}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                            selectedCase?.caseId === caseItem.caseId
                              ? "border-white/15 bg-white/10 text-white"
                              : getUrgencyBadgeClass(caseItem.urgency),
                          )}
                        >
                          {caseItem.urgency}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            selectedCase?.caseId === caseItem.caseId
                              ? "border-white/15 bg-white/10 text-white"
                              : getStatusBadgeClass(caseItem.status),
                          )}
                        >
                          {getStaffCaseStatusLabel(caseItem.status)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium",
                            selectedCase?.caseId === caseItem.caseId
                              ? "border-white/15 bg-white/10 text-white"
                              : "border-slate-200 bg-slate-50 text-slate-700",
                          )}
                        >
                          Due {formatDateTime(caseItem.nextContactDueAt)}
                        </span>
                        {caseItem.overdue ? (
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs font-medium",
                              selectedCase?.caseId === caseItem.caseId
                                ? "border-amber-200/40 bg-amber-200/10 text-amber-100"
                                : "border-amber-200 bg-amber-50 text-amber-800",
                            )}
                          >
                            Overdue
                          </span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 rounded-[30px] border border-white/80 bg-white/92 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            {!selectedCase ? (
              <div className="flex h-full items-center justify-center px-6 py-16 text-center text-sm text-slate-500">
                Select a case to review the AI handoff, next contact window, and follow-up actions.
              </div>
            ) : (
              <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="min-h-0 border-b border-slate-100 px-5 py-5 xl:border-b-0 xl:border-r xl:px-6">
                  <div className="max-h-[calc(100dvh-20rem)] overflow-y-auto pr-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {selectedCase.caseId}
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          {selectedCase.requesterName}
                        </h2>
                        <div className="mt-2 text-sm leading-6 text-slate-600">
                          {selectedCase.patientName
                            ? `Patient: ${selectedCase.patientName} · `
                            : ""}
                          {selectedCase.phone}
                          {selectedCase.email ? ` · ${selectedCase.email}` : ""}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getUrgencyBadgeClass(selectedCase.urgency)}`}>
                          {selectedCase.urgency.toUpperCase()}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(selectedCase.status)}`}>
                          {getStaffCaseStatusLabel(selectedCase.status)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Queue", selectedCase.queueLabel],
                        ["Lane", selectedCase.laneLabel],
                        ["Program", selectedCase.recommendedProgramLabel],
                        ["Owner", selectedCase.owner],
                        ["Callback due", formatDateTime(selectedCase.callbackDueAt)],
                        ["Next contact", formatDateTime(selectedCase.nextContactDueAt)],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </div>
                          <div className="mt-2 text-sm font-medium text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      {[
                        ["Presenting problem", selectedCase.presentingProblem || selectedCase.noteSummary],
                        ["Team summary", selectedCase.teamSummary || "No AI summary captured yet."],
                        ["Counselor brief", selectedCase.counselorBrief || "No counselor brief captured yet."],
                        ["Family context", selectedCase.familyContext || "Family context still needs clarification."],
                        ["History", selectedCase.historyContext || "History still needs clarification."],
                        ["Expectations", selectedCase.expectations || "Expectations not captured yet."],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </div>
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      {[
                        { label: "Risk flags", items: selectedCase.riskFlags },
                        { label: "Patient follow-up", items: selectedCase.patientFollowUp },
                        { label: "Family follow-up", items: selectedCase.familyFollowUp },
                        { label: "Family follow-along", items: selectedCase.familyFollowAlong },
                        {
                          label: "Intervention preparation",
                          items: selectedCase.interventionPreparation,
                        },
                        {
                          label: "Treatment expectations",
                          items: selectedCase.treatmentExpectations,
                        },
                      ].map(({ label, items }) => (
                        <div key={label} className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {label}
                          </div>
                          {Array.isArray(items) && items.length > 0 ? (
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                              {items.map((item) => (
                                <li key={item} className="flex gap-2">
                                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-3 text-sm text-slate-500">No items captured.</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Event timeline
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedCase.events.length > 0 ? (
                          selectedCase.events.map((event) => (
                            <div key={event.eventId} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold text-slate-900">
                                  {event.actor} · {event.type.replace(/-/g, " ")}
                                </div>
                                <div className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</div>
                              </div>
                              {(event.note || event.outcome || event.status || event.owner) ? (
                                <div className="mt-2 space-y-1 text-sm text-slate-600">
                                  {event.status ? <div>Status: {getStaffCaseStatusLabel(event.status)}</div> : null}
                                  {event.owner ? <div>Owner: {event.owner}</div> : null}
                                  {event.nextContactDueAt ? <div>Next contact: {formatDateTime(event.nextContactDueAt)}</div> : null}
                                  {event.note ? <div>Note: {event.note}</div> : null}
                                  {event.outcome ? <div>Outcome: {event.outcome}</div> : null}
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-slate-500">No staff actions recorded yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="min-h-0 px-5 py-5 xl:px-6">
                  <div className="max-h-[calc(100dvh-20rem)] overflow-y-auto pr-1">
                    <div className="rounded-[26px] bg-[linear-gradient(160deg,#54111f_0%,#7f1d33_45%,#111827_100%)] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">
                        Follow-up controls
                      </div>
                      <div className="mt-3 text-xl font-semibold tracking-[-0.02em]">
                        Keep this case moving
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/76">
                        Record who owns the case, when the next contact is due, and what happened
                        on the latest touchpoint.
                      </p>
                    </div>

                    <div className="mt-4 space-y-4 rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Signed-in staff
                        </div>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{actor}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {currentStaff.email} · {formatRoleLabel(currentStaff.role)}
                        </div>
                      </div>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Owner</span>
                        <input
                          value={owner}
                          onChange={(event) => setOwner(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                          placeholder="Assign owner"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Status</span>
                        <select
                          value={status}
                          onChange={(event) => setStatus(event.target.value as StaffCaseStatus)}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                        >
                          {[
                            "new",
                            "assigned",
                            "attempting-contact",
                            "scheduled",
                            "active-follow-up",
                            "waiting-on-family",
                            "escalated",
                            "closed",
                          ].map((option) => (
                            <option key={option} value={option}>
                              {getStaffCaseStatusLabel(option as StaffCaseStatus)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Next contact due</span>
                        <input
                          type="datetime-local"
                          value={nextContactDueAt}
                          onChange={(event) => setNextContactDueAt(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Latest note</span>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                          placeholder="What happened, what was clarified, and what matters next?"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold text-slate-700">Outcome</span>
                        <input
                          value={outcome}
                          onChange={(event) => setOutcome(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-slate-400"
                          placeholder="Optional short outcome"
                        />
                      </label>

                      <div className="rounded-[20px] border border-slate-200 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Quick actions
                        </div>
                        <div className="mt-3 grid gap-2">
                          {[
                            { id: "assign", label: "Assign owner" },
                            { id: "status", label: "Update status" },
                            { id: "contact-attempt", label: "Log contact attempt" },
                            { id: "schedule-follow-up", label: "Schedule follow-up" },
                            { id: "note", label: "Add note" },
                            { id: "close", label: "Close case" },
                          ].map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setActionType(item.id as StaffActionType)}
                              className={cn(
                                "rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition",
                                actionType === item.id
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                              )}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button
                        type="button"
                        className="h-12 w-full rounded-2xl"
                        disabled={submitting}
                        onClick={() => void handleSubmitAction(actionType)}
                      >
                        {submitting ? (
                          <>
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Saving update...
                          </>
                        ) : (
                          "Save case update"
                        )}
                      </Button>
                    </div>

                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-[0_10px_26px_rgba(15,23,42,0.04)]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Operational notes
                      </div>
                      <ul className="mt-3 space-y-2 leading-6">
                        <li>Use structured notes, not raw patient-story duplication.</li>
                        <li>Set the next contact window every time you touch the case.</li>
                        <li>Close the case only when follow-up is complete or formally handed over.</li>
                      </ul>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                      <a href={DR_ZARAK_PHONE_HREF} className="site-inline-link">
                        <PhoneCall className="h-4 w-4" />
                        {DR_ZARAK_NAME} · {DR_ZARAK_PHONE_DISPLAY}
                      </a>
                      <a
                        href={DR_ZARAK_LINKEDIN_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="site-inline-link"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        LinkedIn
                      </a>
                      <a
                        href={DR_ZARAK_WEBSITE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="site-inline-link"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                        {DR_ZARAK_WEBSITE_DISPLAY}
                      </a>
                    </div>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
