import type { JSONSchema7 } from "json-schema";

import {
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  type BookingAvailabilityId,
  type BookingBranchId,
  type BookingContactMethodId,
  type BookingLanguageId,
  type BookingRelationId,
  type BookingRequestPayload,
  type BookingServiceId,
} from "@/lib/booking";

export type SupportResourceId =
  | "family-conversation"
  | "intervention-prep"
  | "treatment-expectations"
  | "family-follow-along"
  | "calming-steps"
  | "relapse-next-step"
  | "halt-reset"
  | "urge-surfing"
  | "trigger-map"
  | "daily-recovery-structure"
  | "family-boundary-script"
  | "lapse-response"
  | "post-rehab-check-in";

export interface RememberPreferredNameToolInput {
  preferredName: string;
}

export interface BookSessionToolInput {
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
  notes: string;
  consentConfirmed: boolean;
}

export interface ContactToolInput {
  branchPreference?: BookingBranchId;
}

export interface CrisisRedirectToolInput {
  reason?: string;
}

export interface SendResourceToolInput {
  resourceId: SupportResourceId;
}

export interface EscalateToHumanToolInput {
  reason?: string;
}

export interface KnowledgeLookupToolInput {
  query: string;
}

const RELATION_IDS = BOOKING_RELATION_OPTIONS.map((option) => option.id);
const BRANCH_IDS = BOOKING_BRANCH_OPTIONS.map((option) => option.id);
const SERVICE_IDS = BOOKING_SERVICE_OPTIONS.map((option) => option.id);
const CONTACT_METHOD_IDS = BOOKING_CONTACT_METHOD_OPTIONS.map((option) => option.id);
const LANGUAGE_IDS = BOOKING_LANGUAGE_OPTIONS.map((option) => option.id);
const AVAILABILITY_IDS = BOOKING_AVAILABILITY_OPTIONS.map((option) => option.id);
const RESOURCE_IDS: SupportResourceId[] = [
  "family-conversation",
  "intervention-prep",
  "treatment-expectations",
  "family-follow-along",
  "calming-steps",
  "relapse-next-step",
  "halt-reset",
  "urge-surfing",
  "trigger-map",
  "daily-recovery-structure",
  "family-boundary-script",
  "lapse-response",
  "post-rehab-check-in",
];

const BRANCH_CONTACT_LOOKUP: Record<
  BookingBranchId,
  {
    name: string;
    address: string;
    phones: string[];
    email?: string;
  }
> = {
  "first-available": {
    name: "First available Willing Ways team",
    address: "Lahore, Karachi, or Islamabad",
    phones: ["0300-7413639"],
    email: "info@willingways.org",
  },
  lahore: {
    name: "Lahore (Main Branch)",
    address: "71-A Jail Road, Near Apwa College, Lahore",
    phones: ["0300-7413639", "0322-7413639", "042-35408416-19-21"],
    email: "Lahore@willingways.org",
  },
  "karachi-clifton": {
    name: "Karachi - Clifton",
    address: "C-159, Block-2, Clifton, Karachi",
    phones: ["0300-7413639"],
    email: "Karachi@willingways.org",
  },
  "karachi-nazimabad": {
    name: "Karachi - Nazimabad",
    address: "1-A-1/29, Block 1, Nazimabad, Karachi",
    phones: ["0314-6865271"],
  },
  islamabad: {
    name: "Islamabad",
    address: "Willing Ways Building, Traders Colony, 17 Mile Murree Road, Islamabad",
    phones: ["0300-7413639", "051-2871666", "051-2602886"],
    email: "Islamabad@willingways.org",
  },
};

const RESOURCE_CONTENT: Record<
  SupportResourceId,
  {
    title: string;
    summary: string;
    useWhen?: string;
    duration?: string;
    points: string[];
  }
> = {
  "family-conversation": {
    title: "Family conversation guide",
    summary:
      "Start calm, stay specific, and avoid blame. The goal is to open a path to treatment, not to win an argument.",
    useWhen:
      "Use when a family member is preparing for a difficult conversation with a loved one.",
    points: [
      "Speak when everyone is relatively calm, not in the middle of a fight or intoxication.",
      "Use short facts about what you have seen instead of labels or insults.",
      "Say what kind of help you want them to accept: evaluation, intervention planning, or admission guidance.",
      "Keep boundaries clear and loving. Do not threaten what you will not follow through on.",
    ],
  },
  "intervention-prep": {
    title: "Intervention preparation",
    summary:
      "Willing Ways usually prepares the family first so the patient meets a calm, united, and structured system.",
    useWhen:
      "Use when the family wants to help but the patient is still denying the need for treatment.",
    points: [
      "Agree on one lead family contact before approaching the patient.",
      "Write down recent safety issues, substance use pattern, and past treatment attempts.",
      "Avoid mixed messages such as rescuing, bargaining, and then setting limits again.",
      "Be ready for denial. The family should stay steady, not reactive.",
    ],
  },
  "treatment-expectations": {
    title: "What treatment may feel like",
    summary:
      "Treatment is more than stopping the substance. It usually includes detox planning, mood work, counseling, family work, and follow-up.",
    useWhen:
      "Use when the patient or family is scared about what Willing Ways treatment will actually involve.",
    points: [
      "Early days may feel uncomfortable as the body and mood start adjusting.",
      "The team may recommend inpatient, outpatient, psychiatric review, or family intervention depending on risk and severity.",
      "Recovery work continues after detox. Structure and follow-through matter.",
      "Families are usually asked to change patterns as well, not only the patient.",
    ],
  },
  "family-follow-along": {
    title: "How families can follow along",
    summary:
      "Families usually help most when they stay aligned, informed, and consistent instead of trying to control every moment.",
    useWhen:
      "Use when a patient is in treatment or just came home and the family wants to support recovery without enabling.",
    points: [
      "Stay in touch with the assigned Willing Ways team contact rather than creating many separate instructions.",
      "Learn the difference between support and enabling.",
      "Follow the agreed communication and visitation boundaries.",
      "Watch for relapse, secrecy, and emotional triggers after discharge, then use follow-up support early.",
    ],
  },
  "calming-steps": {
    title: "Immediate calming steps",
    summary:
      "These steps do not replace treatment. They help someone slow the moment down enough to choose a safer next step.",
    useWhen:
      "Use when the caller is distressed, impulsive, panicky, or close to acting without thinking clearly.",
    duration: "1-2 minutes",
    points: [
      "Take one slow breath in through the nose for 4 counts, then out for 6 counts, three times.",
      "Move away from arguments, locked rooms, substances, and sharp objects if the situation feels unsafe.",
      "Call a trusted family member into the room if being alone is making the distress worse.",
      "If there is self-harm, overdose, or violence risk, call 1122 or the Willing Ways helpline immediately.",
    ],
  },
  "relapse-next-step": {
    title: "Relapse next step",
    summary:
      "Relapse is a warning sign that the plan needs adjustment. It does not mean recovery is over.",
    useWhen:
      "Use right after a lapse or relapse, especially when shame is starting to take over the conversation.",
    points: [
      "Focus first on immediate safety and the amount or type of substance being used now.",
      "Do not turn the conversation into shame or punishment.",
      "Reconnect the patient and family with follow-up support quickly instead of waiting for the crisis to grow.",
      "Review what changed before the relapse: mood, company, secrecy, conflict, or stopping follow-up.",
    ],
  },
  "halt-reset": {
    title: "HALT reset",
    summary:
      "Check whether hunger, anger, loneliness, or tiredness is making relapse risk worse right now, then act on the biggest one first.",
    useWhen:
      "Use when cravings, irritability, hopelessness, or emotional overload are rising but the situation is not yet a medical emergency.",
    duration: "60-90 seconds",
    points: [
      "Ask: what is strongest right now, hungry, angry, lonely, or tired?",
      "Choose one immediate reset: eat something simple, step away from conflict, call one safe person, or protect sleep and rest.",
      "Delay any major decision until that one body-state issue is handled.",
      "If risk stays high after the reset, move quickly into follow-up support or a human callback.",
    ],
  },
  "urge-surfing": {
    title: "Urge surfing",
    summary:
      "Treat the craving like a wave. Notice it, breathe through it, and let it rise and fall without obeying it.",
    useWhen:
      "Use when the patient feels a strong craving and needs a short exercise instead of a lecture.",
    duration: "60-120 seconds",
    points: [
      "Say out loud what the urge feels like in the body: tight chest, restless legs, hot face, racing thoughts, or something else.",
      "Rate the urge from 0 to 10, then take five slower breaths than usual.",
      "Tell yourself: this urge is strong but temporary; I do not have to act on it.",
      "When the wave drops even a little, move immediately to one safer action such as leaving the place, calling support, or drinking water and walking.",
    ],
  },
  "trigger-map": {
    title: "Trigger map",
    summary:
      "Name the people, places, feelings, and times of day that make relapse more likely, then change one of them today.",
    useWhen:
      "Use when the user says they keep ending up in the same risky situation.",
    duration: "2-3 minutes",
    points: [
      "Pick one high-risk person, one place, and one emotional trigger that repeatedly comes before use.",
      "Choose one prevention move for today: avoid, shorten exposure, take a safe person with you, or leave earlier.",
      "Decide on one replacement activity for the most risky time window.",
      "Save one support number and one exit sentence before the high-risk situation happens.",
    ],
  },
  "daily-recovery-structure": {
    title: "Daily recovery structure",
    summary:
      "Relapse risk rises when the day becomes empty, chaotic, or emotionally unstructured. Recovery needs a daily frame.",
    useWhen:
      "Use after discharge or whenever the patient says things felt better in treatment than at home.",
    duration: "2 minutes",
    points: [
      "Anchor the day with wake time, meals, medicine if prescribed, movement, and one follow-up or support touchpoint.",
      "Protect the most risky hours with a planned activity instead of unstructured isolation.",
      "Keep money, transport, and contacts around risky places more controlled for now.",
      "Review the next 24 hours, not the next six months. Stability grows one day at a time.",
    ],
  },
  "family-boundary-script": {
    title: "Family boundary script",
    summary:
      "A clear family stand should sound loving, steady, and specific, not shaming or dramatic.",
    useWhen:
      "Use when the family needs to say no to enabling while still inviting treatment and follow-up.",
    duration: "60-90 seconds",
    points: [
      "Start with care: we love you and we want recovery, not a fight.",
      "State one clear stand: we will support treatment and follow-up, but we will not fund, hide, or normalize use.",
      "Keep the consequence real and consistent. Do not threaten anything the family will not do.",
      "End with the treatment path, not with blame: we are ready to help you take the next step now.",
    ],
  },
  "lapse-response": {
    title: "Lapse response plan",
    summary:
      "If use happened, do the next right thing fast: reduce danger, reduce shame, and reconnect to help before the lapse becomes a full relapse cycle.",
    useWhen:
      "Use when the caller reports recent use, secrecy after discharge, or a frightening slip.",
    duration: "2-3 minutes",
    points: [
      "First check immediate danger: overdose risk, self-harm risk, violent conflict, or unsafe intoxication.",
      "Remove access to the most immediate trigger, risky company, or place if possible.",
      "Speak without humiliation: this lapse is serious, but it is a signal to act, not a reason to give up.",
      "Reconnect to Willing Ways follow-up support quickly instead of waiting for the situation to get worse.",
    ],
  },
  "post-rehab-check-in": {
    title: "Post-rehab check-in",
    summary:
      "The weeks after rehab need active follow-up. Overconfidence, emotional swings, and stopping structure too early can raise relapse risk.",
    useWhen:
      "Use when the patient is back home, saying they are fine now, or skipping follow-up because they feel better.",
    duration: "2 minutes",
    points: [
      "Ask how cravings, sleep, anger, loneliness, and daily structure have been in the last few days.",
      "Check whether follow-up counseling, medicine routines, and family agreements are still being followed.",
      "Normalize that discomfort after rehab does not mean treatment failed; it often means support still needs to stay active.",
      "If warning signs are rising, act early with follow-up support instead of waiting for a bigger setback.",
    ],
  },
};

export const BOOK_SESSION_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    requesterName: {
      type: "string",
      description: "Name of the person asking for help.",
    },
    patientName: {
      type: "string",
      description: "Patient name if the caller is comfortable sharing it.",
    },
    relation: {
      type: "string",
      enum: [...RELATION_IDS],
      description: "Whether the caller is the patient, family, doctor/referrer, or other.",
    },
    phone: {
      type: "string",
      description: "Best callback number for the Willing Ways team.",
    },
    email: {
      type: "string",
      description: "Optional email address for follow-up.",
    },
    branchPreference: {
      type: "string",
      enum: [...BRANCH_IDS],
      description: "Preferred city or first available team.",
    },
    serviceInterest: {
      type: "string",
      enum: [...SERVICE_IDS],
      description: "Type of support the caller is asking for.",
    },
    contactMethod: {
      type: "string",
      enum: [...CONTACT_METHOD_IDS],
      description: "How the team should contact the caller.",
    },
    contactLanguage: {
      type: "string",
      enum: [...LANGUAGE_IDS],
      description: "Preferred follow-up language.",
    },
    availability: {
      type: "string",
      enum: [...AVAILABILITY_IDS],
      description: "Best time window for follow-up.",
    },
    notes: {
      type: "string",
      description: "Short summary of the case, current risks, and what kind of help is needed.",
    },
    consentConfirmed: {
      type: "boolean",
      description: "True only after the caller clearly agrees to have their request shared with the Willing Ways team for follow-up.",
    },
  },
  required: [
    "requesterName",
    "relation",
    "phone",
    "branchPreference",
    "serviceInterest",
    "contactMethod",
    "contactLanguage",
    "availability",
    "notes",
    "consentConfirmed",
  ],
} satisfies JSONSchema7;

export const GET_CONTACT_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    branchPreference: {
      type: "string",
      enum: [...BRANCH_IDS],
      description: "Preferred branch if the user asks for a specific city, otherwise use first-available.",
    },
  },
} satisfies JSONSchema7;

export const CRISIS_REDIRECT_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    reason: {
      type: "string",
      description: "Short note about the crisis reason, such as suicide risk, overdose, or violent relapse.",
    },
  },
} satisfies JSONSchema7;

export const SEND_RESOURCE_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    resourceId: {
      type: "string",
      enum: [...RESOURCE_IDS],
      description: "Choose the most useful practical resource for the caller's immediate need.",
    },
  },
  required: ["resourceId"],
} satisfies JSONSchema7;

export const ESCALATE_TO_HUMAN_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    reason: {
      type: "string",
      description: "Why the caller wants a human team member right now.",
    },
  },
} satisfies JSONSchema7;

export const REMEMBER_PREFERRED_NAME_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    preferredName: {
      type: "string",
      description:
        "The caller's confirmed preferred name after the AI has asked and the caller has agreed that this is the name to use.",
    },
  },
  required: ["preferredName"],
} satisfies JSONSchema7;

export const KNOWLEDGE_LOOKUP_TOOL_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      description:
        "Short search query for Dr. Sadaqat Ali's method, Willing Ways treatment philosophy, relapse prevention, family-system guidance, or other factual Willing Ways knowledge.",
    },
  },
  required: ["query"],
} satisfies JSONSchema7;

export function buildBookingPayloadFromToolInput(
  input: BookSessionToolInput,
): BookingRequestPayload {
  const cleanNotes = input.notes.trim();
  const fallbackProgram =
    input.serviceInterest === "family-intervention"
      ? "family-first-response"
      : input.serviceInterest === "follow-up"
        ? "post-rehab-30-day"
        : "post-rehab-30-day";

  return {
    requesterName: input.requesterName.trim(),
    patientName: input.patientName?.trim() || "",
    relation: input.relation,
    phone: input.phone.trim(),
    email: input.email?.trim() || "",
    branchPreference: input.branchPreference,
    serviceInterest: input.serviceInterest,
    contactMethod: input.contactMethod,
    contactLanguage: input.contactLanguage,
    availability: input.availability,
    notes: cleanNotes,
    consent: true,
    source: "ai-guided-intake",
    aiIntake: {
      urgency:
        input.serviceInterest === "family-intervention" || input.serviceInterest === "follow-up"
          ? "priority"
          : "routine",
      detectedLanguage:
        input.contactLanguage === "punjabi"
          ? "punjabi"
          : input.contactLanguage === "urdu"
            ? "urdu"
            : "english",
      presentingProblem: cleanNotes,
      historyContext: "",
      familyContext:
        input.relation === "family"
          ? "A family member requested support through text chat."
          : input.relation === "doctor"
            ? "A doctor or referrer requested support through text chat."
            : "The patient requested support through text chat.",
      expectations: "",
      teamSummary: cleanNotes,
      counselorBrief: `Why now: ${cleanNotes}\nRisk: routine\nCaller relationship: ${input.relation}\nTreatment history: Still needs confirmation.\nFamily system issue: Still needs confirmation.\nRecommended next step: Return contact and confirm the first suitable Willing Ways step.\nMissing info: Build a fuller AI handoff on callback if needed.`,
      serviceLane:
        input.serviceInterest === "family-intervention"
          ? "Family coaching"
          : input.serviceInterest === "follow-up"
            ? "Aftercare follow-up"
            : "Treatment readiness",
      recommendedProgram: fallbackProgram,
      nextContactWindow:
        input.serviceInterest === "family-intervention" || input.serviceInterest === "follow-up"
          ? "Within 12 hours"
          : "Within 24 hours",
      todayAction:
        input.serviceInterest === "family-intervention"
          ? "Write one calm family script and one boundary before the callback."
          : "Keep the phone available for follow-up and note the main concern in one sentence.",
      riskFlags: [],
      patientFollowUp: input.relation === "self" ? ["Confirm the first follow-up touchpoint on callback."] : [],
      familyFollowUp:
        input.relation === "family"
          ? ["Keep one lead family contact and one shared message until callback."]
          : [],
      nextStepRecommendation: "Return contact, confirm the story, and route toward the best Willing Ways next step.",
      interventionPreparation: [],
      treatmentExpectations: [],
      familyFollowAlong: [],
      missingInformation: ["A fuller handoff summary should be confirmed on callback."],
    },
    website: "",
  };
}

export function getContactResult(input?: ContactToolInput) {
  const preferredBranch = input?.branchPreference ?? "first-available";
  const branch = BRANCH_CONTACT_LOOKUP[preferredBranch] ?? BRANCH_CONTACT_LOOKUP["first-available"];

  return {
    helpline: "0300-7413639",
    website: "www.willingways.org",
    preferredBranch: branch.name,
    branchAddress: branch.address,
    branchPhones: branch.phones,
    branchEmail: branch.email ?? "info@willingways.org",
    note:
      "Willing Ways can guide admissions, interventions, psychiatric review, and follow-up support through this team.",
  };
}

export function getCrisisRedirectResult(input?: CrisisRedirectToolInput) {
  return {
    reason: input?.reason?.trim() || "Immediate safety concern",
    emergencyNumber: "1122",
    willingWaysHelpline: "0300-7413639",
    actions: [
      "Do not stay alone with the emergency if there is immediate danger.",
      "Call 1122 or get to the nearest emergency room right now if there is overdose, self-harm risk, or violence risk.",
      "Call the Willing Ways emergency helpline immediately so the family can be guided on the next step.",
    ],
    note:
      "Normal counseling should stop until the immediate safety step has been taken.",
  };
}

export function getSupportResourceResult(input: SendResourceToolInput) {
  const resource = RESOURCE_CONTENT[input.resourceId];

  return {
    resourceId: input.resourceId,
    title: resource.title,
    summary: resource.summary,
    useWhen: resource.useWhen,
    duration: resource.duration,
    points: resource.points,
    helpline: "0300-7413639",
  };
}

export function getHumanEscalationResult(input?: EscalateToHumanToolInput) {
  return {
    reason: input?.reason?.trim() || "Caller wants a human follow-up",
    helpline: "0300-7413639",
    note:
      "If the caller wants a callback instead of calling directly, collect the minimum details and use the booking tool so the Willing Ways team can follow up.",
  };
}

export function normalizePreferredName(value: string | undefined | null) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function getRememberedPreferredNameResult(
  input: RememberPreferredNameToolInput,
) {
  return {
    ok: true,
    preferredName: normalizePreferredName(input.preferredName),
  };
}
