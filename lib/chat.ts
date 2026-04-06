import type { UIMessage } from "ai";

import { createSafeId } from "@/lib/utils";

export type ChatMode = "adaptive" | "patient" | "doctor";
export type ChatLanguage = "english" | "urdu";
export type ModelId = "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo";
export type TextChatAudience = "patient" | "family" | "staff" | "classroom";
export type VoiceCallFocusId =
  | "general-support"
  | "guided-intake"
  | "family-coach"
  | "crisis-triage"
  | "founder-method"
  | "private-intake";
export type RealtimeVoiceId =
  | "cedar"
  | "marin"
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse";

export interface VoiceTranscriptEntry {
  id: string;
  role: "assistant" | "user";
  text: string;
}

export type ProgramId = "find-treatment" | "family-recovery" | "stay-on-track" | "urgent-safety";
export type ProgramAudience = "self" | "family" | "doctor";

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  welcomed: boolean;
  mode: ChatMode;
  language: ChatLanguage;
  messages: UIMessage[];
  preferredName?: string;
  textAudience?: TextChatAudience;
  voiceTranscript: VoiceTranscriptEntry[];
  programId?: ProgramId;
  programStage?: "intro" | "conversation" | "review" | "handoff";
  programAudience?: ProgramAudience;
}

export interface RuntimeStatus {
  bookingConfigured?: boolean;
  caseStoreConfigured?: boolean;
  notionDailyDigestConfigured?: boolean;
  realtimeConfigured: boolean;
  serverKeyConfigured: boolean;
  staffDashboardAuthConfigured?: boolean;
  staffDashboardConfigured?: boolean;
  staffDashboardStorageConfigured?: boolean;
  usageAnalyticsConfigured?: boolean;
}

export interface VoiceCallFocusOption {
  id: VoiceCallFocusId;
  englishLabel: string;
  urduLabel: string;
  englishTag: string;
  urduTag: string;
  englishDescription: string;
  urduDescription: string;
  englishStarter: string;
  urduStarter: string;
}

export interface VoiceCareSignal {
  detectedLanguage: "english" | "urdu" | "punjabi" | "mixed";
  severity: "normal" | "watch" | "urgent";
  emotionalLoad: "steady" | "distressed" | "acute";
  categories: Array<"crisis" | "distress" | "family" | "privacy" | "relapse">;
  matchedCues: string[];
}

export interface TextChatAudienceOption {
  id: TextChatAudience;
  englishLabel: string;
  urduLabel: string;
  englishDescription: string;
  urduDescription: string;
  englishStarter: string;
  urduStarter: string;
}

export const APP_SETTINGS_STORAGE_KEY = "willing-ways-ai:settings";
export const CHAT_SESSIONS_STORAGE_KEY = "willing-ways-ai:sessions";
export const ACTIVE_CHAT_STORAGE_KEY = "willing-ways-ai:active-chat";
export const REALTIME_VOICE_STORAGE_KEY = "willing-ways-ai:realtime-voice";
export const REALTIME_VOICE_VERSION_STORAGE_KEY = "willing-ways-ai:realtime-voice-version";
export const CURRENT_REALTIME_VOICE_VERSION = "4";
export const DEFAULT_CHAT_MODEL_ID: ModelId = "gpt-4o-mini";
export const DEFAULT_REALTIME_VOICE_ID: RealtimeVoiceId = "marin";
export const DEFAULT_VOICE_CALL_FOCUS_ID: VoiceCallFocusId = "general-support";
export const MAX_PERSISTED_VOICE_TURNS = 24;

export const REALTIME_VOICE_OPTIONS: Array<{ id: RealtimeVoiceId; label: string }> = [
  { id: "marin", label: "Marin" },
  { id: "cedar", label: "Cedar" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
  { id: "ballad", label: "Ballad" },
  { id: "coral", label: "Coral" },
  { id: "echo", label: "Echo" },
  { id: "sage", label: "Sage" },
  { id: "shimmer", label: "Shimmer" },
  { id: "verse", label: "Verse" },
];

export const VOICE_CALL_FOCUS_OPTIONS: VoiceCallFocusOption[] = [
  {
    id: "general-support",
    englishLabel: "Find treatment support",
    urduLabel: "علاج کے لئے رہنمائی",
    englishTag: "Find what to do next",
    urduTag: "اگلا قدم معلوم کریں",
    englishDescription: "Explore how to reach Willing Ways, compare rehab or outpatient options, and know the safest next step.",
    urduDescription: "ولنگ ویز سے رابطہ، ریحاب یا آؤٹ پیشنٹ کے اختیارات اور محفوظ اگلے قدم جانیں۔",
    englishStarter: "Help me decide what Willing Ways path makes sense for my story.",
    urduStarter: "مجھے بتائیں کہ میری صورتحال میں کون سا ولنگ ویز راستہ مناسب ہے۔",
  },
  {
    id: "guided-intake",
    englishLabel: "Book a call or callback",
    urduLabel: "کال یا callback طے کریں",
    englishTag: "Clarify the situation",
    urduTag: "صورتحال واضح کریں",
    englishDescription: "Share the full story so the team can respond with the right branch, therapy lane, or counselor.",
    urduDescription: "پورا قصہ بتائیں تاکہ ٹیم درست برانچ، تھیراپی یا counselor کے ساتھ رابطہ کرے۔",
    englishStarter: "Let me explain everything so the team can follow up with a clear plan.",
    urduStarter: "میں پوری بات سمجھاؤں تاکہ ٹیم واضح پلان کے ساتھ follow up کرے۔",
  },
  {
    id: "family-coach",
    englishLabel: "Rehearse family recovery",
    urduLabel: "فیملی recovery کی مشق",
    englishTag: "Family systems work",
    urduTag: "خاندانی نظام کی مشق",
    englishDescription: "Calm coaching for boundaries, denial, enabling, and intervention readiness before the confrontation.",
    urduDescription: "حدود، انکار، enabling اور intervention کی تیاری کے لئے پرسکون coaching۔",
    englishStarter: "Coach us through one calm conversation and the boundary we need to keep.",
    urduStarter: "ایک پرسکون گفتگو اور boundary کی مشق کروائیں جو ہم برقرار رکھ سکیں۔",
  },
  {
    id: "crisis-triage",
    englishLabel: "Stabilize urgent events",
    urduLabel: "فوری بحران سنبھالیں",
    englishTag: "Safety starts here",
    urduTag: "حفاظت یہاں شروع",
    englishDescription: "Move quickly through safety questions, advise immediate steps, and escalate if needed.",
    urduDescription: "فوری حفاظتی سوالات، ضروری قدم اور ضروری ہو تو escalation.",
    englishStarter: "Something urgent just happened. Tell me what feels unsafe right now.",
    urduStarter: "ابھی کوئی فوری واقعہ ہوا۔ بتائیں اب کیا غیر محفوظ لگ رہا ہے۔",
  },
  {
    id: "founder-method",
    englishLabel: "Ask the founder’s method",
    urduLabel: "بانی کا طریقہ پوچھیں",
    englishTag: "Program-level insight",
    urduTag: "پروگرام لیول معلومات",
    englishDescription: "Ground advice in Dr. Sadaqat Ali’s books, family-system philosophy, and legacy programs.",
    urduDescription: "ڈاکٹر صداقت علی کی کتابوں، family-system فلسفے اور پروگرام سے رہنمائی۔",
    englishStarter: "Explain Dr. Sadaqat Ali's thinking on shame, relapse, or family recovery.",
    urduStarter: "ڈاکٹر صداقت علی کے shame، relapse یا family recovery خیالات بتائیں۔",
  },
  {
    id: "private-intake",
    englishLabel: "Share anonymously",
    urduLabel: "خفیہ طریقے سے بتائیں",
    englishTag: "Privacy first",
    urduTag: "پرائیویسی پہلے",
    englishDescription: "Tell the story without names or identifying details until you are ready.",
    urduDescription: "نام یا شناخت بتائے بغیر بات کریں جب تک آپ تیار نہ ہوں۔",
    englishStarter: "I want to talk without saying names right now.",
    urduStarter: "میں ابھی نام بتائے بغیر بات کرنا چاہتا ہوں۔",
  },
];

export const TEXT_CHAT_AUDIENCE_OPTIONS: TextChatAudienceOption[] = [
  {
    id: "patient",
    englishLabel: "Patient check-in",
    urduLabel: "مریض کی رہنمائی",
    englishDescription: "For cravings, relapse fear, mood instability, and one calm next step.",
    urduDescription: "cravings، relapse کے خوف، mood instability اور ایک پرسکون اگلے قدم کے لئے۔",
    englishStarter: "I need one calm step for myself right now.",
    urduStarter: "مجھے ابھی اپنے لئے ایک پرسکون اگلا قدم چاہیے۔",
  },
  {
    id: "family",
    englishLabel: "Family support",
    urduLabel: "خاندانی سپورٹ",
    englishDescription: "For boundaries, denial, intervention readiness, and post-rehab follow-through.",
    urduDescription: "حدود، denial، intervention کی تیاری اور post-rehab follow-through کے لئے۔",
    englishStarter: "Help me support my loved one without making things worse.",
    urduStarter: "مجھے اپنے پیارے کی مدد کرنے کا بہتر طریقہ بتائیں۔",
  },
  {
    id: "staff",
    englishLabel: "Staff learning",
    urduLabel: "اسٹاف لرننگ",
    englishDescription: "For counselors, referrers, and care teams reviewing Dr. Sadaqat’s approach.",
    urduDescription: "counselors، referrers اور care teams کے لئے جو ڈاکٹر صداقت کے approach کو دیکھنا چاہتے ہیں۔",
    englishStarter: "Teach me the Willing Ways approach in a clinically useful way.",
    urduStarter: "مجھے ولنگ ویز approach کو clinically useful انداز میں سمجھائیں۔",
  },
  {
    id: "classroom",
    englishLabel: "Classroom mode",
    urduLabel: "کلاس روم موڈ",
    englishDescription: "For projector-led sessions, rehab classes, and daily psychoeducation.",
    urduDescription: "projector-led sessions، rehab classes اور روزمرہ psychoeducation کے لئے۔",
    englishStarter: "Explain this clearly for a classroom or group learning session.",
    urduStarter: "اسے کلاس روم یا group learning session کے لئے واضح انداز میں سمجھائیں۔",
  },
];

export function normalizeRealtimeVoiceId(
  value: string | null | undefined,
): RealtimeVoiceId {
  if (value === "marine") {
    return "marin";
  }

  if (value && REALTIME_VOICE_OPTIONS.some((voice) => voice.id === value)) {
    return value as RealtimeVoiceId;
  }

  return DEFAULT_REALTIME_VOICE_ID;
}

export function normalizeVoiceCallFocusId(
  value: string | null | undefined,
): VoiceCallFocusId {
  if (value && VOICE_CALL_FOCUS_OPTIONS.some((focus) => focus.id === value)) {
    return value as VoiceCallFocusId;
  }

  return DEFAULT_VOICE_CALL_FOCUS_ID;
}

export const SUGGESTION_CHIPS: Record<ChatLanguage, string[]> = {
  english: [
    "I am having cravings right now and need a safe next step",
    "I used again and I feel ashamed—please help me course correct",
    "Help me set a boundary without another fight tonight",
    "What are the warning signs I might relapse soon?",
    "I want Willing Ways or the family to follow up with my patient",
    "I want to stay unnamed for now but still get guidance",
  ],
  urdu: [
    "مجھے ابھی craving ہو رہی ہے اور ایک محفوظ اگلا قدم چاہیے",
    "میں نے دوبارہ use کیا، اب شرمندگی محسوس ہو رہی ہے، مدد کریں",
    "ایک حد مقرر کرنے میں مدد کریں تاکہ ایک اور لڑائی نہ ہو",
    "میں relapse کی warning signs کے بارے میں کیا دیکھوں؟",
    "ہماری فیملی سے follow-up کیجیے گا",
    "میں ابھی نام نہیں بتانا چاہتا، پھر بھی رہنمائی چاہیے",
  ],
};

export const QUICK_LINKS = [
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export const SERVICE_HIGHLIGHTS = [
  {
    english: "Rehabilitation services with medically supervised detox and residential treatment",
    urdu: "میڈیکلی سپروائزڈ detox اور رہائشی علاج کے ساتھ rehabilitation services",
  },
  {
    english: "Psychiatric evaluations, medication management, and crisis intervention",
    urdu: "psychiatric evaluations، medication management اور crisis intervention",
  },
  {
    english: "Core, supportive, personal development, situational, and follow-up counseling",
    urdu: "core، supportive، personal development، situational اور follow-up counseling",
  },
  {
    english: "Family intervention, relapse prevention, and long-term continuing care",
    urdu: "family intervention، relapse prevention اور long-term continuing care",
  },
];

export const PRIMARY_CONTACTS = [
  { label: "General helpline / PR Director", value: "0300-7413639" },
  { label: "Email", value: "info@willingways.org" },
  { label: "Website", value: "www.willingways.org" },
];

export const BRANCH_CONTACTS = [
  {
    name: "Lahore (Main Branch)",
    address: "71-A Jail Road, Near Apwa College, Lahore",
    phones: ["+92 300 7413639", "+92 322 7413639", "+92 (0) 42 35408416-19-21"],
    email: "Lahore@willingways.org",
  },
  {
    name: "Karachi - Clifton",
    address: "C-159, Block-2, Clifton, Karachi",
    phones: ["+92 300 7413639"],
    email: "Karachi@willingways.org",
  },
  {
    name: "Karachi - Nazimabad",
    address: "1-A-1/29, Block 1, Nazimabad, Karachi",
    phones: ["+92 314 6865271"],
  },
  {
    name: "Islamabad",
    address: "Willing Ways Building, Traders Colony, 17 Mile Murree Road, Islamabad",
    phones: ["+92 300 7413639", "+92 (0) 51 2871666", "+92 (0) 51 2602886"],
    email: "Islamabad@willingways.org",
  },
];

export function createChatSession(
  mode: ChatMode = "adaptive",
  language: ChatLanguage = "english",
): ChatSession {
  const now = new Date().toISOString();

  return {
    id: createSafeId("session"),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    welcomed: false,
    mode,
    language,
    messages: [],
    preferredName: "",
    textAudience: "patient",
    voiceTranscript: [],
    programStage: "intro",
  };
}

function normalizeStoredMessageParts(
  rawParts: unknown,
  rawContent: unknown,
  rawText: unknown,
): UIMessage["parts"] {
  const normalizedParts: UIMessage["parts"] = [];

  if (Array.isArray(rawParts)) {
    for (const part of rawParts) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const candidate = part as {
        output?: { preferredName?: unknown };
        state?: unknown;
        text?: unknown;
        toolCallId?: unknown;
        type?: unknown;
      };

      if (candidate.type === "text" && typeof candidate.text === "string" && candidate.text.trim()) {
        normalizedParts.push({
          type: "text",
          text: candidate.text,
          state: "done",
        });
        continue;
      }

      if (
        candidate.type === "tool-remember_preferred_name" &&
        candidate.state === "output-available" &&
        typeof candidate.output?.preferredName === "string" &&
        candidate.output.preferredName.trim()
      ) {
        normalizedParts.push({
          type: "tool-remember_preferred_name",
          toolCallId:
            typeof candidate.toolCallId === "string" && candidate.toolCallId
              ? candidate.toolCallId
              : createSafeId("tool"),
          state: "output-available",
          input: {},
          output: {
            preferredName: candidate.output.preferredName.trim(),
          },
        });
      }
    }
  }

  if (normalizedParts.length > 0) {
    return normalizedParts;
  }

  const fallbackText =
    typeof rawText === "string" && rawText.trim()
      ? rawText.trim()
      : typeof rawContent === "string" && rawContent.trim()
        ? rawContent.trim()
        : "";

  if (!fallbackText) {
    return [];
  }

  return [
    {
      type: "text",
      text: fallbackText,
      state: "done",
    },
  ];
}

function normalizeStoredMessages(rawMessages: unknown): UIMessage[] {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  return rawMessages.flatMap((message) => {
    if (!message || typeof message !== "object") {
      return [];
    }

    const candidate = message as {
      content?: unknown;
      id?: unknown;
      parts?: unknown;
      role?: unknown;
      text?: unknown;
    };
    const role = candidate.role === "assistant" ? "assistant" : candidate.role === "user" ? "user" : null;

    if (!role) {
      return [];
    }

    const parts = normalizeStoredMessageParts(candidate.parts, candidate.content, candidate.text);

    if (parts.length === 0) {
      return [];
    }

    return [
      {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : createSafeId("message"),
        role,
        parts,
      } as UIMessage,
    ];
  });
}

export function normalizeChatSessions(rawSessions: ChatSession[]): ChatSession[] {
  return rawSessions.slice(0, 50).map((session) => ({
    ...session,
    welcomed: session.welcomed ?? false,
    language: session.language ?? "english",
    mode:
      session.mode === "patient" || session.mode === "doctor" || session.mode === "adaptive"
        ? session.mode
        : "adaptive",
    messages: normalizeStoredMessages((session as { messages?: unknown }).messages),
    preferredName: session.preferredName ?? "",
    textAudience:
      session.textAudience === "patient" ||
      session.textAudience === "family" ||
      session.textAudience === "staff" ||
      session.textAudience === "classroom"
        ? session.textAudience
        : "patient",
    programId:
      session.programId === "find-treatment" ||
      session.programId === "family-recovery" ||
      session.programId === "stay-on-track" ||
      session.programId === "urgent-safety"
        ? session.programId
        : undefined,
    programStage:
      session.programStage === "conversation" ||
      session.programStage === "review" ||
      session.programStage === "handoff" ||
      session.programStage === "intro"
        ? session.programStage
        : "intro",
    programAudience:
      session.programAudience === "self" ||
      session.programAudience === "family" ||
      session.programAudience === "doctor"
        ? session.programAudience
        : undefined,
    title: session.title || "New conversation",
    voiceTranscript: Array.isArray(session.voiceTranscript)
      ? session.voiceTranscript
          .map((entry) => ({
            id:
              typeof entry?.id === "string" && entry.id
                ? entry.id
                : createSafeId("voice"),
            role: (entry?.role === "assistant" ? "assistant" : "user") as
              | "assistant"
              | "user",
            text: typeof entry?.text === "string" ? entry.text : "",
          }))
          .filter((entry) => entry.text.trim())
      : [],
  }));
}

export function getMessageText(message: Pick<UIMessage, "parts">): string {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

export function deriveChatTitle(messages: UIMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return "New conversation";
  }

  const text = getMessageText(firstUserMessage);

  if (!text) {
    return "New conversation";
  }

  return text.length > 42 ? `${text.slice(0, 42).trimEnd()}...` : text;
}

export function deriveVoiceTitle(
  transcript: VoiceTranscriptEntry[],
  preferredName?: string,
) {
  const firstCallerEntry = transcript.find(
    (entry) => entry.role === "user" && entry.text.trim(),
  );

  if (firstCallerEntry) {
    const text = firstCallerEntry.text.trim();
    return text.length > 42 ? `${text.slice(0, 42).trimEnd()}...` : text;
  }

  if (preferredName?.trim()) {
    return `Call with ${preferredName.trim()}`;
  }

  return "New conversation";
}

export function deriveSessionTitle({
  messages,
  preferredName,
  voiceTranscript,
}: Pick<ChatSession, "messages" | "preferredName" | "voiceTranscript">) {
  if (messages.length > 0) {
    return deriveChatTitle(messages);
  }

  return deriveVoiceTitle(voiceTranscript, preferredName);
}

export function extractPreferredNameFromMessages(messages: UIMessage[]) {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex]?.parts ?? [];

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex] as {
        output?: { preferredName?: unknown };
        state?: unknown;
        type?: unknown;
      };

      if (
        part.type === "tool-remember_preferred_name" &&
        part.state === "output-available" &&
        typeof part.output?.preferredName === "string"
      ) {
        const preferredName = part.output.preferredName.trim();

        if (preferredName) {
          return preferredName;
        }
      }
    }
  }

  return "";
}

export function buildVoiceResumeContext(transcript: VoiceTranscriptEntry[]) {
  const callerTurns = transcript
    .filter((entry) => entry.role === "user" && entry.text.trim())
    .slice(-3)
    .map((entry) => entry.text.trim());
  const lastAssistantTurn = [...transcript]
    .reverse()
    .find((entry) => entry.role === "assistant" && entry.text.trim())
    ?.text.trim();

  if (callerTurns.length === 0 && !lastAssistantTurn) {
    return "";
  }

  const callerJoined = callerTurns.join(" ").toLowerCase();
  const callerRole = /mother|father|wife|husband|brother|sister|family|امی|ابو|بھائی|بہن|فیملی/.test(
    callerJoined,
  )
    ? "Family member"
    : /doctor|referrer|psychiatrist|consultant|ڈاکٹر/.test(callerJoined)
      ? "Doctor or referrer"
      : "Patient or caller";
  const latestRisk = callerTurns.at(-1) ?? callerTurns.join(" ");
  const latestStep = lastAssistantTurn ?? "A next step was being worked out.";

  return [
    `Who is speaking: ${callerRole}.`,
    `What feels most risky: ${latestRisk}`.slice(0, 320),
    `Last agreed step: ${latestStep}`.slice(0, 360),
  ]
    .join(" ")
    .slice(0, 900);
}

export function formatSessionTimestamp(isoString: string): string {
  const date = new Date(isoString);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function modeLabel(mode: ChatMode): string {
  if (mode === "doctor") {
    return "Doctor / Clinical";
  }

  if (mode === "patient") {
    return "Patient / Family";
  }

  return "Adaptive support";
}

export function languageLabel(language: ChatLanguage): string {
  return language === "urdu" ? "اردو" : "English";
}

export function voiceCallFocusLabel(focusId: VoiceCallFocusId, language: ChatLanguage) {
  const focus = VOICE_CALL_FOCUS_OPTIONS.find((option) => option.id === focusId);

  if (!focus) {
    return language === "urdu" ? "عمومی رہنمائی" : "General support";
  }

  return language === "urdu" ? focus.urduLabel : focus.englishLabel;
}

export function voiceCallActionLabel(focusId: VoiceCallFocusId, language: ChatLanguage) {
  if (language === "urdu") {
    if (focusId === "guided-intake") {
      return "ٹیم callback کے لئے کال شروع کریں";
    }
    if (focusId === "family-coach") {
      return "فیملی سپورٹ practice شروع کریں";
    }
    if (focusId === "crisis-triage") {
      return "فوری حفاظتی کال شروع کریں";
    }
    if (focusId === "founder-method") {
      return "بانی کی رہنمائی سنیں";
    }
    if (focusId === "private-intake") {
      return "خفیہ کال شروع کریں";
    }
    return "ولنگ ویز اے آئی کو کال کریں";
  }

  if (focusId === "guided-intake") {
    return "Start a callback request";
  }
  if (focusId === "family-coach") {
    return "Start family support practice";
  }
  if (focusId === "crisis-triage") {
    return "Start an urgent support call";
  }
  if (focusId === "founder-method") {
    return "Hear the founder’s guidance";
  }
  if (focusId === "private-intake") {
    return "Start a private call";
  }
  return "Talk to Willing Ways AI";
}

export function getSuggestionChips(language: ChatLanguage) {
  return SUGGESTION_CHIPS[language];
}

export function getTextChatAudienceOption(audience: TextChatAudience) {
  return TEXT_CHAT_AUDIENCE_OPTIONS.find((option) => option.id === audience) ?? TEXT_CHAT_AUDIENCE_OPTIONS[0];
}

export function isUrduText(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}

const PUNJABI_CUE_PATTERNS = [
  /\btusi\b/i,
  /\bassi\b/i,
  /\bsaadi\b/i,
  /\bsada\b/i,
  /\bkiven\b/i,
  /\blainda\b/i,
  /\bkarda\b/i,
  /\bve\b/i,
  /\bae\b/i,
  /تسی/u,
  /اسی/u,
  /ساڈی/u,
  /ساڈا/u,
  /کیویں/u,
];

const CRISIS_CUE_PATTERNS = [
  /\bsuicide\b/i,
  /\bself[- ]?harm\b/i,
  /\bkill myself\b/i,
  /\boverdose\b/i,
  /\bviolent\b/i,
  /\bviolence\b/i,
  /\bharm myself\b/i,
  /\bkhud ?kushi\b/i,
  /\bmar jana\b/i,
  /\bmar ja[uo]n\b/i,
  /\bmaar d[ou]n\b/i,
  /\bjaan se maar\b/i,
  /خودکشی/u,
  /اپنے آپ کو نقصان/u,
  /اوورڈوز/u,
  /تشدد/u,
  /مار دوں/u,
];

const DISTRESS_CUE_PATTERNS = [
  /\bscared\b/i,
  /\bafraid\b/i,
  /\bhopeless\b/i,
  /\bhelpless\b/i,
  /\bpanic\b/i,
  /\bdepressed\b/i,
  /\bashamed\b/i,
  /\bshame\b/i,
  /\bguilty\b/i,
  /\bbechain\b/i,
  /\bghabrahat\b/i,
  /\bdarr\b/i,
  /\bmayoos\b/i,
  /\bpareshan\b/i,
  /\bsharm\b/i,
  /گھبراہٹ/u,
  /ڈر/u,
  /مایوس/u,
  /پریشان/u,
  /شرمند/u,
];

const RELAPSE_CUE_PATTERNS = [
  /\brelapse\b/i,
  /\bstarted again\b/i,
  /\busing again\b/i,
  /\bwithdrawal\b/i,
  /\bnasha\b/i,
  /\bslip\b/i,
  /\bdobara\b/i,
  /دوبارہ/u,
  /پھر سے/u,
  /نشہ/u,
  /withdrawal/i,
];

const FAMILY_CUE_PATTERNS = [
  /\bfamily\b/i,
  /\bbrother\b/i,
  /\bsister\b/i,
  /\bmother\b/i,
  /\bfather\b/i,
  /\bwife\b/i,
  /\bhusband\b/i,
  /\bson\b/i,
  /\bdaughter\b/i,
  /\bghar\b/i,
  /امی/u,
  /ابو/u,
  /بھائی/u,
  /بہن/u,
  /والد/u,
  /والدہ/u,
  /خاندان/u,
  /گھر/u,
];

const PRIVACY_CUE_PATTERNS = [
  /\bprivate\b/i,
  /\bconfidential\b/i,
  /\bsecret\b/i,
  /\bhigh[- ]?profile\b/i,
  /\bdon't use names\b/i,
  /\bjudge\b/i,
  /\bizzat\b/i,
  /\bbadnami\b/i,
  /\bnaam mat\b/i,
  /خفیہ/u,
  /راز/u,
  /نام نہ/u,
  /عزت/u,
  /بدنامی/u,
];

function countPatternMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function detectVoiceLanguage(text: string): VoiceCareSignal["detectedLanguage"] {
  const hasUrduScript = isUrduText(text);
  const hasPunjabiCue = PUNJABI_CUE_PATTERNS.some((pattern) => pattern.test(text));
  const hasEnglishLetters = /[a-z]/i.test(text);

  if ((hasUrduScript && hasEnglishLetters) || (hasPunjabiCue && hasEnglishLetters && hasUrduScript)) {
    return hasPunjabiCue ? "punjabi" : "mixed";
  }

  if (hasPunjabiCue) {
    return "punjabi";
  }

  if (hasUrduScript) {
    return "urdu";
  }

  return "english";
}

export function analyzeVoiceCareSignals(transcriptTexts: string[]): VoiceCareSignal | null {
  const combined = transcriptTexts
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(" \n ")
    .trim();

  if (!combined) {
    return null;
  }

  const crisisHits = countPatternMatches(combined, CRISIS_CUE_PATTERNS);
  const distressHits = countPatternMatches(combined, DISTRESS_CUE_PATTERNS);
  const relapseHits = countPatternMatches(combined, RELAPSE_CUE_PATTERNS);
  const familyHits = countPatternMatches(combined, FAMILY_CUE_PATTERNS);
  const privacyHits = countPatternMatches(combined, PRIVACY_CUE_PATTERNS);

  const categories: VoiceCareSignal["categories"] = [];

  if (crisisHits > 0) {
    categories.push("crisis");
  }
  if (distressHits > 0) {
    categories.push("distress");
  }
  if (familyHits > 0) {
    categories.push("family");
  }
  if (privacyHits > 0) {
    categories.push("privacy");
  }
  if (relapseHits > 0) {
    categories.push("relapse");
  }

  const severity =
    crisisHits > 0 || (distressHits >= 2 && relapseHits > 0)
      ? "urgent"
      : distressHits > 0 || relapseHits > 0 || privacyHits > 0
        ? "watch"
        : "normal";

  const emotionalLoad =
    severity === "urgent"
      ? "acute"
      : distressHits > 0 || privacyHits > 0
        ? "distressed"
        : "steady";

  const matchedCues = [
    ...(crisisHits > 0 ? ["crisis"] : []),
    ...(distressHits > 0 ? ["distress"] : []),
    ...(relapseHits > 0 ? ["relapse"] : []),
    ...(familyHits > 0 ? ["family"] : []),
    ...(privacyHits > 0 ? ["privacy"] : []),
  ];

  return {
    detectedLanguage: detectVoiceLanguage(combined),
    severity,
    emotionalLoad,
    categories,
    matchedCues,
  };
}
