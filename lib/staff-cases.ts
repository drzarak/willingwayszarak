import type {
  AiIntakePayload,
  AiIntakeUrgencyId,
  BookingAvailabilityId,
  BookingBranchId,
  BookingContactMethodId,
  BookingLanguageId,
  BookingRelationId,
  BookingServiceId,
  BookingSourceId,
} from "@/lib/booking";
import type { QueueSectionId } from "@/lib/case-workflows";
import type { RecoveryProgramId } from "@/lib/recovery-programs";

export type StaffCaseStatus =
  | "new"
  | "assigned"
  | "attempting-contact"
  | "scheduled"
  | "active-follow-up"
  | "waiting-on-family"
  | "escalated"
  | "closed";

export type StaffCaseEventType =
  | "created"
  | "assigned"
  | "status-changed"
  | "contact-attempted"
  | "follow-up-scheduled"
  | "note-added"
  | "closed";

export interface StaffCaseSnapshot {
  caseId: string;
  createdAt: string;
  updatedAt: string;
  status: StaffCaseStatus;
  owner: string;
  requesterName: string;
  patientName: string;
  relation: BookingRelationId;
  phone: string;
  email: string;
  branchPreference: BookingBranchId;
  serviceInterest: BookingServiceId;
  contactMethod: BookingContactMethodId;
  contactLanguage: BookingLanguageId;
  availability: BookingAvailabilityId;
  source: BookingSourceId;
  consentConfirmed: boolean;
  urgency: AiIntakeUrgencyId;
  queueSectionId: QueueSectionId;
  queueLabel: string;
  laneLabel: string;
  recommendedProgramId: RecoveryProgramId;
  recommendedProgramLabel: string;
  callbackDueAt: string;
  nextContactDueAt: string;
  noteSummary: string;
  teamSummary: string;
  counselorBrief: string;
  presentingProblem: string;
  historyContext: string;
  familyContext: string;
  expectations: string;
  riskFlags: string[];
  patientFollowUp: string[];
  familyFollowUp: string[];
  familyFollowAlong: string[];
  interventionPreparation: string[];
  treatmentExpectations: string[];
  nextStepRecommendation: string;
  todayAction: string;
}

export interface StaffCaseEvent {
  eventId: string;
  caseId: string;
  type: StaffCaseEventType;
  createdAt: string;
  actor: string;
  status?: StaffCaseStatus;
  owner?: string;
  note?: string;
  nextContactDueAt?: string;
  outcome?: string;
}

export interface StaffCaseRecord {
  snapshot: StaffCaseSnapshot;
  events: StaffCaseEvent[];
}

export interface StaffCaseSummary extends StaffCaseSnapshot {
  events: StaffCaseEvent[];
  latestEvent: StaffCaseEvent | null;
  overdue: boolean;
}

export interface StaffDashboardSummary {
  totalOpen: number;
  dueNow: number;
  urgentOpen: number;
  familyQueue: number;
  aftercareQueue: number;
}

export interface StaffCasesResponse {
  cases: StaffCaseSummary[];
  summary: StaffDashboardSummary;
  legacyQueueOnly: boolean;
}

export interface StaffCaseActionInput {
  actor: string;
  type:
    | "assign"
    | "status"
    | "contact-attempt"
    | "schedule-follow-up"
    | "note"
    | "close";
  owner?: string;
  status?: StaffCaseStatus;
  note?: string;
  nextContactDueAt?: string;
  outcome?: string;
}

export const STAFF_CASE_STATUS_OPTIONS: Array<{
  id: StaffCaseStatus;
  label: string;
}> = [
  { id: "new", label: "New" },
  { id: "assigned", label: "Assigned" },
  { id: "attempting-contact", label: "Trying contact" },
  { id: "scheduled", label: "Scheduled" },
  { id: "active-follow-up", label: "Active follow-up" },
  { id: "waiting-on-family", label: "Waiting on family" },
  { id: "escalated", label: "Escalated" },
  { id: "closed", label: "Closed" },
];

export function getStaffCaseStatusLabel(status: StaffCaseStatus) {
  return STAFF_CASE_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status;
}

export function summarizeStaffCases(cases: StaffCaseSummary[]): StaffDashboardSummary {
  return cases.reduce<StaffDashboardSummary>(
    (summary, item) => {
      if (item.status !== "closed") {
        summary.totalOpen += 1;
      }

      if (item.overdue && item.status !== "closed") {
        summary.dueNow += 1;
      }

      if (item.urgency === "urgent" && item.status !== "closed") {
        summary.urgentOpen += 1;
      }

      if (item.queueSectionId === "family-system-work" && item.status !== "closed") {
        summary.familyQueue += 1;
      }

      if (item.queueSectionId === "aftercare-follow-through" && item.status !== "closed") {
        summary.aftercareQueue += 1;
      }

      return summary;
    },
    {
      totalOpen: 0,
      dueNow: 0,
      urgentOpen: 0,
      familyQueue: 0,
      aftercareQueue: 0,
    },
  );
}

export function buildStaffCaseSummary(record: StaffCaseRecord): StaffCaseSummary {
  const latestEvent = record.events[0] ?? null;
  const nextDueTimestamp = Date.parse(record.snapshot.nextContactDueAt || record.snapshot.callbackDueAt);

  return {
    ...record.snapshot,
    events: record.events,
    latestEvent,
    overdue: Number.isFinite(nextDueTimestamp) ? nextDueTimestamp < Date.now() : false,
  };
}

export function buildStaffCaseSnapshot(input: {
  caseId: string;
  createdAt: string;
  updatedAt: string;
  owner?: string;
  requesterName: string;
  patientName?: string;
  relation: BookingRelationId;
  phone: string;
  email?: string;
  branchPreference: BookingBranchId;
  serviceInterest: BookingServiceId;
  contactMethod: BookingContactMethodId;
  contactLanguage: BookingLanguageId;
  availability: BookingAvailabilityId;
  source: BookingSourceId;
  consentConfirmed: boolean;
  urgency: AiIntakeUrgencyId;
  queueSectionId: QueueSectionId;
  queueLabel: string;
  laneLabel: string;
  recommendedProgramId: RecoveryProgramId;
  recommendedProgramLabel: string;
  callbackDueAt: string;
  nextContactDueAt?: string;
  notes: string;
  aiIntake?: Partial<AiIntakePayload>;
}): StaffCaseSnapshot {
  return {
    caseId: input.caseId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    status: "new",
    owner: input.owner?.trim() || "Unassigned",
    requesterName: input.requesterName,
    patientName: input.patientName?.trim() || "",
    relation: input.relation,
    phone: input.phone,
    email: input.email?.trim() || "",
    branchPreference: input.branchPreference,
    serviceInterest: input.serviceInterest,
    contactMethod: input.contactMethod,
    contactLanguage: input.contactLanguage,
    availability: input.availability,
    source: input.source,
    consentConfirmed: input.consentConfirmed,
    urgency: input.urgency,
    queueSectionId: input.queueSectionId,
    queueLabel: input.queueLabel,
    laneLabel: input.laneLabel,
    recommendedProgramId: input.recommendedProgramId,
    recommendedProgramLabel: input.recommendedProgramLabel,
    callbackDueAt: input.callbackDueAt,
    nextContactDueAt: input.nextContactDueAt || input.callbackDueAt,
    noteSummary: input.notes,
    teamSummary: input.aiIntake?.teamSummary?.trim() || "",
    counselorBrief: input.aiIntake?.counselorBrief?.trim() || "",
    presentingProblem: input.aiIntake?.presentingProblem?.trim() || "",
    historyContext: input.aiIntake?.historyContext?.trim() || "",
    familyContext: input.aiIntake?.familyContext?.trim() || "",
    expectations: input.aiIntake?.expectations?.trim() || "",
    riskFlags: input.aiIntake?.riskFlags ?? [],
    patientFollowUp: input.aiIntake?.patientFollowUp ?? [],
    familyFollowUp: input.aiIntake?.familyFollowUp ?? [],
    familyFollowAlong: input.aiIntake?.familyFollowAlong ?? [],
    interventionPreparation: input.aiIntake?.interventionPreparation ?? [],
    treatmentExpectations: input.aiIntake?.treatmentExpectations ?? [],
    nextStepRecommendation: input.aiIntake?.nextStepRecommendation?.trim() || "",
    todayAction: input.aiIntake?.todayAction?.trim() || "",
  };
}
