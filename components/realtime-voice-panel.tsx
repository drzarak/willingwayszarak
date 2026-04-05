"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  HeartHandshake,
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  RefreshCcw,
  ShieldAlert,
  UserRound,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { AiIntakePayload, BookingRequestPayload } from "@/lib/booking";
import { buildCaseWorkflowProfile } from "@/lib/case-workflows";
import {
  buildVoiceResumeContext,
  CURRENT_REALTIME_VOICE_VERSION,
  DEFAULT_REALTIME_VOICE_ID,
  MAX_PERSISTED_VOICE_TURNS,
  REALTIME_VOICE_OPTIONS,
  REALTIME_VOICE_STORAGE_KEY,
  REALTIME_VOICE_VERSION_STORAGE_KEY,
  analyzeVoiceCareSignals,
  normalizeRealtimeVoiceId,
  normalizeVoiceCallFocusId,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
  type VoiceCallFocusId,
  type VoiceTranscriptEntry,
} from "@/lib/chat";
import {
  FAMILY_TRAINING_HOME_LESSON_IDS,
  getFamilyTrainingLesson,
  normalizeFamilyTrainingLessonId,
  type FamilyTrainingLesson,
  type FamilyTrainingLessonId,
} from "@/lib/family-training";
import {
  HOME_RECOVERY_PROGRAM_IDS,
  getRecoveryProgram,
  type RecoveryProgramId,
} from "@/lib/recovery-programs";
import {
  getContactResult,
  getCrisisRedirectResult,
  getHumanEscalationResult,
  getRememberedPreferredNameResult,
  getSupportResourceResult,
  normalizePreferredName,
  type BookSessionToolInput,
  type ContactToolInput,
  type CrisisRedirectToolInput,
  type EscalateToHumanToolInput,
  type RememberPreferredNameToolInput,
  type SendResourceToolInput,
} from "@/lib/support-tools";
import { createSafeId, safeStorageGet, safeStorageSet } from "@/lib/utils";

import { Button } from "@/components/ui/button";

const ProgramCardList = dynamic(
  () => import("@/components/program-card-list").then((mod) => mod.ProgramCardList),
  {
    ssr: false,
    loading: () => <div className="h-[188px] animate-pulse rounded-[24px] border border-slate-200 bg-slate-100/80" />,
  },
);

const VoiceIntakeReview = dynamic(
  () => import("@/components/voice-intake-review").then((mod) => mod.VoiceIntakeReview),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-[24px] border border-slate-200 bg-slate-100/80" />,
  },
);

type VoiceStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "connected"
  | "listening"
  | "responding"
  | "error";

interface RealtimeVoicePanelProps {
  bookingConfigured: boolean;
  enabled: boolean;
  language: ChatLanguage;
  mode: ChatMode;
  preferredName: string;
  sessionId: string;
  transcript: VoiceTranscriptEntry[];
  onPreferredNameChange: (chatId: string, preferredName: string) => void;
  onTranscriptChange: (chatId: string, transcript: VoiceTranscriptEntry[]) => void;
}

interface PendingRealtimeTurn {
  itemId: string;
  epoch: number;
  peakLevel: number;
  stoppedAt: number;
  confidence?: number | null;
  transcript?: string;
  ignored?: boolean;
  responded?: boolean;
  scheduled?: boolean;
}

interface QueuedResponseRequest {
  source: "turn" | "tool" | "greeting";
  itemId?: string;
}

type IntakeReviewStatus =
  | "idle"
  | "preparing"
  | "ready"
  | "submitting"
  | "success"
  | "error";

const RESPONSE_DEBOUNCE_MS = 420;
const TURN_RESPONSE_COOLDOWN_MS = 650;
const MIN_TRANSCRIPT_PROBABILITY = 0.45;
const MIN_SHORT_TRANSCRIPT_PROBABILITY = 0.62;
const MIN_TRANSCRIPT_CHARACTERS = 3;
const MIN_SPEECH_LEVEL = 0.009;
const ECHO_GUARD_WINDOW_MS = 1600;
const INTRODUCTORY_TURN_HOLD_MS = 1200;
const SHORT_TURN_HOLD_MS = 900;
const INCOMPLETE_TURN_HOLD_MS = 700;
const PICKUP_TONE_DELAY_MS = 280;
const UI_TONE_VOLUME = 0.024;
const RING_TONE_GAP_MS = 1600;
const FILLER_TRANSCRIPTS = new Set([
  "uh",
  "uhh",
  "umm",
  "um",
  "hmm",
  "hm",
  "mmm",
  "mm",
  "ah",
  "eh",
]);

function trimDraftSingleLine(value: string | null | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function trimDraftParagraph(value: string | null | undefined, maxLength: number) {
  return (value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function getFallbackServiceInterest(focus: VoiceCallFocusId): BookingRequestPayload["serviceInterest"] {
  if (focus === "family-coach") {
    return "family-intervention";
  }

  if (focus === "crisis-triage") {
    return "follow-up";
  }

  if (focus === "guided-intake") {
    return "consultation";
  }

  return "consultation";
}

function getFallbackUrgency(
  focus: VoiceCallFocusId,
  severity: "normal" | "watch" | "urgent",
): AiIntakePayload["urgency"] {
  if (severity === "urgent") {
    return "urgent";
  }

  if (severity === "watch" || focus === "family-coach" || focus === "crisis-triage") {
    return "priority";
  }

  return "routine";
}

function normalizeRealtimeClientError(message: string, language: ChatLanguage) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("<!doctype html") || lowerMessage.includes("<html")) {
    return language === "urdu"
      ? "کال ملانے میں بہت زیادہ وقت لگ گیا۔ براہ کرم چند لمحوں بعد دوبارہ کوشش کریں۔"
      : "The AI call line took too long to respond. Please try again in a moment.";
  }

  if (
    lowerMessage.includes("api version mismatch") ||
    lowerMessage.includes("api_version_mismatch")
  ) {
    return language === "urdu"
      ? "کال لائن کو تازہ کرنے کی ضرورت ہے۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔"
      : "The AI call line needs a quick refresh. Please reload the page and try again.";
  }

  if (!message.trim()) {
    return language === "urdu"
      ? "اے آئی کال اس وقت شروع نہیں ہو سکی۔"
      : "The AI call could not be started right now.";
  }

  return message;
}

function normalizeTranscriptComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptLooksLikeAssistantEcho(
  transcriptText: string,
  transcript: VoiceTranscriptEntry[],
  lastAssistantSpeechAt: number,
) {
  if (!lastAssistantSpeechAt || Date.now() - lastAssistantSpeechAt > ECHO_GUARD_WINDOW_MS) {
    return false;
  }

  const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);

  if (normalizedTranscript.length < 18) {
    return false;
  }

  const lastAssistantEntry = [...transcript]
    .reverse()
    .find((entry) => entry.role === "assistant" && entry.text.trim());

  if (!lastAssistantEntry) {
    return false;
  }

  const normalizedAssistant = normalizeTranscriptComparisonText(lastAssistantEntry.text);

  if (normalizedAssistant.length < 18) {
    return false;
  }

  return (
    normalizedAssistant.includes(normalizedTranscript) ||
    normalizedTranscript.includes(normalizedAssistant)
  );
}

function extractAverageLogprob(payload: Record<string, unknown>) {
  const logprobs = Array.isArray(payload.logprobs) ? payload.logprobs : [];
  const values = logprobs
    .map((entry) => {
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return entry;
      }

      if (entry && typeof entry === "object" && "logprob" in entry) {
        const logprob = Number((entry as { logprob?: unknown }).logprob);
        return Number.isFinite(logprob) ? logprob : null;
      }

      return null;
    })
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function probabilityFromAverageLogprob(averageLogprob: number | null) {
  if (averageLogprob === null) {
    return null;
  }

  return Math.exp(Math.max(-8, Math.min(0, averageLogprob)));
}

function getContinuationHoldDelay(transcriptText: string) {
  const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);
  const wordCount = normalizedTranscript.split(" ").filter(Boolean).length;
  const introducesSelf =
    /\b(hello|hi|hey|assalam|assalamu|salaam|my name is|i am|this is)\b/i.test(
      normalizedTranscript,
    ) &&
    !/\b(help|need|using|problem|issue|brother|sister|mother|father|relapse|session|rehab|treatment|suic|admission)\b/i.test(
      normalizedTranscript,
    );
  const endsAbruptly = !/[.!?؟]$/.test(transcriptText.trim());

  if (introducesSelf) {
    return INTRODUCTORY_TURN_HOLD_MS;
  }

  if (wordCount <= 5) {
    return SHORT_TURN_HOLD_MS;
  }

  if (endsAbruptly) {
    return INCOMPLETE_TURN_HOLD_MS;
  }

  return 0;
}

function trimPersistedTranscript(entries: VoiceTranscriptEntry[]) {
  return entries.slice(-MAX_PERSISTED_VOICE_TURNS);
}

function formatCallDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function RealtimeVoicePanel({
  bookingConfigured,
  enabled,
  language,
  mode,
  preferredName,
  sessionId,
  transcript,
  onPreferredNameChange,
  onTranscriptChange,
}: RealtimeVoicePanelProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [localTranscript, setLocalTranscript] = useState<VoiceTranscriptEntry[]>(
    trimPersistedTranscript(transcript),
  );
  const [voiceId, setVoiceId] = useState<RealtimeVoiceId>(DEFAULT_REALTIME_VOICE_ID);
  const [selectedFocus, setSelectedFocus] = useState<VoiceCallFocusId>(
    normalizeVoiceCallFocusId(searchParams.get("focus")),
  );
  const [selectedFamilyLessonId, setSelectedFamilyLessonId] = useState<FamilyTrainingLessonId | null>(
    normalizeFamilyTrainingLessonId(searchParams.get("module")),
  );
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [intakeDraft, setIntakeDraft] = useState<BookingRequestPayload | null>(null);
  const [intakeReviewStatus, setIntakeReviewStatus] = useState<IntakeReviewStatus>("idle");
  const [intakeReviewMessage, setIntakeReviewMessage] = useState<string | null>(null);
  const [rememberedName, setRememberedName] = useState(preferredName);
  const [showNotes, setShowNotes] = useState(false);
  const [showFamilyTraining, setShowFamilyTraining] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [identityHint, setIdentityHint] = useState<"self" | "family" | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callConnectedAt, setCallConnectedAt] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const localTranscriptRef = useRef<VoiceTranscriptEntry[]>(transcript);
  const statusRef = useRef<VoiceStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const uiAudioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const analyserBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const ringToneTimerRef = useRef<number | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);
  const handledToolCallsRef = useRef<Set<string>>(new Set());
  const lastSessionIdRef = useRef(sessionId);
  const bookingPrefillRef = useRef<Partial<BookSessionToolInput> | null>(null);
  const intentionalCloseRef = useRef(false);
  const activeResponseRef = useRef(false);
  const initialGreetingRequestedRef = useRef(false);
  const queuedResponseRequestRef = useRef<QueuedResponseRequest | null>(null);
  const pendingToolOutputsRef = useRef<Array<{ callId: string; output: string }>>([]);
  const lastAssistantSpeechAtRef = useRef(0);
  const recentAssistantDeltaSignatureRef = useRef<{ signature: string; at: number } | null>(null);
  const pendingResponseTimerRef = useRef<number | null>(null);
  const activeSpeechEpochRef = useRef(0);
  const latestSpeechEpochRef = useRef(0);
  const speechIsActiveRef = useRef(false);
  const currentSpeechPeakLevelRef = useRef(0);
  const stoppedTurnsQueueRef = useRef<Array<{ epoch: number; peakLevel: number; stoppedAt: number }>>(
    [],
  );
  const pendingTurnsRef = useRef<Map<string, PendingRealtimeTurn>>(new Map());
  const turnCooldownUntilRef = useRef(0);
  const currentMicLevelRef = useRef(0);
  const micNoiseFloorRef = useRef(0.004);

  useEffect(() => {
    const storedVoice = safeStorageGet(REALTIME_VOICE_STORAGE_KEY);
    const storedVersion = safeStorageGet(REALTIME_VOICE_VERSION_STORAGE_KEY);
    const shouldRefreshVoicePreference =
      !storedVoice ||
      storedVoice === "cedar" ||
      storedVoice === "marin" ||
      storedVoice === "marine";
    const nextVoice =
      storedVersion !== CURRENT_REALTIME_VOICE_VERSION && shouldRefreshVoicePreference
        ? DEFAULT_REALTIME_VOICE_ID
        : normalizeRealtimeVoiceId(storedVoice);

    setVoiceId(nextVoice);
    safeStorageSet(REALTIME_VOICE_STORAGE_KEY, nextVoice);
    safeStorageSet(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
  }, []);

  useEffect(() => {
    safeStorageSet(REALTIME_VOICE_STORAGE_KEY, voiceId);
    safeStorageSet(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
  }, [voiceId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsString);
    const nextLessonId = normalizeFamilyTrainingLessonId(params.get("module"));
    const nextFocus = nextLessonId
      ? "family-coach"
      : normalizeVoiceCallFocusId(params.get("focus"));

    setSelectedFocus(nextFocus);
    setSelectedFamilyLessonId(nextLessonId);
  }, [searchParamsString]);

  useEffect(() => {
    if (selectedFamilyLessonId) {
      setShowFamilyTraining(true);
      return;
    }

    if (status === "idle" || status === "error") {
      setShowFamilyTraining(false);
    }
  }, [selectedFamilyLessonId, status]);

  useEffect(() => {
    if (lastSessionIdRef.current === sessionId) {
      return;
    }

    lastSessionIdRef.current = sessionId;
    cleanupSession();
    setLocalTranscript(trimPersistedTranscript(transcript));
    setRememberedName(preferredName);
    setSubmissionNotice(null);
    setToolActivity(null);
    setIntakeDraft(null);
    setIntakeReviewStatus("idle");
    setIntakeReviewMessage(null);
    setErrorMessage(null);
    setShowFamilyTraining(Boolean(selectedFamilyLessonId));
    setShowNotes(false);
    setShowVoiceOptions(false);
    setShowMoreOptions(false);
    setIdentityHint(null);
    setIsMicMuted(false);
    setStatus("idle");
    bookingPrefillRef.current = null;
  }, [preferredName, selectedFamilyLessonId, sessionId, transcript]);

  useEffect(() => {
    if (!preferredName.trim() || preferredName === rememberedName) {
      return;
    }

    setRememberedName(preferredName);
  }, [preferredName, rememberedName]);

  useEffect(() => {
    localTranscriptRef.current = localTranscript;
  }, [localTranscript]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!callConnectedAt || status === "idle" || status === "error") {
      setCallDurationSeconds(0);
      return;
    }

    setCallDurationSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));

    const intervalId = window.setInterval(() => {
      setCallDurationSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [callConnectedAt, status]);

  useEffect(() => {
    const transcriptIsUnchanged =
      localTranscript.length === transcript.length &&
      localTranscript.every(
        (entry, index) =>
          entry.id === transcript[index]?.id &&
          entry.role === transcript[index]?.role &&
          entry.text === transcript[index]?.text,
      );

    if (transcriptIsUnchanged) {
      return;
    }

    onTranscriptChange(sessionId, localTranscript);
  }, [localTranscript, onTranscriptChange, sessionId, transcript]);

  useEffect(() => {
    if (rememberedName.trim() === preferredName.trim()) {
      return;
    }

    onPreferredNameChange(sessionId, rememberedName.trim());
  }, [onPreferredNameChange, preferredName, rememberedName, sessionId]);

  useEffect(() => () => cleanupSession(), []);

  function updateCallSelection(
    nextFocus: VoiceCallFocusId,
    nextLessonId: FamilyTrainingLessonId | null,
  ) {
    const params = new URLSearchParams(searchParamsString);

    if (nextFocus === "general-support" && !nextLessonId) {
      params.delete("focus");
    } else {
      params.set("focus", nextFocus);
    }

    if (nextFocus === "family-coach" && nextLessonId) {
      params.set("module", nextLessonId);
    } else {
      params.delete("module");
    }

    const nextQuery = params.toString();
    const nextHref = nextQuery ? `${pathname}?${nextQuery}#call` : `${pathname}#call`;

    router.replace(nextHref, { scroll: false });
    setSelectedFocus(nextFocus);
    setSelectedFamilyLessonId(nextLessonId);
  }

  function clearFamilyCoachingSelection() {
    updateCallSelection("general-support", null);
  }

  function mergeDraftWithPrefill(
    draft: BookingRequestPayload,
    prefill?: Partial<BookSessionToolInput> | null,
  ) {
    if (!prefill) {
      return {
        ...draft,
        consent: false,
      };
    }

    const mergedNotes = trimDraftParagraph(
      prefill.notes && draft.notes
        ? `${draft.notes}\n\nAdditional caller detail: ${prefill.notes}`
        : prefill.notes || draft.notes,
      1500,
    );

    return {
      ...draft,
      requesterName: trimDraftSingleLine(
        prefill.requesterName || draft.requesterName,
        120,
      ),
      patientName: trimDraftSingleLine(
        prefill.patientName || draft.patientName,
        120,
      ),
      relation: prefill.relation ?? draft.relation,
      phone: trimDraftSingleLine(prefill.phone || draft.phone, 40),
      email: trimDraftSingleLine(prefill.email || draft.email, 160),
      branchPreference: prefill.branchPreference ?? draft.branchPreference,
      serviceInterest: prefill.serviceInterest ?? draft.serviceInterest,
      contactMethod: prefill.contactMethod ?? draft.contactMethod,
      contactLanguage: prefill.contactLanguage ?? draft.contactLanguage,
      availability: prefill.availability ?? draft.availability,
      notes: mergedNotes || draft.notes,
      consent: false,
    };
  }

  function buildFallbackIntakeDraft(
    prefill?: Partial<BookSessionToolInput> | null,
  ): BookingRequestPayload {
    const transcriptSummary = trimDraftParagraph(
      localTranscriptRef.current
        .filter((entry) => entry.role === "user")
        .map((entry) => entry.text)
        .join(" "),
      1200,
    );
    const careSignalLanguage = careSignal?.detectedLanguage ?? (language === "urdu" ? "urdu" : "english");
    const careSignalSeverity = careSignal?.severity ?? "normal";
    const detectedLanguage =
      careSignalLanguage === "mixed"
        ? language === "urdu"
          ? "urdu"
          : "english"
        : careSignalLanguage;
    const summarySource = trimDraftParagraph(
      prefill?.notes || transcriptSummary,
      1200,
    );
    const requesterName = trimDraftSingleLine(
      prefill?.requesterName || rememberedName,
      120,
    );
    const relation =
      prefill?.relation ?? (mode === "doctor" ? "doctor" : "family");
    const serviceInterest =
      prefill?.serviceInterest ?? getFallbackServiceInterest(selectedFocus);
    const nextStepRecommendation =
      selectedFocus === "family-coach"
        ? "Arrange a family coaching or intervention follow-up with the Willing Ways team."
        : selectedFocus === "crisis-triage"
          ? "Review immediate safety first, then request fast clinical follow-up from the Willing Ways team."
          : "Arrange a follow-up call from the Willing Ways team for the next appropriate treatment step.";
    const missingInformation = [
      !prefill?.phone ? "Confirm the best callback number." : "",
      !requesterName ? "Confirm the caller's preferred name." : "",
      !summarySource ? "Add a short summary of what help is needed right now." : "",
    ].filter(Boolean);
    const aiIntakeBase: Omit<
      AiIntakePayload,
      "counselorBrief" | "serviceLane" | "recommendedProgram" | "nextContactWindow"
    > = {
      urgency: getFallbackUrgency(selectedFocus, careSignalSeverity),
      detectedLanguage,
      presentingProblem:
        trimDraftParagraph(prefill?.notes || transcriptSummary, 500) ||
        (language === "urdu"
          ? "مزید context درکار ہے۔"
          : "More context needs to be confirmed."),
      historyContext: trimDraftParagraph(transcriptSummary, 700),
      familyContext:
        relation === "family"
          ? "A family member is requesting support and follow-up."
          : relation === "self"
            ? "The patient is requesting direct support."
            : relation === "doctor"
              ? "A doctor or referrer is requesting follow-up."
              : "The caller's role should be reconfirmed.",
      expectations: "",
      teamSummary:
        trimDraftParagraph(summarySource || transcriptSummary, 1100) ||
        nextStepRecommendation,
      todayAction:
        selectedFocus === "family-coach"
          ? "Write one calm family script for tonight using two facts, one feeling, and one clear ask."
          : "Use one calming or relapse-prevention exercise today and remove one risky trigger before tonight.",
      riskFlags: careSignal?.matchedCues.slice(0, 4) ?? [],
      patientFollowUp:
        relation === "self"
          ? [
              "Reconfirm the next follow-up touchpoint within 24 hours.",
              "Watch cravings, mood, and risky hours until the next contact.",
            ]
          : [],
      familyFollowUp:
        relation === "family"
          ? [
              "Keep one lead family contact and one shared message.",
              "Watch secrecy, anger spikes, and missed follow-up.",
            ]
          : [],
      nextStepRecommendation,
      interventionPreparation: [],
      treatmentExpectations: [],
      familyFollowAlong: [],
      missingInformation,
    };
    const workflow = buildCaseWorkflowProfile({
      focus: selectedFocus,
      relation,
      serviceInterest,
      aiIntake: aiIntakeBase,
    });

    return {
      requesterName,
      patientName: trimDraftSingleLine(prefill?.patientName, 120),
      relation,
      phone: trimDraftSingleLine(prefill?.phone, 40),
      email: trimDraftSingleLine(prefill?.email, 160),
      branchPreference: prefill?.branchPreference ?? "first-available",
      serviceInterest,
      contactMethod: prefill?.contactMethod ?? "phone",
      contactLanguage:
        prefill?.contactLanguage ??
        (detectedLanguage === "punjabi"
          ? "punjabi"
          : language === "urdu"
            ? "urdu"
            : "english"),
      availability: prefill?.availability ?? "asap",
      notes:
        summarySource ||
        (language === "urdu"
          ? "کالر نے ولنگ ویز ٹیم سے follow-up کی درخواست کی ہے۔"
          : "The caller requested follow-up from the Willing Ways team."),
      consent: false,
      source: "ai-guided-intake",
      aiIntake: {
        ...aiIntakeBase,
        counselorBrief: workflow.summary,
        serviceLane: workflow.laneEnglishLabel,
        recommendedProgram: workflow.recommendedProgramId,
        nextContactWindow: workflow.slaEnglishLabel,
      },
      website: "",
    };
  }

  async function prepareIntakeDraft(prefill?: Partial<BookSessionToolInput> | null) {
    bookingPrefillRef.current = prefill ?? bookingPrefillRef.current;
    setSubmissionNotice(null);
    setIntakeReviewStatus("preparing");
    setIntakeReviewMessage(
      language === "urdu"
        ? "ہم آپ کی گفتگو کو ولنگ ویز ٹیم کے لئے ترتیب دے رہے ہیں..."
        : "We are organizing your conversation into a handoff for the Willing Ways team...",
    );
    setErrorMessage(null);

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language,
          mode,
          focus: selectedFocus,
          transcript: localTranscriptRef.current,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { draft?: BookingRequestPayload; error?: string }
        | null;

      if (!response.ok || !data?.draft) {
        if (prefill) {
          const fallbackDraft = buildFallbackIntakeDraft(prefill);
          setIntakeDraft(fallbackDraft);
          setIntakeReviewStatus("ready");
          setIntakeReviewMessage(null);
          return fallbackDraft;
        }

        throw new Error(
          data?.error ??
            (language === "urdu"
              ? "یہ handoff ابھی تیار نہیں ہو سکا۔"
              : "The handoff could not be prepared right now."),
        );
      }

      const nextDraft = mergeDraftWithPrefill(data.draft, prefill);
      setIntakeDraft(nextDraft);
      setIntakeReviewStatus("ready");
      setIntakeReviewMessage(null);
      return nextDraft;
    } catch (error) {
      setIntakeDraft(null);
      setIntakeReviewStatus("error");
      setIntakeReviewMessage(
        error instanceof Error
          ? error.message
          : language === "urdu"
            ? "ہینڈ آف summary اس وقت تیار نہیں ہو سکی۔"
            : "The handoff summary could not be prepared right now.",
      );
      return null;
    }
  }

  function handleIntakeDraftFieldChange<K extends keyof BookingRequestPayload>(
    field: K,
    value: BookingRequestPayload[K],
  ) {
    setIntakeDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: value,
      };
    });

    if (intakeReviewStatus === "error" || intakeReviewStatus === "success") {
      setIntakeReviewStatus("ready");
      setIntakeReviewMessage(null);
    }
  }

  async function handleSubmitIntakeReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!intakeDraft) {
      return;
    }

    setIntakeReviewStatus("submitting");
    setIntakeReviewMessage(
      language === "urdu"
        ? "ہم summary ولنگ ویز ٹیم کو بھیج رہے ہیں..."
        : "We are sending the handoff to the Willing Ways team...",
    );

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(intakeDraft),
      });

      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ??
            (language === "urdu"
              ? "summary اس وقت نہیں بھیجی جا سکی۔"
              : "The handoff could not be sent right now."),
        );
      }

      setIntakeReviewStatus("success");
      setIntakeReviewMessage(
        language === "urdu"
          ? "ولنگ ویز ٹیم کے لئے handoff بھیج دیا گیا ہے۔"
          : "The handoff has been sent to the Willing Ways team.",
      );
      setSubmissionNotice(
        language === "urdu"
          ? "ولنگ ویز ٹیم آپ کے دیے گئے رابطے پر follow-up کرے گی۔"
          : "The Willing Ways team will follow up on the contact route you confirmed.",
      );
    } catch (error) {
      setIntakeReviewStatus("error");
      setIntakeReviewMessage(
        error instanceof Error
          ? error.message
          : language === "urdu"
            ? "summary اس وقت نہیں بھیجی جا سکی۔"
            : "The handoff could not be sent right now.",
      );
    }
  }

  function clearLocalVoiceMemory() {
    const confirmed = window.confirm(
      language === "urdu"
        ? "کیا آپ اسی براؤزر سے محفوظ شدہ نام اور کال نوٹس صاف کرنا چاہتے ہیں؟"
        : "Do you want to clear the saved name and call notes from this browser?",
    );

    if (!confirmed) {
      return;
    }

    setLocalTranscript([]);
    setRememberedName("");
    setSubmissionNotice(null);
    setToolActivity(null);
    setIntakeDraft(null);
    setIntakeReviewStatus("idle");
    setIntakeReviewMessage(null);
    setShowNotes(false);
    setShowMoreOptions(false);
    setIdentityHint(null);
    setErrorMessage(null);
  }

  function cleanupSession() {
    intentionalCloseRef.current = true;

    if (ringToneTimerRef.current !== null) {
      window.clearTimeout(ringToneTimerRef.current);
      ringToneTimerRef.current = null;
    }

    if (pendingResponseTimerRef.current !== null) {
      window.clearTimeout(pendingResponseTimerRef.current);
      pendingResponseTimerRef.current = null;
    }

    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }

    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    void audioContextRef.current?.close().catch(() => {
      // Ignore analyzer shutdown errors.
    });
    audioContextRef.current = null;
    void uiAudioContextRef.current?.close().catch(() => {
      // Ignore UI tone shutdown errors.
    });
    uiAudioContextRef.current = null;
    analyserNodeRef.current = null;
    analyserBufferRef.current = null;

    assistantEntryIdRef.current = null;
    handledToolCallsRef.current.clear();
    activeResponseRef.current = false;
    initialGreetingRequestedRef.current = false;
    queuedResponseRequestRef.current = null;
    pendingToolOutputsRef.current = [];
    pendingTurnsRef.current.clear();
    stoppedTurnsQueueRef.current = [];
    activeSpeechEpochRef.current = 0;
    latestSpeechEpochRef.current = 0;
    speechIsActiveRef.current = false;
    currentSpeechPeakLevelRef.current = 0;
    currentMicLevelRef.current = 0;
    micNoiseFloorRef.current = 0.004;
    turnCooldownUntilRef.current = 0;
    recentAssistantDeltaSignatureRef.current = null;
    setCallConnectedAt(null);
    setCallDurationSeconds(0);
    setIsMicMuted(false);
    setToolActivity(null);
  }

  function ensureUiAudioContext() {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!uiAudioContextRef.current || uiAudioContextRef.current.state === "closed") {
      uiAudioContextRef.current = new AudioContextCtor();
    }

    return uiAudioContextRef.current;
  }

  function scheduleUiTone(
    audioContext: AudioContext,
    frequency: number,
    startDelaySeconds: number,
    durationSeconds: number,
    volume = UI_TONE_VOLUME,
  ) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startAt = audioContext.currentTime + startDelaySeconds;
    const endAt = startAt + durationSeconds;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  function playPickupTone() {
    const audioContext = ensureUiAudioContext();

    if (!audioContext) {
      return;
    }

    void audioContext.resume().catch(() => {
      // Ignore browser resume issues for UI tones.
    });
    scheduleUiTone(audioContext, 920, 0, 0.12, 0.028);
    scheduleUiTone(audioContext, 690, 0.16, 0.14, 0.022);
  }

  function startRingToneLoop() {
    if (ringToneTimerRef.current !== null) {
      return;
    }

    const playRingBurst = () => {
      const audioContext = ensureUiAudioContext();

      if (audioContext) {
        void audioContext.resume().catch(() => {
          // Ignore browser resume issues for UI tones.
        });
        scheduleUiTone(audioContext, 480, 0, 0.16, 0.02);
        scheduleUiTone(audioContext, 620, 0.24, 0.2, 0.02);
      }

      ringToneTimerRef.current = window.setTimeout(playRingBurst, RING_TONE_GAP_MS);
    };

    playRingBurst();
  }

  function stopRingToneLoop() {
    if (ringToneTimerRef.current !== null) {
      window.clearTimeout(ringToneTimerRef.current);
      ringToneTimerRef.current = null;
    }
  }

  function sendRealtimeEvent(payload: Record<string, unknown>) {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
      return true;
    }

    return false;
  }

  function setMicMutedState(nextMuted: boolean) {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
  }

  function handleConnectionLost(message: string) {
    if (intentionalCloseRef.current) {
      return;
    }

    if (statusRef.current === "idle" || statusRef.current === "error") {
      return;
    }

    cleanupSession();
    setErrorMessage(message);
    setStatus("error");
  }

  function startInitialGreeting() {
    if (initialGreetingRequestedRef.current) {
      return;
    }

    initialGreetingRequestedRef.current = true;
    stopRingToneLoop();
    playPickupTone();

    window.setTimeout(() => {
      if (statusRef.current === "error" || statusRef.current === "idle") {
        return;
      }

      requestAssistantResponse({ source: "greeting" });
    }, PICKUP_TONE_DELAY_MS);
  }

  function trackMicrophoneLevel(localStream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.84;
    source.connect(analyserNode);

    audioContextRef.current = audioContext;
    analyserNodeRef.current = analyserNode;
    analyserBufferRef.current = new Uint8Array(
      new ArrayBuffer(analyserNode.fftSize),
    );

    const monitor = () => {
      const analyser = analyserNodeRef.current;
      const buffer = analyserBufferRef.current;

      if (!analyser || !buffer) {
        return;
      }

      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;

      for (const sample of buffer) {
        const normalizedSample = (sample - 128) / 128;
        sumSquares += normalizedSample * normalizedSample;
      }

      const rms = Math.sqrt(sumSquares / buffer.length);
      currentMicLevelRef.current = rms;

      if (speechIsActiveRef.current) {
        currentSpeechPeakLevelRef.current = Math.max(currentSpeechPeakLevelRef.current, rms);
      } else if (!activeResponseRef.current) {
        const nextNoiseFloor = micNoiseFloorRef.current * 0.92 + rms * 0.08;
        micNoiseFloorRef.current = Math.min(Math.max(nextNoiseFloor, 0.0025), 0.03);
      }

      analyserFrameRef.current = window.requestAnimationFrame(monitor);
    };

    void audioContext.resume().catch(() => {
      // Browser keeps the analyzer suspended until audio starts; the monitor still runs once resumed.
    });

    analyserFrameRef.current = window.requestAnimationFrame(monitor);
  }

  function clearPendingTurnResponse() {
    if (pendingResponseTimerRef.current !== null) {
      window.clearTimeout(pendingResponseTimerRef.current);
      pendingResponseTimerRef.current = null;
    }
  }

  function isLikelySpeechLevel(level = currentMicLevelRef.current) {
    const adaptiveThreshold = Math.max(MIN_SPEECH_LEVEL, micNoiseFloorRef.current * 2.2);
    return level >= adaptiveThreshold;
  }

  function createOrUpdateTurn(itemId: string) {
    const existingTurn = pendingTurnsRef.current.get(itemId);

    if (existingTurn) {
      return existingTurn;
    }

    const stoppedTurn =
      stoppedTurnsQueueRef.current.shift() ?? {
        epoch: latestSpeechEpochRef.current || 1,
        peakLevel: currentSpeechPeakLevelRef.current,
        stoppedAt: Date.now(),
      };
    const pendingTurn: PendingRealtimeTurn = {
      itemId,
      epoch: stoppedTurn.epoch,
      peakLevel: stoppedTurn.peakLevel,
      stoppedAt: stoppedTurn.stoppedAt,
    };

    pendingTurnsRef.current.set(itemId, pendingTurn);
    return pendingTurn;
  }

  function shouldIgnoreTranscript(
    transcriptText: string,
    turn: PendingRealtimeTurn,
    confidence: number | null,
  ) {
    const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);

    if (!normalizedTranscript) {
      return true;
    }

    if (FILLER_TRANSCRIPTS.has(normalizedTranscript)) {
      return true;
    }

    if (
      transcriptLooksLikeAssistantEcho(
        transcriptText,
        localTranscriptRef.current,
        lastAssistantSpeechAtRef.current,
      )
    ) {
      return true;
    }

    if (confidence !== null && confidence < MIN_TRANSCRIPT_PROBABILITY) {
      return true;
    }

    if (
      normalizedTranscript.length < MIN_TRANSCRIPT_CHARACTERS &&
      (confidence === null || confidence < MIN_SHORT_TRANSCRIPT_PROBABILITY) &&
      !isLikelySpeechLevel(turn.peakLevel)
    ) {
      return true;
    }

    return !isLikelySpeechLevel(turn.peakLevel) && confidence !== null && confidence < 0.7;
  }

  function trySendQueuedResponse(request: QueuedResponseRequest | null) {
    if (!request) {
      return;
    }

    if (activeResponseRef.current) {
      queuedResponseRequestRef.current = request;
      return;
    }

    if (request.source === "turn" && request.itemId) {
      const pendingTurn = pendingTurnsRef.current.get(request.itemId);

      if (
        !pendingTurn ||
        pendingTurn.ignored ||
        pendingTurn.responded ||
        pendingTurn.epoch !== latestSpeechEpochRef.current ||
        speechIsActiveRef.current
      ) {
        queuedResponseRequestRef.current = null;
        return;
      }
    }

    const sent = sendRealtimeEvent({ type: "response.create" });

    if (!sent) {
      queuedResponseRequestRef.current = request;
      return;
    }

    queuedResponseRequestRef.current = null;
    activeResponseRef.current = true;
    turnCooldownUntilRef.current = Date.now() + TURN_RESPONSE_COOLDOWN_MS;

    if (request.source === "turn" && request.itemId) {
      const pendingTurn = pendingTurnsRef.current.get(request.itemId);

      if (pendingTurn) {
        pendingTurn.responded = true;
        pendingTurn.scheduled = false;
      }
    }

    setStatus("responding");
  }

  function requestAssistantResponse(request: QueuedResponseRequest = { source: "tool" }) {
    trySendQueuedResponse(request);
  }

  function queueTurnResponse(itemId: string) {
    const pendingTurn = pendingTurnsRef.current.get(itemId);

    if (
      !pendingTurn ||
      pendingTurn.ignored ||
      pendingTurn.responded ||
      pendingTurn.epoch !== latestSpeechEpochRef.current ||
      speechIsActiveRef.current
    ) {
      return;
    }

    clearPendingTurnResponse();
    pendingTurn.scheduled = true;
    const continuationHoldDelay = pendingTurn.transcript
      ? getContinuationHoldDelay(pendingTurn.transcript)
      : 0;

    const waitUntil = Math.max(
      pendingTurn.stoppedAt + RESPONSE_DEBOUNCE_MS + continuationHoldDelay,
      turnCooldownUntilRef.current,
    );
    const delay = Math.max(0, waitUntil - Date.now());

    pendingResponseTimerRef.current = window.setTimeout(() => {
      pendingResponseTimerRef.current = null;
      const latestPendingTurn = pendingTurnsRef.current.get(itemId);

      if (
        !latestPendingTurn ||
        latestPendingTurn.ignored ||
        latestPendingTurn.responded ||
        latestPendingTurn.epoch !== latestSpeechEpochRef.current ||
        speechIsActiveRef.current
      ) {
        return;
      }

      latestPendingTurn.scheduled = false;
      requestAssistantResponse({ source: "turn", itemId });
    }, delay);
  }

  function interruptAssistantResponse() {
    clearPendingTurnResponse();
    queuedResponseRequestRef.current = null;

    if (!activeResponseRef.current) {
      return;
    }

    sendRealtimeEvent({ type: "response.cancel" });
    sendRealtimeEvent({ type: "output_audio_buffer.clear" });
    assistantEntryIdRef.current = null;
    setStatus("listening");
  }

  function queueFunctionCallOutput(callId: string, output: Record<string, unknown>) {
    const serializedOutput = JSON.stringify(output);

    if (
      activeResponseRef.current ||
      !sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: serializedOutput,
        },
      })
    ) {
      pendingToolOutputsRef.current = [
        ...pendingToolOutputsRef.current,
        { callId, output: serializedOutput },
      ];
      queuedResponseRequestRef.current = { source: "tool" };
      return;
    }

    requestAssistantResponse({ source: "tool" });
  }

  function flushPendingRealtimeActions() {
    if (activeResponseRef.current) {
      return;
    }

    if (pendingToolOutputsRef.current.length > 0) {
      const pendingOutputs = pendingToolOutputsRef.current;
      pendingToolOutputsRef.current = [];

      for (const pendingOutput of pendingOutputs) {
        const sent = sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: pendingOutput.callId,
            output: pendingOutput.output,
          },
        });

        if (!sent) {
          pendingToolOutputsRef.current = [
            pendingOutput,
            ...pendingToolOutputsRef.current,
          ];
          queuedResponseRequestRef.current = { source: "tool" };
          return;
        }
      }

      requestAssistantResponse({ source: "tool" });
      return;
    }

    if (queuedResponseRequestRef.current) {
      trySendQueuedResponse(queuedResponseRequestRef.current);
    }
  }

  function appendAssistantDelta(delta: string, itemId?: string) {
    if (!delta) {
      return;
    }

    const nextId = itemId ?? assistantEntryIdRef.current ?? createSafeId("voice-assistant");
    const signature = `${nextId}:${delta}`;
    const lastSignature = recentAssistantDeltaSignatureRef.current;

    if (
      lastSignature &&
      lastSignature.signature === signature &&
      Date.now() - lastSignature.at < 240
    ) {
      return;
    }

    recentAssistantDeltaSignatureRef.current = { signature, at: Date.now() };
    assistantEntryIdRef.current = nextId;
    lastAssistantSpeechAtRef.current = Date.now();

    setLocalTranscript((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === nextId);

      if (existingIndex === -1) {
        return trimPersistedTranscript([
          ...current,
          { id: nextId, role: "assistant", text: delta },
        ]);
      }

      const next = [...current];
      next[existingIndex] = {
        ...next[existingIndex],
        text: `${next[existingIndex].text}${delta}`,
      };
      return trimPersistedTranscript(next);
    });
  }

  async function executeRealtimeTool(
    name: string,
    rawInput: unknown,
  ): Promise<Record<string, unknown>> {
    if (name === "remember_preferred_name") {
      const output = getRememberedPreferredNameResult(rawInput as RememberPreferredNameToolInput);
      const nextName = normalizePreferredName(output.preferredName);

      if (nextName) {
        setRememberedName(nextName);
        setSubmissionNotice(
          language === "urdu"
            ? `${nextName}، ہم نے آپ کا نام اسی براؤزر میں یاد رکھ لیا ہے۔`
            : `${nextName}, we have saved your name in this browser so the conversation can continue more naturally.`,
        );
      }

      return output;
    }

    if (name === "book_session") {
      const input = rawInput as Partial<BookSessionToolInput>;

      if (!bookingConfigured) {
        return {
          ok: false,
          message:
            "The follow-up request service is not available right now. Please ask the caller to use the helpline 0300-7413639.",
        };
      }

      const nextDraft = await prepareIntakeDraft(input);

      if (!nextDraft) {
        return {
          ok: false,
          message:
            "The handoff review could not be prepared right now. Ask the caller to use the helpline if it is urgent.",
        };
      }

      return {
        ok: true,
        status: "review-required",
        needsUserReview: true,
        message:
          "A handoff draft is ready below. Ask the caller to review the details, confirm consent, and send it to the Willing Ways team.",
        helpline: "0300-7413639",
      };
    }

    if (name === "get_contact") {
      return getContactResult(rawInput as ContactToolInput);
    }

    if (name === "crisis_redirect") {
      return getCrisisRedirectResult(rawInput as CrisisRedirectToolInput);
    }

    if (name === "send_resource") {
      return getSupportResourceResult(rawInput as SendResourceToolInput);
    }

    if (name === "escalate_to_human") {
      return getHumanEscalationResult(rawInput as EscalateToHumanToolInput);
    }

    return {
      ok: false,
      message: `Unsupported realtime tool: ${name}`,
    };
  }

  async function handleRealtimeToolCall(
    toolName: string,
    callId: string,
    rawArguments: string,
  ) {
    if (handledToolCallsRef.current.has(callId)) {
      return;
    }

    handledToolCallsRef.current.add(callId);

    let parsedArguments: unknown = {};

    try {
      parsedArguments = rawArguments ? JSON.parse(rawArguments) : {};
    } catch {
      parsedArguments = {};
    }

    setToolActivity(
      toolName === "remember_preferred_name"
        ? language === "urdu"
          ? "ہم آپ کا نام محفوظ کر رہے ہیں..."
          : "We are saving your name..."
        : toolName === "book_session"
          ? language === "urdu"
            ? "ہم آپ کی گفتگو کو review-ready handoff میں بدل رہے ہیں..."
            : "We are turning this call into a review-ready handoff..."
          : toolName === "crisis_redirect"
            ? language === "urdu"
              ? "ہم فوری حفاظتی رہنمائی تیار کر رہے ہیں..."
              : "We are preparing urgent safety guidance..."
            : language === "urdu"
              ? "ہم اگلا مفید قدم تیار کر رہے ہیں..."
              : "We are working on the next useful step...",
    );

    try {
      const output = await executeRealtimeTool(toolName, parsedArguments);
      queueFunctionCallOutput(callId, output);
    } catch (error) {
      queueFunctionCallOutput(callId, {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The tool call failed unexpectedly.",
      });
    }
  }

  function handleRealtimeEvent(event: unknown) {
    if (!event || typeof event !== "object" || !("type" in event)) {
      return;
    }

    const payload = event as Record<string, unknown>;
    const type = typeof payload.type === "string" ? payload.type : "";

    if (type === "input_audio_buffer.speech_started") {
      latestSpeechEpochRef.current += 1;
      activeSpeechEpochRef.current = latestSpeechEpochRef.current;
      speechIsActiveRef.current = true;
      currentSpeechPeakLevelRef.current = currentMicLevelRef.current;
      clearPendingTurnResponse();
      queuedResponseRequestRef.current = null;

      const likelyEchoStart =
        Date.now() - lastAssistantSpeechAtRef.current < ECHO_GUARD_WINDOW_MS &&
        !isLikelySpeechLevel(currentMicLevelRef.current);

      if (activeResponseRef.current && !likelyEchoStart && isLikelySpeechLevel()) {
        interruptAssistantResponse();
      }

      setStatus("listening");
      return;
    }

    if (type === "input_audio_buffer.speech_stopped") {
      speechIsActiveRef.current = false;
      stoppedTurnsQueueRef.current.push({
        epoch: activeSpeechEpochRef.current || latestSpeechEpochRef.current || 1,
        peakLevel: currentSpeechPeakLevelRef.current,
        stoppedAt: Date.now(),
      });
      currentSpeechPeakLevelRef.current = 0;
      setStatus(activeResponseRef.current ? "responding" : "listening");
      return;
    }

    if (type === "input_audio_buffer.committed") {
      const itemId =
        typeof payload.item_id === "string"
          ? payload.item_id
          : typeof payload.previous_item_id === "string"
            ? payload.previous_item_id
            : "";

      if (itemId) {
        createOrUpdateTurn(itemId);
      }

      return;
    }

    if (type === "response.created") {
      activeResponseRef.current = true;
      setStatus("responding");
      return;
    }

    if (type === "response.done") {
      activeResponseRef.current = false;
      lastAssistantSpeechAtRef.current = Date.now();
      assistantEntryIdRef.current = null;
      setStatus("listening");
      setToolActivity(null);
      flushPendingRealtimeActions();
      return;
    }

    if (
      type === "response.output_audio_transcript.delta" ||
      type === "response.audio_transcript.delta"
    ) {
      appendAssistantDelta(
        typeof payload.delta === "string" ? payload.delta : "",
        typeof payload.item_id === "string" ? payload.item_id : undefined,
      );
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const itemId =
        typeof payload.item_id === "string" ? payload.item_id : createSafeId("voice-user");
      const transcriptText =
        typeof payload.transcript === "string" ? payload.transcript.trim() : "";
      const confidence = probabilityFromAverageLogprob(extractAverageLogprob(payload));
      const pendingTurn = createOrUpdateTurn(itemId);

      if (!transcriptText) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      if (pendingTurn.epoch !== latestSpeechEpochRef.current) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      if (shouldIgnoreTranscript(transcriptText, pendingTurn, confidence)) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      pendingTurn.transcript = transcriptText;
      pendingTurn.confidence = confidence;

      setLocalTranscript((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === itemId);

        if (existingIndex === -1) {
          const lastEntry = current[current.length - 1];

          if (lastEntry?.role === "user") {
            const mergedTranscript = `${lastEntry.text.trim()} ${transcriptText}`.trim();
            const next = [...current];
            next[next.length - 1] = {
              ...lastEntry,
              text: mergedTranscript,
            };
            return trimPersistedTranscript(next);
          }

          return trimPersistedTranscript([
            ...current,
            {
              id: itemId,
              role: "user",
              text: transcriptText,
            },
          ]);
        }

        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          role: "user",
          text: transcriptText,
        };
        return trimPersistedTranscript(next);
      });

      if (!speechIsActiveRef.current) {
        queueTurnResponse(itemId);
        setStatus(activeResponseRef.current ? "responding" : "listening");
      }

      return;
    }

    if (type === "conversation.item.input_audio_transcription.failed") {
      const itemId =
        typeof payload.item_id === "string" ? payload.item_id : null;

      if (itemId) {
        const pendingTurn = createOrUpdateTurn(itemId);
        pendingTurn.ignored = true;
      }

      setStatus(activeResponseRef.current ? "responding" : "listening");
      return;
    }

    if (type === "response.function_call_arguments.done") {
      const callId =
        typeof payload.call_id === "string"
          ? payload.call_id
          : typeof payload.item_id === "string"
            ? payload.item_id
            : "";
      const name = typeof payload.name === "string" ? payload.name : "";

      if (!callId || !name) {
        return;
      }

      void handleRealtimeToolCall(
        name,
        callId,
        typeof payload.arguments === "string" ? payload.arguments : "",
      );
      return;
    }

    if (type === "response.output_item.done") {
      const item =
        typeof payload.item === "object" && payload.item
          ? (payload.item as Record<string, unknown>)
          : null;

      if (!item || item.type !== "function_call") {
        return;
      }

      const callId = typeof item.call_id === "string" ? item.call_id : "";
      const name = typeof item.name === "string" ? item.name : "";

      if (!callId || !name) {
        return;
      }

      void handleRealtimeToolCall(
        name,
        callId,
        typeof item.arguments === "string" ? item.arguments : "",
      );
      return;
    }

    if (type === "error") {
      const error =
        typeof payload.error === "object" &&
        payload.error &&
        "message" in payload.error
          ? String((payload.error as { message?: string }).message ?? "Realtime voice failed.")
          : "Realtime voice failed.";
      const lowerError = error.toLowerCase();

      if (lowerError.includes("active response in progress")) {
        activeResponseRef.current = true;
        setStatus("responding");
        return;
      }

      if (
        lowerError.includes("no active response") ||
        lowerError.includes("nothing to cancel") ||
        lowerError.includes("buffer is empty")
      ) {
        return;
      }

      setErrorMessage(normalizeRealtimeClientError(error, language));
      setStatus("error");
      setToolActivity(null);
    }
  }

  async function startSession(selection?: {
    focus?: VoiceCallFocusId;
    lessonId?: FamilyTrainingLessonId | null;
  }) {
    const callFocus = selection?.focus ?? selectedFocus;
    const callLessonId =
      callFocus === "family-coach"
        ? selection?.lessonId ?? selectedFamilyLessonId
        : null;
    const selectedCallLesson = getFamilyTrainingLesson(callLessonId);
    const baseResumeContext = buildVoiceResumeContext(localTranscript);
    const callerIdentityContext =
      identityHint === "self"
        ? "Caller says they are the patient."
        : identityHint === "family"
          ? "Caller says they are a family member or loved one seeking help."
          : "";
    const sessionResumeContext =
      callFocus === "family-coach" && selectedCallLesson
        ? `Preselected family coaching module: ${selectedCallLesson.englishTitle}. ${selectedCallLesson.englishTagline}${callerIdentityContext ? ` | ${callerIdentityContext}` : ""}${baseResumeContext ? ` | ${baseResumeContext}` : ""}`.slice(
            0,
            900,
          )
        : [callerIdentityContext, baseResumeContext].filter(Boolean).join(" | ").slice(0, 900);

    if (!enabled) {
      setErrorMessage(
        language === "urdu"
          ? "اے آئی کال اس وقت عارضی طور پر دستیاب نہیں۔"
          : "AI calling is temporarily unavailable right now.",
      );
      setStatus("error");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        language === "urdu"
          ? "اس کال کے لئے مائیکروفون درکار ہے، لیکن یہ browser اسے support نہیں کرتا۔"
          : "This call needs microphone access, but this browser does not support it.",
      );
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setSubmissionNotice(null);
    setToolActivity(null);
    handledToolCallsRef.current.clear();
    intentionalCloseRef.current = false;
    initialGreetingRequestedRef.current = false;
    setCallConnectedAt(null);
    setCallDurationSeconds(0);
    setIsMicMuted(false);
    stopRingToneLoop();
    setStatus("requesting");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      const peerConnection = new RTCPeerConnection();
      const dataChannel = peerConnection.createDataChannel("oai-events");

      dataChannelRef.current = dataChannel;
      localStreamRef.current = localStream;
      peerConnectionRef.current = peerConnection;

      dataChannel.onmessage = (messageEvent) => {
        try {
          handleRealtimeEvent(JSON.parse(messageEvent.data));
        } catch {
          // Ignore non-JSON realtime messages.
        }
      };

      dataChannel.onopen = () => {
        setCallConnectedAt(Date.now());
        setStatus("connected");
        startInitialGreeting();
      };

      dataChannel.onerror = () => {
        handleConnectionLost(
          language === "urdu"
            ? "کال غیر متوقع طور پر منقطع ہو گئی۔"
            : "The call disconnected unexpectedly.",
        );
      };

      dataChannel.onclose = () => {
        handleConnectionLost(
          language === "urdu"
            ? "کال منقطع ہو گئی۔ نئی کال شروع کر کے دوبارہ کوشش کریں۔"
            : "The call line closed unexpectedly. Please start a fresh call.",
        );
      };

      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const connectionState = peerConnection.connectionState;

        if (connectionState === "failed" || connectionState === "disconnected") {
          handleConnectionLost(
            language === "urdu"
              ? "کال لائن برقرار نہیں رہ سکی۔ براہ کرم دوبارہ کوشش کریں۔"
              : "The call line could not stay connected. Please try again.",
          );
        }
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
      trackMicrophoneLevel(localStream);
      setMicMutedState(false);

      setStatus("connecting");
      startRingToneLoop();

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const localSdp = peerConnection.localDescription?.sdp ?? offer.sdp ?? "";

      if (!localSdp.trim()) {
        throw new Error(
          language === "urdu"
            ? "کال شروع کرنے کے لئے آڈیو تیار نہیں ہو سکی۔"
            : "The browser could not prepare audio for the call.",
        );
      }

      const query = new URLSearchParams({
        focus: callFocus,
        language,
        mode,
        preferredName: rememberedName,
        resumeContext: sessionResumeContext,
        voice: voiceId,
      });

      if (callFocus === "family-coach" && callLessonId) {
        query.set("module", callLessonId);
      }

      const realtimeResponse = await fetch(`/api/realtime/session?${query.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: localSdp,
      });

      if (!realtimeResponse.ok) {
        throw new Error(await realtimeResponse.text());
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await realtimeResponse.text(),
      });
    } catch (error) {
      cleanupSession();
      setErrorMessage(
        normalizeRealtimeClientError(
          error instanceof Error ? error.message : "The AI call could not be started.",
          language,
        ),
      );
      setStatus("error");
    }
  }

  function stopSession() {
    cleanupSession();
    setErrorMessage(null);
    setStatus("idle");
  }

  const selectedFamilyLesson = useMemo(
    () => getFamilyTrainingLesson(selectedFamilyLessonId),
    [selectedFamilyLessonId],
  );
  const familyTrainingPreviewLessons = useMemo(
    () =>
      FAMILY_TRAINING_HOME_LESSON_IDS.map((lessonId) => getFamilyTrainingLesson(lessonId)).filter(
        (lesson): lesson is FamilyTrainingLesson => lesson !== null,
      ),
    [],
  );
  const selectedVoiceLabel =
    REALTIME_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId;
  const lastAssistantGuidance = useMemo(
    () => [...localTranscript].reverse().find((entry) => entry.role === "assistant") ?? null,
    [localTranscript],
  );
  const userTranscriptTexts = useMemo(
    () => localTranscript.filter((entry) => entry.role === "user").map((entry) => entry.text),
    [localTranscript],
  );
  const careSignal = useMemo(
    () => analyzeVoiceCareSignals(userTranscriptTexts),
    [userTranscriptTexts],
  );
  const hasConversationHistory = localTranscript.length > 0;
  const transcriptStoryLength = useMemo(
    () =>
      userTranscriptTexts
        .join(" ")
        .replace(/\s+/g, " ")
        .trim().length,
    [userTranscriptTexts],
  );
  const canPrepareHandoff =
    bookingConfigured && transcriptStoryLength >= 80;
  const callIsStarting = status === "requesting" || status === "connecting";
  const callIsLive =
    status === "connected" || status === "listening" || status === "responding";
  const CallOrbIcon =
    callIsLive && isMicMuted
      ? MicOff
      : status === "responding"
        ? Volume2
        : status === "listening" || status === "connected"
          ? Mic
          : PhoneCall;
  const showMinimalIdleIntro = false;
  const showUtilityPanels =
    showMoreOptions ||
    showFamilyTraining ||
    showVoiceOptions ||
    Boolean(intakeDraft) ||
    Boolean(submissionNotice) ||
    Boolean(toolActivity) ||
    Boolean(errorMessage);
  const guidancePreview = lastAssistantGuidance?.text
    ? lastAssistantGuidance.text.length > 300
      ? `${lastAssistantGuidance.text.slice(0, 300).trimEnd()}...`
      : lastAssistantGuidance.text
    : "";
  const selectedProgramId = useMemo<RecoveryProgramId>(() => {
    if (selectedFamilyLessonId === "intervention-preparation") {
      return "intervention-readiness";
    }

    if (selectedFocus === "family-coach") {
      return "family-first-response";
    }

    if (selectedFocus === "crisis-triage") {
      return "relapse-warning-radar";
    }

    if (selectedFocus === "guided-intake" || selectedFocus === "private-intake") {
      return "post-rehab-30-day";
    }

    const joinedText = userTranscriptTexts.join(" ").toLowerCase();

    if (/craving|urge|trigger/.test(joinedText)) {
      return "cravings-rescue";
    }

    if (/relapse|warning|secrecy|anger|isolation|follow-up|follow up/.test(joinedText)) {
      return "relapse-warning-radar";
    }

    return "post-rehab-30-day";
  }, [selectedFamilyLessonId, selectedFocus, userTranscriptTexts]);
  const selectedProgram = useMemo(
    () => getRecoveryProgram(selectedProgramId),
    [selectedProgramId],
  );

  const orbHelperText =
    callIsStarting
      ? language === "urdu"
        ? "کال مل رہی ہے۔"
        : "The line is ringing."
      : callIsLive && isMicMuted
        ? language === "urdu"
          ? "مائیک paused ہے۔"
          : "The microphone is paused."
        : callIsLive
          ? language === "urdu"
            ? "کال سن رہی ہے۔"
            : "The call is listening."
          : language === "urdu"
            ? "درمیانی بٹن سے کال شروع کریں۔"
            : "Use the center button to start the call.";
  const primaryControlInstruction =
    callIsStarting
      ? language === "urdu"
        ? "ایک بار دبا کر کال منسوخ کریں"
        : "Tap once to cancel the call"
      : callIsLive && isMicMuted
        ? language === "urdu"
          ? "ایک بار دبا کر مائیک دوبارہ شروع کریں"
          : "Tap once to resume the microphone"
        : callIsLive
          ? language === "urdu"
            ? "ایک بار دبا کر مائیک pause کریں"
            : "Tap once to pause the microphone"
          : language === "urdu"
            ? "ایک بار دبا کر کال شروع کریں"
            : "Tap once to start the call";
  const secondaryControlInstruction =
    callIsStarting
      ? language === "urdu"
        ? "اگر دیر لگے تو نیچے والا End call بٹن استعمال کریں"
        : "If it takes too long, use the End call button below"
      : callIsLive
        ? language === "urdu"
          ? "جب چاہیں نیچے والا End call بٹن دبا کر کال ختم کریں"
          : "Use the End call button when you are ready to finish"
        : language === "urdu"
          ? "کال کے دوران یہی بڑا بٹن دبا کر مائیک pause یا resume کریں"
          : "During the call, use the same big button to pause or resume the microphone";

  function toggleMicListeningState() {
    if (!callIsLive) {
      return;
    }

    if (!isMicMuted && activeResponseRef.current) {
      interruptAssistantResponse();
    }

    const nextMuted = !isMicMuted;
    setMicMutedState(nextMuted);
    setToolActivity(
      nextMuted
        ? language === "urdu"
          ? "سننا وقتی طور پر pause کر دیا گیا ہے۔"
          : "Listening is paused for a moment."
        : language === "urdu"
          ? "کال دوبارہ سننے کے لئے تیار ہے۔"
          : "The call is ready to listen again.",
    );
  }

  async function handleCallOrbClick() {
    if (callIsStarting) {
      stopSession();
      return;
    }

    if (callIsLive) {
      toggleMicListeningState();
      return;
    }

    await startSession({
      focus: selectedFocus,
      lessonId: selectedFamilyLessonId,
    });
  }

  function handleEndCall() {
    if (!callIsStarting && !callIsLive) {
      return;
    }

    stopSession();
  }

  async function handleStartFamilyTraining(lessonId: FamilyTrainingLessonId) {
    if (callIsStarting || callIsLive) {
      return;
    }

    updateCallSelection("family-coach", lessonId);
    setShowFamilyTraining(true);
    setShowMoreOptions(true);
    await startSession({ focus: "family-coach", lessonId });
  }

  function handleSelectRecoveryProgram(programId: RecoveryProgramId) {
    if (callIsStarting || callIsLive) {
      return;
    }

    const program = getRecoveryProgram(programId);

    if (!program) {
      return;
    }

    updateCallSelection(program.voiceFocus, program.familyLessonId ?? null);
    setShowFamilyTraining(false);
    setShowMoreOptions(false);
  }

  return (
    <section id="call" className="mx-auto h-full max-w-[1120px]">
      <audio ref={audioRef} autoPlay />

      <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/96 px-3 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(255,255,255,0.98),_transparent_28%)]" />

        <div
          className={`relative flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] ${
            !showUtilityPanels && !hasConversationHistory && !errorMessage ? "md:justify-center" : ""
          }`}
        >
          <div className="mx-auto max-w-[900px]">
            <h1
              className={`max-w-[760px] text-[1.9rem] font-semibold leading-[1.02] tracking-[-0.03em] text-slate-900 sm:text-[3.35rem] [@media(max-height:700px)]:text-[1.55rem] ${
                language === "urdu" ? "font-urdu text-right" : "text-left"
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {selectedFamilyLesson
                ? language === "urdu"
                  ? "گھر کے اندر مشکل گفتگو کو پرسکون اور مؤثر بنائیں"
                  : "Make the hard family conversation calmer and more effective."
                : language === "urdu"
                  ? "نشہ، relapse کے خطرے، اور پریشان خاندانوں کے لئے فوری مدد"
                  : "Immediate support for addiction, relapse risk, and overwhelmed families."}
            </h1>

            <p
              className={`mt-3 max-w-[700px] text-[15px] leading-7 text-slate-600 [@media(max-height:700px)]:hidden ${
                language === "urdu" ? "font-urdu text-right" : "text-left"
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {selectedFamilyLesson
                ? language === "urdu"
                  ? "یہ call خاندان کو denial، boundaries، enabling اور intervention readiness کے لئے ایک سیدھی، پرسکون اور عملی script دیتی ہے۔"
                  : "This call gives the family a calm, practical script for denial, boundaries, enabling, and intervention readiness."
                : language === "urdu"
                  ? "اے آئی پہلے سلام کرتی ہے، آپ کا نام کنفرم کرتی ہے، پوری بات سنتی ہے، اور پھر relapse prevention، family support یا مناسب human handoff کے ساتھ ایک واضح اگلا قدم دیتی ہے۔"
                  : "The AI greets first, confirms your name, listens fully, and then gives one clear next step for relapse prevention, family support, or the right human handoff."}
            </p>
          </div>

          <div className="mx-auto mt-4 flex w-full max-w-[920px] flex-col rounded-[30px] border border-[rgba(15,23,42,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(249,249,246,0.96))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_42px_rgba(15,23,42,0.06)] sm:px-6 sm:py-6 [@media(max-height:700px)]:mt-3 [@media(max-height:700px)]:px-3 [@media(max-height:700px)]:py-3">
            <div className="flex items-center justify-between gap-3">
              <div
                className={`text-left ${language === "urdu" ? "font-urdu text-right" : ""}`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {language === "urdu"
                    ? "پرائیویٹ اے آئی کال"
                    : "Private AI call"}
                </div>
                <div className="mt-1 text-base font-semibold text-slate-950">
                  {language === "urdu"
                    ? "درمیانی دائرہ سب سے اہم بٹن ہے"
                    : "The center circle is the main call button"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {selectedFamilyLesson
                    ? language === "urdu"
                      ? "نجی فیملی کوچنگ سپورٹ"
                      : "Private family coaching support"
                    : language === "urdu"
                      ? "relapse prevention، family support اور post-rehab follow-through"
                      : "Relapse prevention, family support, and post-rehab follow-through"}
                </div>
              </div>

              {callIsLive ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                  <Clock3 className="h-4 w-4" />
                  {formatCallDuration(callDurationSeconds)}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col items-center text-center sm:mt-5">
              <button
                type="button"
                onClick={() => void handleCallOrbClick()}
                aria-label={
                  callIsLive
                    ? isMicMuted
                      ? language === "urdu"
                        ? "سننا دوبارہ شروع کریں"
                        : "Resume listening"
                      : language === "urdu"
                        ? "سننا pause کریں"
                        : "Pause listening"
                    : language === "urdu"
                      ? "ولنگ ویز AI call شروع کریں"
                      : "Start the Willing Ways AI call"
                }
                className={`voice-orb h-32 w-32 cursor-pointer sm:h-36 sm:w-36 ${
                  callIsLive ? "voice-orb-live" : callIsStarting ? "voice-orb-ringing" : ""
                }`}
              >
                <div className="flex h-[4.6rem] w-[4.6rem] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff,#f1f5f9)] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_24px_rgba(15,23,42,0.08)] sm:h-[5.2rem] sm:w-[5.2rem]">
                  <CallOrbIcon
                    className={`h-7 w-7 sm:h-8 sm:w-8 ${
                      status === "responding"
                        ? "text-slate-900"
                        : status === "listening" || status === "connected"
                          ? "text-slate-700"
                          : "text-slate-600"
                    }`}
                  />
                </div>
              </button>

              {callIsStarting || callIsLive ? (
                <div
                  className={`voice-wave ${
                    callIsLive
                      ? isMicMuted
                        ? "voice-wave-idle"
                        : "voice-wave-live"
                      : "voice-wave-ringing"
                  }`}
                >
                  {Array.from({ length: 6 }).map((_, index) => (
                    <span
                      key={index}
                      className="voice-wave-bar"
                      style={{ animationDelay: `${index * 0.12}s` }}
                    />
                  ))}
                </div>
              ) : null}

              <div
                className={`mt-2 text-sm leading-6 text-slate-600 ${
                  language === "urdu" ? "font-urdu text-right" : "text-left"
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
                role="status"
                aria-live="polite"
              >
                {orbHelperText}
              </div>

              <div
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold shadow-sm ${
                  callIsLive && !isMicMuted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : callIsLive && isMicMuted
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-slate-200 bg-white text-slate-700"
                } ${language === "urdu" ? "font-urdu" : ""}`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {callIsStarting
                  ? language === "urdu"
                    ? "کال مل رہی ہے"
                    : "Calling now"
                  : callIsLive && isMicMuted
                    ? language === "urdu"
                      ? "مائیک عارضی طور پر بند ہے"
                      : "Microphone paused"
                    : callIsLive
                      ? language === "urdu"
                        ? "مائیک کھلا ہے اور کال سن رہی ہے"
                        : "Microphone is live"
                      : language === "urdu"
                        ? "کال شروع کرنے کے لئے تیار"
                      : "Ready to start"}
              </div>

              <div className="mt-4 flex w-full max-w-[540px] flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={() => void handleCallOrbClick()}
                  className="h-12 flex-1 rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(15,23,42,0.16)] hover:bg-slate-900"
                >
                  {callIsStarting ? (
                    <RefreshCcw className="h-4 w-4" />
                  ) : callIsLive ? (
                    isMicMuted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />
                  ) : (
                    <PhoneCall className="h-4 w-4" />
                  )}
                  {callIsStarting
                    ? language === "urdu"
                      ? "کال منسوخ کریں"
                      : "Cancel call"
                    : callIsLive && isMicMuted
                      ? language === "urdu"
                        ? "مائیک دوبارہ شروع کریں"
                        : "Resume microphone"
                      : callIsLive
                        ? language === "urdu"
                          ? "مائیک pause کریں"
                          : "Pause microphone"
                        : language === "urdu"
                          ? "ولنگ ویز اے آئی کال شروع کریں"
                          : "Start the Willing Ways AI call"}
                </Button>

                {callIsStarting || callIsLive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEndCall}
                    className="h-12 rounded-2xl border-rose-200 bg-white px-5 text-sm font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  >
                    <PhoneOff className="h-4 w-4" />
                    {language === "urdu" ? "کال ختم کریں" : "End call"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMoreOptions(true)}
                    className="h-12 rounded-2xl border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ChevronDown className="h-4 w-4" />
                    {language === "urdu" ? "مزید اختیارات" : "More options"}
                  </Button>
                )}
              </div>

              <div
                className={`mt-3 text-center text-[12px] leading-6 text-slate-500 ${
                  language === "urdu" ? "font-urdu" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {primaryControlInstruction}
                <span className="mx-2 text-slate-300">•</span>
                {secondaryControlInstruction}
              </div>
            </div>

            {rememberedName ? (
              <div
                className={`mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ${
                  language === "urdu" ? "font-urdu" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <UserRound className="h-3.5 w-3.5" />
                {language === "urdu"
                  ? `${rememberedName}، وہیں سے دوبارہ شروع کریں`
                  : `Continue gently with ${rememberedName}`}
              </div>
            ) : null}

            {!selectedFamilyLesson &&
            selectedProgram &&
            showMoreOptions &&
            (selectedFocus !== "general-support" || transcriptStoryLength > 0) ? (
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div
                    className={language === "urdu" ? "font-urdu text-right" : ""}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {language === "urdu" ? "آج کے لئے بہتر track" : "Best track for this moment"}
                    </div>
                    <div className="mt-1 text-base font-semibold text-slate-950">
                      {language === "urdu" ? selectedProgram.urduLabel : selectedProgram.englishLabel}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      {language === "urdu" ? selectedProgram.urduTagline : selectedProgram.englishTagline}
                    </div>
                  </div>
                  <div
                    className={`rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 ${
                      language === "urdu" ? "font-urdu" : ""
                    }`}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    {language === "urdu" ? selectedProgram.urduCadence : selectedProgram.englishCadence}
                  </div>
                </div>
              </div>
            ) : null}

            {selectedFamilyLesson ? (
              <div className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 text-left shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div
                    className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {language === "urdu" ? "منتخب family coaching" : "Selected family coaching"}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">
                      {language === "urdu"
                        ? selectedFamilyLesson.urduTitle
                        : selectedFamilyLesson.englishTitle}
                    </div>
                    <div className="mt-1 text-sm leading-7 text-slate-600">
                      {language === "urdu"
                        ? selectedFamilyLesson.urduTagline
                        : selectedFamilyLesson.englishTagline}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={clearFamilyCoachingSelection}
                    disabled={callIsStarting || callIsLive}
                    className="site-inline-link disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    <span
                      className={language === "urdu" ? "font-urdu" : ""}
                      dir={language === "urdu" ? "rtl" : "ltr"}
                    >
                      {language === "urdu" ? "عام کال پر واپس جائیں" : "Back to general support"}
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

            {showMinimalIdleIntro ? (
              <div
                className={`mt-3 text-center text-sm leading-6 text-slate-500 sm:mt-4 ${
                  language === "urdu" ? "font-urdu" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu"
                  ? "مائیک درکار ہے۔ اے آئی پہلے سلام کرے گی، پھر سنے گی۔"
                  : "Mic required. The AI greets first, then listens."}
              </div>
            ) : null}

            {!showUtilityPanels ? (
              <div className="mt-4 space-y-3">
                <div
                  className={`mx-auto max-w-[680px] text-center text-sm leading-6 text-slate-500 ${
                    language === "urdu" ? "font-urdu" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {language === "urdu"
                    ? "اے آئی پہلے سلام کرتی ہے، آپ کا نام کنفرم کرتی ہے، پوری بات سنتی ہے، اور پھر ایک واضح اگلا قدم دیتی ہے۔"
                    : "The AI greets first, confirms your name, listens fully, and then gives one clear next step."}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      icon: HeartHandshake,
                      urdu: "فیملی سسٹم سپورٹ",
                      english: "Family-system support",
                    },
                    {
                      icon: Mic,
                      urdu: "اردو، انگریزی، پنجابی",
                      english: "Urdu, English, Punjabi",
                    },
                    {
                      icon: CheckCircle2,
                      urdu: "ضرورت پر صاف handoff",
                      english: "Clear handoff when needed",
                    },
                  ].map((item) => (
                    <div
                      key={item.english}
                      className="rounded-[18px] border border-slate-200/80 bg-white/90 px-4 py-3 text-center shadow-sm"
                    >
                      <item.icon className="mx-auto h-4 w-4 text-slate-700" />
                      <div
                        className={`mt-2 text-xs font-semibold text-slate-700 ${
                          language === "urdu" ? "font-urdu" : ""
                        }`}
                        dir={language === "urdu" ? "rtl" : "ltr"}
                      >
                        {language === "urdu" ? item.urdu : item.english}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {showUtilityPanels || hasConversationHistory || errorMessage ? (
              <div className="mt-4 max-h-[36dvh] overflow-y-auto pr-1 sm:max-h-[38dvh]">
            {showUtilityPanels ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowFamilyTraining((current) => !current)}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
                  >
                    <HeartHandshake className="h-4 w-4 text-slate-700" />
                    <span
                      className={language === "urdu" ? "font-urdu" : ""}
                      dir={language === "urdu" ? "rtl" : "ltr"}
                    >
                      {language === "urdu"
                        ? "فیملی کوچنگ کی مشق"
                        : "Practice with family coaching"}
                    </span>
                    {showFamilyTraining ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/family-training" className="site-inline-link">
                      <HeartHandshake className="h-4 w-4" />
                      <span
                        className={language === "urdu" ? "font-urdu" : ""}
                        dir={language === "urdu" ? "rtl" : "ltr"}
                      >
                        {language === "urdu" ? "تمام modules دیکھیں" : "View all modules"}
                      </span>
                    </Link>
                    {!hasConversationHistory && !callIsLive ? (
                      <button
                        type="button"
                        onClick={() => setShowMoreOptions(false)}
                        className="site-inline-link"
                      >
                        <ChevronUp className="h-4 w-4" />
                        <span
                          className={language === "urdu" ? "font-urdu" : ""}
                          dir={language === "urdu" ? "rtl" : "ltr"}
                        >
                          {language === "urdu" ? "کم دکھائیں" : "Show less"}
                        </span>
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            {showUtilityPanels && showFamilyTraining ? (
              <div className="mt-4 rounded-[28px] border border-black/5 bg-white px-4 py-4 shadow-sm sm:px-5">
                <div
                  className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {language === "urdu" ? "فیملی کوچنگ" : "Family coaching"}
                  </div>
                  <div className="mt-2 text-base leading-7 text-slate-700">
                    {language === "urdu"
                      ? "ایک مختصر practice منتخب کریں۔ اے آئی پہلے سلام کرے گی، نام کنفرم کرے گی، پھر selected practice کے مطابق آپ کو script، roleplay اور next step دے گی۔"
                      : "Choose a short practice. The AI will greet you first, confirm your name, and then coach you through the selected script, roleplay, and next step."}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {familyTrainingPreviewLessons.map((lesson) => {
                    const isSelected = selectedFamilyLessonId === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className={`rounded-[24px] border px-4 py-4 text-left transition ${
                          isSelected
                            ? "border-slate-300 bg-slate-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                            {language === "urdu"
                              ? `${lesson.durationMinutes} منٹ practice`
                              : `${lesson.durationMinutes} min practice`}
                          </div>
                          {isSelected ? (
                            <div className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">
                              {language === "urdu" ? "منتخب" : "Selected"}
                            </div>
                          ) : null}
                        </div>

                        <div
                          className={`mt-3 ${language === "urdu" ? "font-urdu text-right" : ""}`}
                          dir={language === "urdu" ? "rtl" : "ltr"}
                        >
                          <div className="text-lg font-semibold text-slate-950">
                            {language === "urdu" ? lesson.urduTitle : lesson.englishTitle}
                          </div>
                          <div className="mt-1 text-sm leading-7 text-slate-600">
                            {language === "urdu" ? lesson.urduTagline : lesson.englishTagline}
                          </div>
                          <div className="mt-3 text-sm leading-7 text-slate-700">
                            {language === "urdu" ? lesson.urduOutcome : lesson.englishOutcome}
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => void handleStartFamilyTraining(lesson.id)}
                          disabled={callIsStarting || callIsLive}
                          className="mt-4 h-11 w-full text-sm"
                        >
                          <MessageSquare className="h-4 w-4" />
                          {language === "urdu" ? "مشق شروع کریں" : "Start practice"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                {callIsLive || callIsStarting ? (
                  <div
                    className={`mt-4 text-sm text-slate-500 ${
                      language === "urdu" ? "font-urdu text-right" : ""
                    }`}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    {language === "urdu"
                      ? "نئی practice شروع کرنے کے لئے پہلے موجودہ کال ختم کریں۔"
                      : "End the current call first if you want to switch into a new family practice."}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showUtilityPanels ? (
              <>
            {!callIsLive ? (
              <div className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm sm:px-5">
                <div
                  className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {language === "urdu"
                      ? "اپنی صورتحال کے مطابق support track"
                      : "Choose a support track"}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {language === "urdu"
                      ? "اگر آپ چاہیں تو کال سے پہلے track منتخب کریں۔ عام support کے لئے سیدھی کال کافی ہے۔"
                      : "If you want, choose a track before the call. For general support, you can simply start the call."}
                  </div>
                </div>
                <div className="mt-4">
                  <ProgramCardList
                    language={language}
                    programIds={HOME_RECOVERY_PROGRAM_IDS}
                    selectedProgramId={selectedProgramId}
                    onSelect={handleSelectRecoveryProgram}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowVoiceOptions((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Volume2 className="h-4 w-4 text-slate-700" />
                <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                  {language === "urdu"
                    ? `آواز (${selectedVoiceLabel})`
                    : `Voice (${selectedVoiceLabel})`}
                </span>
                {showVoiceOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>

            {showVoiceOptions ? (
              <label className="mt-4 block space-y-2">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                    language === "urdu" ? "font-urdu justify-end normal-case" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <Volume2 className="h-4 w-4 text-slate-700" />
                  {language === "urdu"
                    ? `آواز منتخب کریں (${selectedVoiceLabel})`
                    : `Choose a voice (${selectedVoiceLabel})`}
                </div>
                <select
                  className="flex h-12 w-full rounded-2xl border border-white/90 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={callIsStarting || callIsLive}
                  value={voiceId}
                  onChange={(event) => setVoiceId(event.target.value as RealtimeVoiceId)}
                >
                  {REALTIME_VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {toolActivity ? (
              <div
                className={`mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {toolActivity}
              </div>
            ) : null}

            {submissionNotice ? (
              <div
                className={`mt-4 flex items-start gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submissionNotice}</span>
              </div>
            ) : null}

            {intakeDraft ? (
              <VoiceIntakeReview
                draft={intakeDraft}
                language={language}
                message={intakeReviewMessage}
                onFieldChange={handleIntakeDraftFieldChange}
                onRefreshDraft={() => void prepareIntakeDraft(bookingPrefillRef.current)}
                onSubmit={(event) => void handleSubmitIntakeReview(event)}
                preparing={intakeReviewStatus === "preparing"}
                status={intakeReviewStatus}
              />
            ) : canPrepareHandoff ? (
              <div className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-sm sm:px-5">
                <div
                  className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {language === "urdu" ? "ولنگ ویز ٹیم کے لئے summary" : "Summary for the Willing Ways team"}
                  </div>
                  <div className="mt-2 text-base leading-7 text-slate-800">
                    {language === "urdu"
                      ? "اگر آپ چاہتے ہیں کہ ولنگ ویز ٹیم follow-up کرے تو اے آئی اس کال کو ایک صاف summary میں بدل سکتی ہے۔ بھیجنے سے پہلے آپ ہر detail خود چیک کریں گے۔"
                      : "If you want Willing Ways to follow up, the AI can turn this call into a clear handoff summary. You will review every detail before anything is sent."}
                  </div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {language === "urdu"
                      ? "یہ summary اسی براؤزر میں موجود نوٹس سے تیار ہوگی، پھر آپ کی رضامندی کے بعد ہی ٹیم کو بھیجی جائے گی۔"
                      : "The summary is prepared from the notes saved in this browser, and it is only sent after you explicitly approve it."}
                  </div>
                </div>

                {intakeReviewMessage ? (
                  <div
                    className={`mt-4 rounded-[20px] border px-4 py-3 text-sm ${
                      intakeReviewStatus === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-900"
                        : "border-slate-200 bg-slate-50 text-slate-700"
                    } ${language === "urdu" ? "font-urdu text-right" : ""}`}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    {intakeReviewMessage}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => void prepareIntakeDraft()}
                    disabled={intakeReviewStatus === "preparing"}
                    className="h-11"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {language === "urdu"
                      ? "review کے لئے handoff تیار کریں"
                      : "Prepare handoff review"}
                  </Button>

                  <a href="tel:+923007413639" className="site-inline-link">
                    <PhoneCall className="h-4 w-4" />
                    <span
                      className={language === "urdu" ? "font-urdu" : ""}
                      dir={language === "urdu" ? "rtl" : "ltr"}
                    >
                      {language === "urdu"
                        ? "فوراً ٹیم کو کال کریں"
                        : "Call the team now instead"}
                    </span>
                  </a>
                </div>
              </div>
            ) : null}

            {lastAssistantGuidance ? (
              <div
                className={`mt-4 rounded-[22px] border border-black/5 bg-white px-4 py-4 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {language === "urdu" ? "آج رات کا پرسکون اگلا قدم" : "Tonight's steady step"}
                </div>
                <div className="mt-2 text-base leading-7 text-slate-800">{guidancePreview}</div>
              </div>
            ) : null}

            {careSignal && careSignal.severity !== "normal" ? (
              <div
                className={`mt-4 rounded-[20px] border px-4 py-3 text-sm leading-7 ${
                  careSignal.severity === "urgent"
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                } ${language === "urdu" ? "font-urdu text-right" : ""}`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  {language === "urdu"
                    ? "اس گفتگو میں اہم care cues نظر آ رہے ہیں"
                    : "This conversation is showing important care cues"}
                </div>
                <div className="mt-2">
                  {careSignal.severity === "urgent"
                    ? language === "urdu"
                      ? "فوری خطرے کے اشارے موجود ہیں۔ 1122 یا 0300-7413639 کو ترجیح دیں۔"
                      : "Urgent-risk cues are present. Prioritize 1122 or 0300-7413639."
                    : language === "urdu"
                      ? "distress، privacy یا relapse cues موجود ہیں، اس لئے اگلا قدم احتیاط سے لیا جائے گا۔"
                      : "Distress, privacy, or relapse cues are present, so the next step should be handled carefully."}
                </div>
                {careSignal.severity === "urgent" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href="tel:1122"
                      className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100"
                    >
                      <PhoneCall className="h-4 w-4" />
                      {language === "urdu" ? "1122 پر کال کریں" : "Call 1122"}
                    </a>
                    <a
                      href="tel:+923007413639"
                      className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-900 transition hover:bg-rose-100"
                    >
                      <PhoneCall className="h-4 w-4" />
                      {language === "urdu"
                        ? "0300-7413639 پر کال کریں"
                        : "Call 0300-7413639"}
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}

            {hasConversationHistory ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {language === "urdu" ? "گفتگو کے نوٹس" : "Conversation notes"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {language === "urdu"
                      ? "آپ کی پچھلی گفتگو اسی براؤزر میں محفوظ رہتی ہے تاکہ آپ اگلی بار وہیں سے بات جاری رکھ سکیں۔"
                      : "Your previous call notes stay in this browser so you can continue later."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotes((current) => !current)}
                  className="site-action-link justify-center self-start sm:self-auto"
                >
                  {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                    {showNotes
                      ? language === "urdu"
                        ? "نوٹس بند کریں"
                        : "Hide notes"
                      : language === "urdu"
                        ? "نوٹس دیکھیں"
                        : "View notes"}
                    </span>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={clearLocalVoiceMemory}
                  disabled={callIsStarting || callIsLive}
                  className="site-inline-link disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span
                    className={language === "urdu" ? "font-urdu" : ""}
                    dir={language === "urdu" ? "rtl" : "ltr"}
                  >
                    {language === "urdu"
                      ? "محفوظ شدہ نام اور نوٹس صاف کریں"
                      : "Clear saved name and notes"}
                  </span>
                </button>
                <div
                  className={`text-xs leading-6 text-slate-500 ${
                    language === "urdu" ? "font-urdu text-right" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {language === "urdu"
                    ? "یہ صرف اسی براؤزر سے مقامی نوٹس اور محفوظ شدہ نام ہٹاتا ہے۔"
                    : "This removes only the locally saved notes and remembered name from this browser."}
                </div>
              </div>

              {showNotes ? (
                <div className="mt-4 grid gap-3">
                  {localTranscript.slice(-8).map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[22px] border px-4 py-4 ${
                        entry.role === "assistant"
                          ? "border-white/80 bg-white"
                          : "border-[#ead6dc] bg-[#fff3f6]"
                      }`}
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {entry.role === "assistant"
                          ? language === "urdu"
                            ? "ولنگ ویز اے آئی"
                            : "Willing Ways AI"
                          : language === "urdu"
                            ? "آپ"
                            : "You"}
                      </div>
                      <div
                        className={`mt-2 text-base leading-7 text-slate-800 ${
                          language === "urdu" ? "font-urdu text-right" : ""
                        }`}
                        dir={language === "urdu" ? "rtl" : "ltr"}
                      >
                        {entry.text}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            ) : null}
            </>
            ) : null}

            {errorMessage ? (
              <div
                className={`mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {errorMessage}
              </div>
            ) : null}
              </div>
            ) : null}
          </div>

          {!callIsLive && !callIsStarting ? (
            <div
              className={`mt-3 text-center text-[11px] leading-5 text-slate-500 ${
                language === "urdu" ? "font-urdu" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu"
                ? "محبت سے تعمیر: ڈاکٹر زارک خان"
                : "Built with love by Dr Zarak Khan"}
            </div>
          ) : null}
        </div>
      </section>
    </section>
  );
}
