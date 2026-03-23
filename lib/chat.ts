import type { UIMessage } from "ai";

export type ChatMode = "adaptive" | "patient" | "doctor";
export type ChatLanguage = "english" | "urdu";
export type ModelId = "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo";
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
  voiceTranscript: VoiceTranscriptEntry[];
}

export interface RuntimeStatus {
  bookingConfigured?: boolean;
  realtimeConfigured: boolean;
  serverKeyConfigured: boolean;
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

export const APP_SETTINGS_STORAGE_KEY = "willing-ways-ai:settings";
export const CHAT_SESSIONS_STORAGE_KEY = "willing-ways-ai:sessions";
export const ACTIVE_CHAT_STORAGE_KEY = "willing-ways-ai:active-chat";
export const REALTIME_VOICE_STORAGE_KEY = "willing-ways-ai:realtime-voice";
export const REALTIME_VOICE_VERSION_STORAGE_KEY = "willing-ways-ai:realtime-voice-version";
export const CURRENT_REALTIME_VOICE_VERSION = "3";
export const DEFAULT_CHAT_MODEL_ID: ModelId = "gpt-4o-mini";
export const DEFAULT_REALTIME_VOICE_ID: RealtimeVoiceId = "cedar";
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
    englishLabel: "General support",
    urduLabel: "عمومی رہنمائی",
    englishTag: "Best first step",
    urduTag: "پہلا بہترین قدم",
    englishDescription: "Admissions, treatment questions, branch guidance, and calm first-step support.",
    urduDescription: "داخلے، علاج، برانچ رہنمائی اور پرسکون ابتدائی مدد۔",
    englishStarter: "I need help understanding the next step for my family.",
    urduStarter: "مجھے اپنے خاندان کے لئے اگلا قدم سمجھنے میں مدد چاہیے۔",
  },
  {
    id: "guided-intake",
    englishLabel: "AI intake handoff",
    urduLabel: "اے آئی intake handoff",
    englishTag: "For booking",
    urduTag: "رابطے کے لئے",
    englishDescription: "Tell your story, answer guided intake questions, and prepare a clean handoff for the Willing Ways team.",
    urduDescription: "اپنی کہانی سنائیں، guided intake سوالات کے جواب دیں، اور ولنگ ویز ٹیم کے لئے صاف handoff تیار کریں۔",
    englishStarter: "I want to explain our full situation so the Willing Ways team can follow up properly.",
    urduStarter: "میں اپنی پوری صورتحال سمجھانا چاہتا ہوں تاکہ ولنگ ویز ٹیم درست follow-up کر سکے۔",
  },
  {
    id: "family-coach",
    englishLabel: "Family coach",
    urduLabel: "فیملی کوچ",
    englishTag: "For families",
    urduTag: "خاندان کے لئے",
    englishDescription: "Practice difficult conversations and intervention language before speaking to your loved one.",
    urduDescription: "اپنے عزیز سے بات کرنے سے پہلے مشکل گفتگو اور intervention language کی مشق کریں۔",
    englishStarter: "Help me rehearse what to say to my addicted brother without triggering a fight.",
    urduStarter: "میرے addicted بھائی سے بغیر لڑائی کے کیا کہنا ہے، اس کی rehearsal کروائیں۔",
  },
  {
    id: "crisis-triage",
    englishLabel: "Crisis triage",
    urduLabel: "بحرانی رہنمائی",
    englishTag: "Urgent support",
    urduTag: "فوری مدد",
    englishDescription: "Fast safety-first guidance for overdose, violent relapse, self-harm, or urgent psychiatric distress.",
    urduDescription: "اوورڈوز، violent relapse، self-harm یا فوری psychiatric distress کے لئے فوری حفاظتی رہنمائی۔",
    englishStarter: "This feels urgent. Help me decide what we should do right now.",
    urduStarter: "یہ معاملہ فوری لگ رہا ہے، ابھی ہمیں کیا کرنا چاہیے؟",
  },
  {
    id: "founder-method",
    englishLabel: "Dr. Sadaqat method",
    urduLabel: "ڈاکٹر صداقت کا طریقہ",
    englishTag: "Founder guidance",
    urduTag: "بانی کی رہنمائی",
    englishDescription: "Ask for founder-led guidance grounded in Willing Ways teachings, books, videos, and family-system philosophy.",
    urduDescription: "ولنگ ویز کی تعلیمات، کتابوں، ویڈیوز اور family-system philosophy پر مبنی founder-led guidance حاصل کریں۔",
    englishStarter: "What is Dr. Sadaqat Ali's approach to shame, denial, and family recovery?",
    urduStarter: "ڈاکٹر صداقت علی shame، denial اور family recovery کو کیسے دیکھتے ہیں؟",
  },
  {
    id: "private-intake",
    englishLabel: "Private intake",
    urduLabel: "پرائیویٹ intake",
    englishTag: "Private start",
    urduTag: "خفیہ آغاز",
    englishDescription: "Share a confidential situation without names first, then decide on the safest next step.",
    urduDescription: "پہلے نام بتائے بغیر خفیہ صورتحال شیئر کریں، پھر محفوظ اگلا قدم طے کریں۔",
    englishStarter: "I want to explain the situation without sharing names yet.",
    urduStarter: "میں ابھی نام بتائے بغیر صورتحال سمجھانا چاہتا ہوں۔",
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
    "Our family keeps fighting after rehab and I need a calm plan",
    "What warning signs should we watch for after discharge?",
    "I want Willing Ways to follow up with our family",
  ],
  urdu: [
    "مجھے ابھی craving ہو رہی ہے اور محفوظ اگلا قدم چاہیے",
    "rehab کے بعد گھر میں بار بار لڑائی ہو رہی ہے، مجھے پرسکون منصوبہ چاہیے",
    "discharge کے بعد relapse کی کون سی warning signs دیکھنی چاہئیں؟",
    "میں چاہتا ہوں ولنگ ویز ہماری فیملی سے follow-up کرے",
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
    id: crypto.randomUUID(),
    title: "New conversation",
    createdAt: now,
    updatedAt: now,
    welcomed: false,
    mode,
    language,
    messages: [],
    preferredName: "",
    voiceTranscript: [],
  };
}

export function normalizeChatSessions(rawSessions: ChatSession[]): ChatSession[] {
  return rawSessions.slice(0, 50).map((session) => ({
    ...session,
    welcomed: session.welcomed ?? false,
    language: session.language ?? "english",
    mode: "adaptive",
    preferredName: session.preferredName ?? "",
    title: session.title || "New conversation",
    voiceTranscript: Array.isArray(session.voiceTranscript)
      ? session.voiceTranscript
          .map((entry) => ({
            id:
              typeof entry?.id === "string" && entry.id
                ? entry.id
                : crypto.randomUUID(),
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
  return transcript
    .slice(-6)
    .map((entry) => `${entry.role === "user" ? "Caller" : "AI"}: ${entry.text.trim()}`)
    .filter(Boolean)
    .join(" | ")
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
      return "اے آئی intake کال شروع کریں";
    }
    if (focusId === "family-coach") {
      return "فیملی کوچنگ کال شروع کریں";
    }
    if (focusId === "crisis-triage") {
      return "فوری رہنمائی کال شروع کریں";
    }
    if (focusId === "founder-method") {
      return "بانی کی رہنمائی والی کال شروع کریں";
    }
    if (focusId === "private-intake") {
      return "پرائیویٹ intake کال شروع کریں";
    }
    return "ولنگ ویز اے آئی کو کال کریں";
  }

  if (focusId === "guided-intake") {
    return "Start AI intake call";
  }
  if (focusId === "family-coach") {
    return "Start family coaching call";
  }
  if (focusId === "crisis-triage") {
    return "Start urgent guidance call";
  }
  if (focusId === "founder-method") {
    return "Start founder guidance call";
  }
  if (focusId === "private-intake") {
    return "Start private intake call";
  }
  return "Call Willing Ways AI now";
}

export function getSuggestionChips(language: ChatLanguage) {
  return SUGGESTION_CHIPS[language];
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
