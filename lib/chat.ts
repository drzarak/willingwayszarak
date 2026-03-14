import type { UIMessage } from "ai";

export type ChatMode = "patient" | "doctor";
export type ChatLanguage = "english" | "urdu";
export type ModelId = "gpt-4o-mini" | "gpt-4o" | "gpt-4-turbo";
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

export interface AppSettings {
  apiKey: string;
  modelId: ModelId;
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
}

export interface RuntimeStatus {
  realtimeConfigured: boolean;
  serverKeyConfigured: boolean;
}

export const APP_SETTINGS_STORAGE_KEY = "willing-ways-ai:settings";
export const CHAT_SESSIONS_STORAGE_KEY = "willing-ways-ai:sessions";
export const ACTIVE_CHAT_STORAGE_KEY = "willing-ways-ai:active-chat";
export const REALTIME_VOICE_STORAGE_KEY = "willing-ways-ai:realtime-voice";
export const DEFAULT_REALTIME_VOICE_ID: RealtimeVoiceId = "cedar";

export const MODEL_OPTIONS: Array<{ id: ModelId; label: string }> = [
  { id: "gpt-4o-mini", label: "gpt-4o-mini" },
  { id: "gpt-4o", label: "gpt-4o" },
  { id: "gpt-4-turbo", label: "gpt-4-turbo" },
];

export const REALTIME_VOICE_OPTIONS: Array<{ id: RealtimeVoiceId; label: string }> = [
  { id: "cedar", label: "Cedar" },
  { id: "marin", label: "Marin (Marine)" },
  { id: "alloy", label: "Alloy" },
  { id: "ash", label: "Ash" },
  { id: "ballad", label: "Ballad" },
  { id: "coral", label: "Coral" },
  { id: "echo", label: "Echo" },
  { id: "sage", label: "Sage" },
  { id: "shimmer", label: "Shimmer" },
  { id: "verse", label: "Verse" },
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

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  modelId: "gpt-4o-mini",
};

export const SUGGESTION_CHIPS: Record<ChatLanguage, string[]> = {
  english: [
    "How do I support my loved one?",
    "Tell me about your rehab programs",
    "I'm a doctor — what are your detox protocols?",
    "How can I book a consultation?",
  ],
  urdu: [
    "میں اپنے عزیز کی نشے کی بیماری میں کیسے مدد کروں؟",
    "اپنے ریحاب پروگرامز کے بارے میں بتائیں",
    "میں ڈاکٹر ہوں، آپ کے detox protocols کیا ہیں؟",
    "میں consultation کیسے بک کروں؟",
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

export function createChatSession(mode: ChatMode, language: ChatLanguage = "english"): ChatSession {
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
  };
}

export function normalizeChatSessions(rawSessions: ChatSession[]): ChatSession[] {
  return rawSessions.slice(0, 50).map((session) => ({
    ...session,
    welcomed: session.welcomed ?? false,
    language: session.language ?? "english",
    title: session.title || "New conversation",
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

export function formatSessionTimestamp(isoString: string): string {
  const date = new Date(isoString);

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function modeLabel(mode: ChatMode): string {
  return mode === "doctor" ? "Doctor / Clinical" : "Patient / Family";
}

export function languageLabel(language: ChatLanguage): string {
  return language === "urdu" ? "اردو" : "English";
}

export function getSuggestionChips(language: ChatLanguage) {
  return SUGGESTION_CHIPS[language];
}

export function isUrduText(value: string) {
  return /[\u0600-\u06FF]/.test(value);
}
