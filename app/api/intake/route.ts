import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, jsonSchema } from "ai";

import {
  AI_INTAKE_URGENCY_OPTIONS,
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_MAX_LENGTHS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  type AiIntakePayload,
  type BookingAvailabilityId,
  type BookingBranchId,
  type BookingContactMethodId,
  type BookingLanguageId,
  type BookingRelationId,
  type BookingRequestPayload,
  type BookingServiceId,
} from "@/lib/booking";
import { buildCaseWorkflowProfile } from "@/lib/case-workflows";
import {
  normalizeVoiceCallFocusId,
  type ChatLanguage,
  type ChatMode,
  type VoiceCallFocusId,
} from "@/lib/chat";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { logUsageEventFromUnknown } from "@/lib/server/usage-analytics";

export const maxDuration = 30;

const ALLOWED_MODES = new Set<ChatMode>(["adaptive", "patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);
const INTAKE_MODEL = "gpt-4o-mini";
const INTAKE_RATE_LIMIT = {
  limit: 8,
  windowMs: 10 * 60 * 1000,
};

type IntakeTranscriptRole = "assistant" | "user";

interface IntakeTranscriptEntry {
  role: IntakeTranscriptRole;
  text: string;
}

interface IntakeRequestBody {
  language?: ChatLanguage;
  mode?: ChatMode;
  focus?: VoiceCallFocusId;
  transcript?: IntakeTranscriptEntry[];
}

interface GeneratedIntakeDraft {
  requesterName: string;
  patientName: string;
  relation: string;
  phone: string;
  email: string;
  branchPreference: string;
  serviceInterest: string;
  contactMethod: string;
  contactLanguage: string;
  availability: string;
  urgency: string;
  detectedLanguage: string;
  presentingProblem: string;
  historyContext: string;
  familyContext: string;
  expectations: string;
  teamSummary: string;
  todayAction: string;
  riskFlags: string[];
  patientFollowUp: string[];
  familyFollowUp: string[];
  nextStepRecommendation: string;
  interventionPreparation: string[];
  treatmentExpectations: string[];
  familyFollowAlong: string[];
  missingInformation: string[];
}

const relationIds = BOOKING_RELATION_OPTIONS.map((option) => option.id);
const branchIds = BOOKING_BRANCH_OPTIONS.map((option) => option.id);
const serviceIds = BOOKING_SERVICE_OPTIONS.map((option) => option.id);
const contactMethodIds = BOOKING_CONTACT_METHOD_OPTIONS.map((option) => option.id);
const contactLanguageIds = BOOKING_LANGUAGE_OPTIONS.map((option) => option.id);
const availabilityIds = BOOKING_AVAILABILITY_OPTIONS.map((option) => option.id);
const urgencyIds = AI_INTAKE_URGENCY_OPTIONS.map((option) => option.id);

function trimSingleLine(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function trimParagraph(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function trimItems(values: string[] | undefined, maxItems = 5, maxLength = 220) {
  return (values ?? [])
    .map((item) => trimSingleLine(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeEnumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizeContactLanguage(
  value: string | undefined,
  fallback: BookingLanguageId,
): BookingLanguageId {
  if (value === "mixed") {
    return "no-preference";
  }

  return normalizeEnumValue(
    value,
    contactLanguageIds as readonly BookingLanguageId[],
    fallback,
  );
}

function createTranscriptText(transcript: IntakeTranscriptEntry[]) {
  return transcript
    .map((entry, index) => {
      const text = trimParagraph(entry.text, 1200);

      if (!text) {
        return "";
      }

      return `${index + 1}. ${entry.role === "user" ? "Caller" : "Willing Ways AI"}: ${text}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 18000);
}

function countCallerTurns(transcript: IntakeTranscriptEntry[]) {
  return transcript.filter((entry) => entry.role === "user" && trimSingleLine(entry.text, 2000)).length;
}

function getFocusLabel(focus: VoiceCallFocusId) {
  if (focus === "guided-intake") {
    return "AI guided intake handoff";
  }
  if (focus === "family-coach") {
    return "Family coach";
  }
  if (focus === "crisis-triage") {
    return "Crisis triage";
  }
  if (focus === "founder-method") {
    return "Dr. Sadaqat method";
  }
  if (focus === "private-intake") {
    return "Private intake";
  }

  return "General support";
}

function buildTeamSummary(
  aiIntake: AiIntakePayload,
  language: BookingLanguageId,
  focus: VoiceCallFocusId,
) {
  const segments = [
    aiIntake.counselorBrief,
    `Lane: ${aiIntake.serviceLane}.`,
    `Recommended program: ${aiIntake.recommendedProgram}.`,
    `Next contact window: ${aiIntake.nextContactWindow}.`,
    `Today's action: ${aiIntake.todayAction}.`,
    aiIntake.teamSummary,
    `Detected language: ${aiIntake.detectedLanguage}.`,
    `Current urgency: ${aiIntake.urgency}.`,
    `Call focus: ${getFocusLabel(focus)}.`,
    aiIntake.nextStepRecommendation
      ? `Recommended next step: ${aiIntake.nextStepRecommendation}`
      : "",
    aiIntake.missingInformation.length > 0
      ? `Still missing or to reconfirm: ${aiIntake.missingInformation.join("; ")}`
      : "",
    language === "punjabi"
      ? "Preferred language: Punjabi (Pakistan)."
      : language === "urdu"
        ? "Preferred language: Urdu."
        : language === "no-preference"
          ? "Preferred language: No preference stated."
          : "Preferred language: English.",
  ];

  return segments.filter(Boolean).join("\n\n").slice(0, BOOKING_MAX_LENGTHS.notes);
}

function buildCounselorBrief(
  aiIntake: Omit<
    AiIntakePayload,
    "counselorBrief" | "serviceLane" | "recommendedProgram" | "nextContactWindow"
  > &
    Pick<
      AiIntakePayload,
      "todayAction" | "riskFlags" | "patientFollowUp" | "familyFollowAlong" | "familyFollowUp"
    >,
  workflow: ReturnType<typeof buildCaseWorkflowProfile>,
  relation: BookingRelationId,
) {
  const riskLine =
    aiIntake.riskFlags.length > 0 ? aiIntake.riskFlags.join("; ") : aiIntake.urgency;
  const followUpLine =
    aiIntake.patientFollowUp.length > 0 || aiIntake.familyFollowUp.length > 0
      ? [
          aiIntake.patientFollowUp.length > 0
            ? `Patient follow-up: ${aiIntake.patientFollowUp.join("; ")}`
            : "",
          aiIntake.familyFollowUp.length > 0
            ? `Family follow-up: ${aiIntake.familyFollowUp.join("; ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ")
      : "No structured follow-up points captured yet.";

  return [
    `Why now: ${aiIntake.presentingProblem || "Context still needs confirmation."}`,
    `Risk: ${riskLine}`,
    `Caller relationship: ${relation}`,
    `Treatment history: ${aiIntake.historyContext || "Treatment history still needs confirmation."}`,
    `Family system issue: ${aiIntake.familyContext || "Family-system context still needs confirmation."}`,
    `Recommended next step: ${workflow.counselorNextAction}`,
    `Missing info: ${
      aiIntake.missingInformation.length > 0
        ? aiIntake.missingInformation.join("; ")
        : "No major missing items flagged."
    }`,
    `Follow-up track: ${followUpLine}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const rateLimitResult = checkRateLimit(request, "intake", INTAKE_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return Response.json(
      {
        error:
          "Too many intake summaries are being prepared from this connection right now. Please wait a moment and try again.",
      },
      { status: 429, headers: responseHeaders },
    );
  }

  if (!apiKey) {
    return Response.json(
      { error: "Willing Ways AI intake is not configured on the server yet." },
      { status: 401, headers: responseHeaders },
    );
  }

  let body: IntakeRequestBody;

  try {
    body = (await request.json()) as IntakeRequestBody;
  } catch {
    return Response.json(
      { error: "Invalid intake request payload." },
      { status: 400, headers: responseHeaders },
    );
  }

  const mode = body.mode ?? "adaptive";
  const language = body.language ?? "english";
  const focus = normalizeVoiceCallFocusId(body.focus ?? "guided-intake");
  const transcript: IntakeTranscriptEntry[] = Array.isArray(body.transcript)
    ? body.transcript
        .map((entry): IntakeTranscriptEntry => ({
          role: entry?.role === "assistant" ? "assistant" : "user",
          text: trimParagraph(typeof entry?.text === "string" ? entry.text : "", 1200),
        }))
        .filter((entry) => entry.text)
    : [];

  if (!ALLOWED_MODES.has(mode)) {
    return Response.json(
      { error: "Unsupported intake mode selected." },
      { status: 400, headers: responseHeaders },
    );
  }

  if (!ALLOWED_LANGUAGES.has(language)) {
    return Response.json(
      { error: "Unsupported intake language selected." },
      { status: 400, headers: responseHeaders },
    );
  }

  if (transcript.length === 0 || countCallerTurns(transcript) === 0) {
    return Response.json(
      {
        error:
          "Please speak with Willing Ways AI first so a guided intake summary can be prepared.",
      },
      { status: 400, headers: responseHeaders },
    );
  }

  const transcriptText = createTranscriptText(transcript);

  if (transcriptText.length < 80) {
    return Response.json(
      {
        error:
          "There is not enough story context yet. Please continue the call a little longer before preparing the handoff.",
      },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const openai = createOpenAI({ apiKey });
    const result = await generateObject({
      model: openai.chat(INTAKE_MODEL),
      schema: jsonSchema({
        type: "object",
        additionalProperties: false,
        properties: {
          requesterName: { type: "string" },
          patientName: { type: "string" },
          relation: { type: "string", enum: relationIds },
          phone: { type: "string" },
          email: { type: "string" },
          branchPreference: { type: "string", enum: branchIds },
          serviceInterest: { type: "string", enum: serviceIds },
          contactMethod: { type: "string", enum: contactMethodIds },
          contactLanguage: {
            type: "string",
            enum: [...contactLanguageIds, "mixed"],
          },
          availability: { type: "string", enum: availabilityIds },
          urgency: { type: "string", enum: urgencyIds },
          detectedLanguage: {
            type: "string",
            enum: ["english", "urdu", "punjabi", "mixed"],
          },
          presentingProblem: { type: "string" },
          historyContext: { type: "string" },
          familyContext: { type: "string" },
          expectations: { type: "string" },
          teamSummary: { type: "string" },
          todayAction: { type: "string" },
          riskFlags: {
            type: "array",
            items: { type: "string" },
          },
          patientFollowUp: {
            type: "array",
            items: { type: "string" },
          },
          familyFollowUp: {
            type: "array",
            items: { type: "string" },
          },
          nextStepRecommendation: { type: "string" },
          interventionPreparation: {
            type: "array",
            items: { type: "string" },
          },
          treatmentExpectations: {
            type: "array",
            items: { type: "string" },
          },
          familyFollowAlong: {
            type: "array",
            items: { type: "string" },
          },
          missingInformation: {
            type: "array",
            items: { type: "string" },
          },
        },
        required: [
          "requesterName",
          "patientName",
          "relation",
          "phone",
          "email",
          "branchPreference",
          "serviceInterest",
          "contactMethod",
          "contactLanguage",
          "availability",
          "urgency",
          "detectedLanguage",
          "presentingProblem",
          "historyContext",
          "familyContext",
          "expectations",
          "teamSummary",
          "todayAction",
          "riskFlags",
          "patientFollowUp",
          "familyFollowUp",
          "nextStepRecommendation",
          "interventionPreparation",
          "treatmentExpectations",
          "familyFollowAlong",
          "missingInformation",
        ],
      }),
      system:
        "You prepare secure Willing Ways Pakistan intake handoff drafts from support-call transcripts. Do not diagnose or prescribe. Use only details actually supported by the transcript. If a detail is missing or uncertain, leave the string empty, use a safe default enum, and list the missing item in missingInformation. Be conservative with urgency: use 'urgent' only for overdose, self-harm, suicide, violent relapse, or immediate psychiatric danger; use 'priority' for situations that need fast intervention or follow-up; otherwise use 'routine'. Map relation, serviceInterest, branchPreference, contactMethod, contactLanguage, and availability to the provided enums. teamSummary should be concise, operational, and useful to the Willing Ways team. interventionPreparation, treatmentExpectations, familyFollowAlong, patientFollowUp, and familyFollowUp should be short, practical bullet points. todayAction should be one immediate behavior or support step the caller can realistically do today. riskFlags should capture the clearest relapse, safety, or family-system risks without exaggeration.",
      prompt: `Call focus: ${getFocusLabel(focus)}\nCurrent mode: ${mode}\nInterface language before call: ${language}\n\nPrepare an intake handoff draft from this transcript:\n\n${transcriptText}`,
      temperature: 0.2,
    });
    const object = result.object as GeneratedIntakeDraft;

    const preferredLanguageFallback: BookingLanguageId =
      language === "urdu" ? "urdu" : "english";

    const relation = normalizeEnumValue(
      object.relation,
      relationIds as readonly BookingRelationId[],
      "family",
    );
    const serviceInterest = normalizeEnumValue(
      object.serviceInterest,
      serviceIds as readonly BookingServiceId[],
      focus === "family-coach" ? "family-intervention" : "consultation",
    );
    const detectedLanguage: AiIntakePayload["detectedLanguage"] =
      object.detectedLanguage === "urdu" ||
      object.detectedLanguage === "punjabi" ||
      object.detectedLanguage === "mixed"
        ? object.detectedLanguage
        : "english";
    const aiIntakeBase: Omit<
      AiIntakePayload,
      "counselorBrief" | "serviceLane" | "recommendedProgram" | "nextContactWindow"
    > = {
      urgency: normalizeEnumValue(
        object.urgency,
        urgencyIds as readonly AiIntakePayload["urgency"][],
        "routine",
      ),
      detectedLanguage,
      presentingProblem: trimParagraph(object.presentingProblem, 500),
      historyContext: trimParagraph(object.historyContext, 700),
      familyContext: trimParagraph(object.familyContext, 600),
      expectations: trimParagraph(object.expectations, 500),
      teamSummary: trimParagraph(object.teamSummary, 1100),
      todayAction: trimParagraph(object.todayAction, 320),
      riskFlags: trimItems(object.riskFlags, 5, 160),
      patientFollowUp: trimItems(object.patientFollowUp, 4, 180),
      familyFollowUp: trimItems(object.familyFollowUp, 4, 180),
      nextStepRecommendation: trimParagraph(object.nextStepRecommendation, 500),
      interventionPreparation: trimItems(object.interventionPreparation, 5, 220),
      treatmentExpectations: trimItems(object.treatmentExpectations, 5, 220),
      familyFollowAlong: trimItems(object.familyFollowAlong, 5, 220),
      missingInformation: trimItems(object.missingInformation, 6, 220),
    };
    const workflow = buildCaseWorkflowProfile({
      focus,
      relation,
      serviceInterest,
      aiIntake: aiIntakeBase,
    });
    const aiIntake: AiIntakePayload = {
      ...aiIntakeBase,
      counselorBrief: buildCounselorBrief(aiIntakeBase, workflow, relation),
      serviceLane: workflow.laneEnglishLabel,
      recommendedProgram: workflow.recommendedProgramId,
      nextContactWindow: workflow.slaEnglishLabel,
      todayAction: aiIntakeBase.todayAction || workflow.todayActionFallback,
    };

    const formDraft: BookingRequestPayload = {
      requesterName: trimSingleLine(object.requesterName, BOOKING_MAX_LENGTHS.requesterName),
      patientName: trimSingleLine(object.patientName, BOOKING_MAX_LENGTHS.patientName),
      relation,
      phone: trimSingleLine(object.phone, BOOKING_MAX_LENGTHS.phone),
      email: trimSingleLine(object.email, BOOKING_MAX_LENGTHS.email),
      branchPreference: normalizeEnumValue(
        object.branchPreference,
        branchIds as readonly BookingBranchId[],
        "first-available",
      ),
      serviceInterest,
      contactMethod: normalizeEnumValue(
        object.contactMethod,
        contactMethodIds as readonly BookingContactMethodId[],
        "phone",
      ),
      contactLanguage: normalizeContactLanguage(
        object.contactLanguage,
        preferredLanguageFallback,
      ),
      availability: normalizeEnumValue(
        object.availability,
        availabilityIds as readonly BookingAvailabilityId[],
        "asap",
      ),
      notes: buildTeamSummary(
        aiIntake,
        normalizeContactLanguage(object.contactLanguage, preferredLanguageFallback),
        focus,
      ),
      consent: false,
      source: "ai-guided-intake",
      aiIntake,
      website: "",
    };

    await logUsageEventFromUnknown({
      eventType: "intake-draft",
      route: "/api/intake",
      surface: "voice",
      userRole: relation,
      model: INTAKE_MODEL,
      usage: result.usage,
      metadata: {
        detectedLanguage,
        focus,
        language,
        mode,
        responseId:
          result.response && typeof result.response === "object" && "id" in result.response
            ? (result.response as { id?: string }).id ?? ""
            : "",
        serviceInterest,
      },
    });

    return Response.json(
      {
        ok: true,
        draft: formDraft,
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The AI intake summary could not be prepared right now.",
      },
      { status: 500, headers: responseHeaders },
    );
  }
}
