import type { AiIntakePayload, BookingRelationId, BookingServiceId } from "@/lib/booking";
import type { VoiceCallFocusId } from "@/lib/chat";
import {
  getRecoveryProgram,
  type RecoveryProgramId,
} from "@/lib/recovery-programs";

export type TriageLaneId =
  | "urgent-safety"
  | "same-day-callback"
  | "family-coaching"
  | "aftercare-follow-up"
  | "treatment-readiness";

export type QueueSectionId =
  | "needs-same-day-action"
  | "aftercare-follow-through"
  | "family-system-work"
  | "new-intakes";

export interface CaseWorkflowProfile {
  laneId: TriageLaneId;
  queueSectionId: QueueSectionId;
  laneEnglishLabel: string;
  laneUrduLabel: string;
  queueEnglishLabel: string;
  queueUrduLabel: string;
  slaMinutes: number;
  slaEnglishLabel: string;
  slaUrduLabel: string;
  riskRating: "low" | "medium" | "high";
  recommendedProgramId: RecoveryProgramId;
  recommendedProgramEnglishLabel: string;
  recommendedProgramUrduLabel: string;
  counselorNextAction: string;
  todayActionFallback: string;
  summary: string;
}

interface BuildCaseWorkflowOptions {
  focus: VoiceCallFocusId;
  relation: BookingRelationId;
  serviceInterest: BookingServiceId;
  aiIntake: Partial<AiIntakePayload> & { urgency?: AiIntakePayload["urgency"] };
}

const LANE_META: Record<
  TriageLaneId,
  {
    queueSectionId: QueueSectionId;
    laneEnglishLabel: string;
    laneUrduLabel: string;
    queueEnglishLabel: string;
    queueUrduLabel: string;
    slaMinutes: number;
    slaEnglishLabel: string;
    slaUrduLabel: string;
  }
> = {
  "urgent-safety": {
    queueSectionId: "needs-same-day-action",
    laneEnglishLabel: "Urgent safety lane",
    laneUrduLabel: "فوری حفاظتی lane",
    queueEnglishLabel: "Needs same-day action",
    queueUrduLabel: "آج ہی کارروائی درکار",
    slaMinutes: 60,
    slaEnglishLabel: "Within 1 hour",
    slaUrduLabel: "1 گھنٹے میں",
  },
  "same-day-callback": {
    queueSectionId: "needs-same-day-action",
    laneEnglishLabel: "Same-day callback",
    laneUrduLabel: "اسی دن callback",
    queueEnglishLabel: "Needs same-day action",
    queueUrduLabel: "آج ہی کارروائی درکار",
    slaMinutes: 240,
    slaEnglishLabel: "Same day",
    slaUrduLabel: "اسی دن",
  },
  "family-coaching": {
    queueSectionId: "family-system-work",
    laneEnglishLabel: "Family coaching",
    laneUrduLabel: "خاندانی coaching",
    queueEnglishLabel: "Family system work",
    queueUrduLabel: "خاندانی نظام پر کام",
    slaMinutes: 720,
    slaEnglishLabel: "Within 12 hours",
    slaUrduLabel: "12 گھنٹوں میں",
  },
  "aftercare-follow-up": {
    queueSectionId: "aftercare-follow-through",
    laneEnglishLabel: "Aftercare follow-up",
    laneUrduLabel: "aftercare follow-up",
    queueEnglishLabel: "Aftercare follow-through",
    queueUrduLabel: "aftercare follow-through",
    slaMinutes: 720,
    slaEnglishLabel: "Within 12 hours",
    slaUrduLabel: "12 گھنٹوں میں",
  },
  "treatment-readiness": {
    queueSectionId: "new-intakes",
    laneEnglishLabel: "Treatment readiness",
    laneUrduLabel: "treatment readiness",
    queueEnglishLabel: "New intakes",
    queueUrduLabel: "نئی intakes",
    slaMinutes: 1440,
    slaEnglishLabel: "Within 24 hours",
    slaUrduLabel: "24 گھنٹوں میں",
  },
};

function normalizeForMatch(value: string | undefined) {
  return (value ?? "").toLowerCase();
}

function isAftercareContext(options: BuildCaseWorkflowOptions) {
  const text = [
    options.aiIntake.presentingProblem,
    options.aiIntake.historyContext,
    options.aiIntake.teamSummary,
    options.aiIntake.nextStepRecommendation,
    ...(options.aiIntake.riskFlags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    options.serviceInterest === "follow-up" ||
    options.focus === "general-support" ||
    /relapse|lapse|craving|warning|discharge|post rehab|post-rehab|follow-up|aftercare|home/.test(
      text,
    )
  );
}

function pickLane(options: BuildCaseWorkflowOptions): TriageLaneId {
  const urgency = options.aiIntake.urgency ?? "routine";

  if (urgency === "urgent" || options.focus === "crisis-triage") {
    return "urgent-safety";
  }

  if (
    options.focus === "family-coach" ||
    options.serviceInterest === "family-intervention"
  ) {
    return "family-coaching";
  }

  if (urgency === "priority" || options.serviceInterest === "psychiatric") {
    return "same-day-callback";
  }

  if (isAftercareContext(options)) {
    return "aftercare-follow-up";
  }

  return "treatment-readiness";
}

function pickProgramId(options: BuildCaseWorkflowOptions, laneId: TriageLaneId): RecoveryProgramId {
  const text = [
    options.aiIntake.presentingProblem,
    options.aiIntake.historyContext,
    options.aiIntake.teamSummary,
    options.aiIntake.nextStepRecommendation,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (laneId === "family-coaching") {
    return /intervention|denial/.test(text)
      ? "intervention-readiness"
      : "family-first-response";
  }

  if (laneId === "aftercare-follow-up") {
    return /craving|urge|trigger/.test(text)
      ? "cravings-rescue"
      : /warning|secrecy|isolation|anger|missed/.test(text)
        ? "relapse-warning-radar"
        : "post-rehab-30-day";
  }

  if (laneId === "same-day-callback" || laneId === "urgent-safety") {
    return "relapse-warning-radar";
  }

  return options.relation === "family" ? "family-first-response" : "post-rehab-30-day";
}

function buildCounselorAction(options: BuildCaseWorkflowOptions, laneId: TriageLaneId) {
  if (laneId === "urgent-safety") {
    return "Review immediate safety, confirm direct callback ownership, and document the fastest human follow-up route.";
  }

  if (laneId === "family-coaching") {
    return "Review the family system briefly, confirm the lead family contact, and continue with coaching or intervention planning.";
  }

  if (laneId === "aftercare-follow-up") {
    return "Review relapse warning signs, assign one concrete next-step exercise, and schedule the next follow-up touchpoint.";
  }

  if (laneId === "same-day-callback") {
    return "Return contact the same day, confirm urgency, and route toward the correct clinical or counseling service.";
  }

  return "Review the intake, confirm missing essentials, and guide the caller into the most suitable next treatment step.";
}

function buildTodayActionFallback(programId: RecoveryProgramId) {
  if (programId === "family-first-response") {
    return "Rehearse one calm family conversation using two facts, one feeling, and one clear ask.";
  }

  if (programId === "intervention-readiness") {
    return "Choose one family spokesperson and write one treatment ask before speaking to the patient.";
  }

  if (programId === "cravings-rescue") {
    return "Do one short craving exercise now and leave one risky person, place, or situation today.";
  }

  if (programId === "relapse-warning-radar") {
    return "List the strongest warning signs from the last 7 days and define the threshold for same-day escalation.";
  }

  return "Build today around one anchor routine, one risky hour to watch, and one confirmed follow-up point.";
}

function buildSummary(options: BuildCaseWorkflowOptions, profile: CaseWorkflowProfile) {
  const whyNow = normalizeForMatch(options.aiIntake.presentingProblem) || "Context still needs confirmation.";
  const risk =
    options.aiIntake.riskFlags && options.aiIntake.riskFlags.length > 0
      ? options.aiIntake.riskFlags.join("; ")
      : options.aiIntake.urgency === "urgent"
        ? "Urgent safety concern flagged."
        : "No specific risk flags captured yet.";
  const familyIssue =
    normalizeForMatch(options.aiIntake.familyContext) || "Family-system context still needs confirmation.";
  const history =
    normalizeForMatch(options.aiIntake.historyContext) || "Treatment and history details still need confirmation.";
  const missing =
    options.aiIntake.missingInformation && options.aiIntake.missingInformation.length > 0
      ? options.aiIntake.missingInformation.join("; ")
      : "No major missing items flagged.";

  return [
    `Why now: ${whyNow}`,
    `Risk: ${risk}`,
    `Caller relationship: ${options.relation}`,
    `Treatment history: ${history}`,
    `Family system issue: ${familyIssue}`,
    `Recommended next step: ${profile.counselorNextAction}`,
    `Missing info: ${missing}`,
  ].join("\n");
}

export function buildCaseWorkflowProfile(options: BuildCaseWorkflowOptions): CaseWorkflowProfile {
  const laneId = pickLane(options);
  const programId = pickProgramId(options, laneId);
  const laneMeta = LANE_META[laneId];
  const program = getRecoveryProgram(programId);

  const profile: CaseWorkflowProfile = {
    laneId,
    queueSectionId: laneMeta.queueSectionId,
    laneEnglishLabel: laneMeta.laneEnglishLabel,
    laneUrduLabel: laneMeta.laneUrduLabel,
    queueEnglishLabel: laneMeta.queueEnglishLabel,
    queueUrduLabel: laneMeta.queueUrduLabel,
    slaMinutes: laneMeta.slaMinutes,
    slaEnglishLabel: laneMeta.slaEnglishLabel,
    slaUrduLabel: laneMeta.slaUrduLabel,
    riskRating:
      options.aiIntake.urgency === "urgent"
        ? "high"
        : options.aiIntake.urgency === "priority"
          ? "medium"
          : "low",
    recommendedProgramId: programId,
    recommendedProgramEnglishLabel: program?.englishLabel ?? programId,
    recommendedProgramUrduLabel: program?.urduLabel ?? programId,
    counselorNextAction: buildCounselorAction(options, laneId),
    todayActionFallback: buildTodayActionFallback(programId),
    summary: "",
  };

  profile.summary = buildSummary(options, profile);

  return profile;
}
