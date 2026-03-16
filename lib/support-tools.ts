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
  | "relapse-next-step";

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
    points: string[];
  }
> = {
  "family-conversation": {
    title: "Family conversation guide",
    summary:
      "Start calm, stay specific, and avoid blame. The goal is to open a path to treatment, not to win an argument.",
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
    points: [
      "Focus first on immediate safety and the amount or type of substance being used now.",
      "Do not turn the conversation into shame or punishment.",
      "Reconnect the patient and family with follow-up support quickly instead of waiting for the crisis to grow.",
      "Review what changed before the relapse: mood, company, secrecy, conflict, or stopping follow-up.",
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

export function buildBookingPayloadFromToolInput(
  input: BookSessionToolInput,
): BookingRequestPayload {
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
    notes: input.notes.trim(),
    consent: true,
    source: "ai-guided-intake",
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
