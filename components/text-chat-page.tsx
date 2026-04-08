"use client";

import Image from "next/image";
import Link from "next/link";
import type { UIMessage } from "ai";
import {
  AlertTriangle,
  Check,
  LoaderCircle,
  MessageSquareText,
  PhoneCall,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  APP_SETTINGS_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_CHAT_MODEL_ID,
  TEXT_CHAT_AUDIENCE_OPTIONS,
  buildVoiceResumeContext,
  createChatSession,
  extractPreferredNameFromMessages,
  getTextChatAudienceOption,
  isUrduText,
  normalizeChatSessions,
  type ChatLanguage,
  type ChatSession,
  type RuntimeStatus,
  type TextChatAudience,
} from "@/lib/chat";
import {
  DEFAULT_LOCAL_PRIVACY_PREFERENCES,
  LOCAL_PRIVACY_STORAGE_KEY,
  normalizeLocalPrivacyPreferences,
} from "@/lib/privacy";
import {
  DR_ZARAK_NAME,
  WILLING_WAYS_HELPLINE_DISPLAY,
  WILLING_WAYS_HELPLINE_HREF,
} from "@/lib/site-contact";
import { SITE_MEDIA } from "@/lib/site-assets";
import { cn, createSafeId, safeStorageGet, safeStorageRemove, safeStorageSet } from "@/lib/utils";

import { LanguageToggle } from "@/components/language-toggle";
import { MessageBubble } from "@/components/message-bubble";
import { PrivacyDeviceToggle } from "@/components/privacy-device-toggle";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatResponseBody {
  message?: UIMessage;
  preferredName?: string;
}

const EMPTY_MESSAGES: UIMessage[] = [];
const CLASSROOM_DISPLAY_STORAGE_KEY = "willing-ways-ai:classroom-display";
const TEXT_BOOTSTRAP_SESSION_ID = "bootstrap-text-session";
const TEXT_BOOTSTRAP_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function createBootstrapTextSession(language: ChatLanguage = "english"): ChatSession {
  return {
    id: TEXT_BOOTSTRAP_SESSION_ID,
    title: "New conversation",
    createdAt: TEXT_BOOTSTRAP_TIMESTAMP,
    updatedAt: TEXT_BOOTSTRAP_TIMESTAMP,
    welcomed: false,
    mode: "adaptive",
    language,
    messages: [],
    preferredName: "",
    textAudience: "patient",
    voiceTranscript: [],
    programStage: "intro",
  };
}

function createTextUiMessage(role: "assistant" | "user", text: string): UIMessage {
  return {
    id: createSafeId(role),
    role,
    parts: [
      {
        type: "text",
        text,
        state: "done",
      },
    ],
  };
}

function createSilentWavUrl() {
  const sampleRate = 8_000;
  const durationMs = 120;
  const sampleCount = Math.max(1, Math.floor((sampleRate * durationMs) / 1000));
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const bytesPerSecond = sampleRate * 2;

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, bytesPerSecond, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, sampleCount * 2, true);

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function isAutoplayDeniedError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    name === "NotAllowedError" ||
    message.includes("notallowed") ||
    message.includes("autoplay") ||
    message.includes("user gesture") ||
    message.includes("interact with the document first")
  );
}

function getAudiencePillClass(audience: TextChatAudience, selected: boolean) {
  const themes: Record<TextChatAudience, { selected: string; idle: string }> = {
    patient: {
      selected: "border-fuchsia-300/70 bg-fuchsia-400/22 text-white shadow-[0_10px_24px_rgba(217,70,239,0.25)]",
      idle: "border-white/16 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white",
    },
    family: {
      selected: "border-emerald-300/70 bg-emerald-400/20 text-white shadow-[0_10px_24px_rgba(16,185,129,0.24)]",
      idle: "border-white/16 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white",
    },
    staff: {
      selected: "border-sky-300/70 bg-sky-400/22 text-white shadow-[0_10px_24px_rgba(56,189,248,0.24)]",
      idle: "border-white/16 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white",
    },
    classroom: {
      selected: "border-amber-300/70 bg-amber-400/22 text-white shadow-[0_10px_24px_rgba(251,191,36,0.24)]",
      idle: "border-white/16 bg-white/6 text-white/78 hover:bg-white/10 hover:text-white",
    },
  };

  return selected ? themes[audience].selected : themes[audience].idle;
}

function getAudienceSuggestionChips(
  audience: TextChatAudience,
  language: ChatLanguage,
) {
  if (language === "urdu") {
    if (audience === "family") {
      return [
        "میں اپنے پیارے کی مدد کرنا چاہتا ہوں مگر ہر بار بات بگڑ جاتی ہے۔",
        "denial کے دوران ہمیں کیا کہنا چاہیے؟",
        "post-rehab گھر واپسی کے بعد family structure کیسے قائم رکھیں؟",
        "intervention سے پہلے family کو کیا تیاری کرنی چاہیے؟",
      ];
    }

    if (audience === "staff") {
      return [
        "ولنگ ویز کے family-system approach کو clinically useful انداز میں سمجھائیں۔",
        "follow-up counseling میں relapse prevention کیسے teach کریں؟",
        "cravings اور shame کے ساتھ patient کو کیسے ground کریں؟",
        "ڈاکٹر صداقت کے مطابق enabling اور support میں فرق کیا ہے؟",
      ];
    }

    if (audience === "classroom") {
      return [
        "class کے لئے relapse warning signs آسان انداز میں سمجھائیں۔",
        "HALT کو group session میں کیسے explain کرنا چاہیے؟",
        "addiction کو disease model کے مطابق سادہ الفاظ میں پڑھائیں۔",
        "family boundaries پر ایک مختصر teaching script بنائیں۔",
      ];
    }

    return [
      "مجھے cravings ہو رہی ہیں اور ایک محفوظ اگلا قدم چاہیے۔",
      "میں نے دوبارہ use کیا ہے، اب کیا کروں؟",
      "post-rehab زندگی پھر سے غیر مستحکم لگ رہی ہے۔",
      "میں ابھی اپنا نام نہیں بتانا چاہتا مگر رہنمائی چاہیے۔",
    ];
  }

  if (audience === "family") {
    return [
      "Help me talk to my loved one without triggering another fight.",
      "How do we stop enabling while still staying supportive?",
      "What home structure matters most after rehab discharge?",
      "Coach me for an intervention conversation.",
    ];
  }

  if (audience === "staff") {
    return [
      "Teach the Willing Ways family-system approach in a clinically useful way.",
      "How should staff explain relapse prevention during follow-up counseling?",
      "What is the best way to handle shame after a lapse?",
      "Explain the difference between support and enabling.",
    ];
  }

  if (audience === "classroom") {
    return [
      "Explain relapse warning signs clearly for a rehab class.",
      "Teach HALT in a way a room can remember.",
      "Explain addiction as a disease in simple language.",
      "Write a short family-boundary teaching script.",
    ];
  }

  return [
    "I am having cravings tonight and need one calm next step.",
    "I used again and I feel ashamed. Help me course correct.",
    "Home after rehab feels fragile. What should I watch closely?",
    "I want guidance without sharing my name yet.",
  ];
}

function mapAudienceToMode(audience: TextChatAudience) {
  return audience === "staff" || audience === "classroom" ? "doctor" : "patient";
}

export function TextChatPage() {
  const { hydrated: siteLanguageHydrated, language: siteLanguage, setLanguage: setSiteLanguage } =
    useSiteLanguage();
  const [storageReady, setStorageReady] = useState(false);
  const [rememberOnDevice, setRememberOnDevice] = useState(
    DEFAULT_LOCAL_PRIVACY_PREFERENCES.rememberOnDevice,
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    realtimeConfigured: false,
    serverKeyConfigured: false,
  });
  const [session, setSession] = useState<ChatSession | null>(createBootstrapTextSession());
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [classroomDisplay, setClassroomDisplay] = useState(false);
  const [readAloudLoadingMessageId, setReadAloudLoadingMessageId] = useState<string | null>(null);
  const [readAloudActiveMessageId, setReadAloudActiveMessageId] = useState<string | null>(null);
  const [readAloudNeedsTapMessageId, setReadAloudNeedsTapMessageId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechAbortControllerRef = useRef<AbortController | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechCacheRef = useRef<Map<string, string>>(new Map());
  const silentAudioUrlRef = useRef<string | null>(null);
  const audioUnlockedRef = useRef(false);
  const isGenerating = status === "submitted";

  useEffect(() => {
    if (!siteLanguageHydrated || storageReady) {
      return;
    }

    try {
      const storedPrivacyPreferences = safeStorageGet(LOCAL_PRIVACY_STORAGE_KEY);
      const privacyPreferences = normalizeLocalPrivacyPreferences(
        storedPrivacyPreferences ? JSON.parse(storedPrivacyPreferences) : null,
      );
      setRememberOnDevice(privacyPreferences.rememberOnDevice);

      if (!privacyPreferences.rememberOnDevice) {
        safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
        safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
        setSession(createChatSession("adaptive", siteLanguage));
        setClassroomDisplay(false);
        return;
      }

      const storedSessions = safeStorageGet(CHAT_SESSIONS_STORAGE_KEY);
      const storedActiveChatId = safeStorageGet(ACTIVE_CHAT_STORAGE_KEY);
      const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];
      const normalizedSessions = normalizeChatSessions(parsedSessions);
      const nextSession =
        normalizedSessions.find((candidate) => candidate.id === storedActiveChatId) ??
        normalizedSessions[0] ??
        createChatSession("adaptive", siteLanguage);

      setSession(nextSession);
      setClassroomDisplay(safeStorageGet(CLASSROOM_DISPLAY_STORAGE_KEY) === "true");
    } catch {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      setSession(createChatSession("adaptive", siteLanguage));
      setClassroomDisplay(false);
    } finally {
      safeStorageRemove(APP_SETTINGS_STORAGE_KEY);
      setStorageReady(true);
    }
  }, [siteLanguage, siteLanguageHydrated, storageReady]);

  useEffect(() => {
    void fetch("/api/runtime")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Runtime status unavailable");
        }

        return (await response.json()) as RuntimeStatus;
      })
      .then((nextStatus) => setRuntimeStatus(nextStatus))
      .catch(() => {
        setRuntimeStatus({ realtimeConfigured: false, serverKeyConfigured: false });
      });
  }, []);

  useEffect(() => {
    safeStorageSet(
      LOCAL_PRIVACY_STORAGE_KEY,
      JSON.stringify({ rememberOnDevice }),
    );
  }, [rememberOnDevice]);

  useEffect(() => {
    if (!storageReady || !session) {
      return;
    }

    if (!rememberOnDevice) {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      return;
    }

    safeStorageSet(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify([session]));
    safeStorageSet(ACTIVE_CHAT_STORAGE_KEY, session.id);
  }, [rememberOnDevice, session, storageReady]);

  useEffect(() => {
    if (!rememberOnDevice) {
      safeStorageRemove(CLASSROOM_DISPLAY_STORAGE_KEY);
      return;
    }

    safeStorageSet(CLASSROOM_DISPLAY_STORAGE_KEY, classroomDisplay ? "true" : "false");
  }, [classroomDisplay, rememberOnDevice]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container || !session) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [session]);

  useEffect(() => {
    const speechCache = speechCacheRef.current;
    const speechAudio = speechAudioRef.current;

    return () => {
      abortControllerRef.current?.abort();
      speechAbortControllerRef.current?.abort();
      if (speechAudio) {
        speechAudio.pause();
        speechAudio.removeAttribute("src");
        speechAudio.load();
      }
      speechCache.forEach((url) => URL.revokeObjectURL(url));
      speechCache.clear();
      if (silentAudioUrlRef.current) {
        URL.revokeObjectURL(silentAudioUrlRef.current);
        silentAudioUrlRef.current = null;
      }
    };
  }, []);

  const sessionLanguage = session?.language ?? siteLanguage;
  const inputIsUrdu = sessionLanguage === "urdu" || isUrduText(input);
  const audience = session?.textAudience ?? "patient";
  const audienceOption = getTextChatAudienceOption(audience);
  const suggestionChips = getAudienceSuggestionChips(audience, sessionLanguage);
  const messages = session?.messages ?? EMPTY_MESSAGES;
  const rememberedName = useMemo(
    () => extractPreferredNameFromMessages(messages) || session?.preferredName || "",
    [messages, session?.preferredName],
  );
  const latestAssistantMessage = [...messages].reverse().find(
    (message) => message.role === "assistant",
  );
  const isEmptyConversation = messages.length === 0;
  const hasAssistantResponse = messages.some((message) => message.role === "assistant");
  const isHeroCollapsed = hasAssistantResponse;

  function patchSession(patch: Partial<ChatSession>) {
    setSession((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function handleLanguageChange(language: ChatLanguage) {
    setSiteLanguage(language);
    patchSession({ language });
  }

  function handleAudienceChange(nextAudience: TextChatAudience) {
    patchSession({ textAudience: nextAudience });
    setSpeechError(null);
    if (nextAudience === "classroom") {
      setClassroomDisplay(true);
    }
  }

  function handleRememberOnDeviceChange(nextValue: boolean) {
    setRememberOnDevice(nextValue);

    if (!nextValue) {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      safeStorageRemove(CLASSROOM_DISPLAY_STORAGE_KEY);
    }
  }

  function resetSpeechElement() {
    const audio = speechAudioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
    audio.onerror = null;
  }

  async function ensureSpeechPlaybackUnlocked() {
    const audio = speechAudioRef.current;

    if (!audio) {
      return false;
    }

    if (audioUnlockedRef.current) {
      return true;
    }

    if (!silentAudioUrlRef.current) {
      silentAudioUrlRef.current = createSilentWavUrl();
    }

    audio.setAttribute("playsinline", "");
    audio.preload = "auto";
    audio.muted = true;
    audio.src = silentAudioUrlRef.current;

    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.removeAttribute("src");
      audio.load();
      audioUnlockedRef.current = true;
      return true;
    } catch {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      audio.removeAttribute("src");
      audio.load();
      return false;
    }
  }

  async function requestAssistant(nextMessages: UIMessage[]) {
    if (!session) {
      return null;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus("submitted");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          id: session.id,
          language: session.language,
          messages: nextMessages,
          mode: mapAudienceToMode(audience),
          modelId: DEFAULT_CHAT_MODEL_ID,
          preferredName: rememberedName || session.preferredName || "",
          responseMode: "json",
          resumeContext: buildVoiceResumeContext(session.voiceTranscript),
          trigger: audience,
        }),
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "The message could not be sent right now.");
      }

      const data = (await response.json()) as ChatResponseBody;

      if (!data.message) {
        throw new Error("The assistant did not return a valid reply.");
      }

      return data.message;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }

      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setStatus("ready");
    }
  }

  async function submitPrompt(text: string) {
    const nextText = text.trim();

    if (!nextText || isGenerating || !session) {
      return;
    }

    if (!runtimeStatus.serverKeyConfigured) {
      setLocalError(
        session.language === "urdu"
          ? "اے آئی چیٹ اس وقت دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
          : "AI chat is temporarily unavailable right now. Please try again shortly or call 0300-7413639.",
      );
      return;
    }

    try {
      setLocalError(null);
      setSpeechError(null);
      setInput("");

      const userMessage = createTextUiMessage("user", nextText);
      const nextMessages = [...session.messages, userMessage];
      patchSession({ messages: nextMessages });

      const assistantMessage = await requestAssistant(nextMessages);

      if (assistantMessage) {
        patchSession({ messages: [...nextMessages, assistantMessage] });
      }
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "The message could not be sent right now.",
      );
    }
  }

  async function handleRegenerate() {
    if (!runtimeStatus.serverKeyConfigured || isGenerating || !session) {
      setLocalError(
        session?.language === "urdu"
          ? "اے آئی چیٹ اس وقت دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
          : "AI chat is temporarily unavailable right now. Please try again shortly or call 0300-7413639.",
      );
      return;
    }

    const lastAssistantIndex = [...session.messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "assistant")?.index;

    if (lastAssistantIndex == null) {
      return;
    }

    try {
      setLocalError(null);

      const nextMessages = session.messages.filter((_, index) => index !== lastAssistantIndex);
      patchSession({ messages: nextMessages });

      const assistantMessage = await requestAssistant(nextMessages);

      if (assistantMessage) {
        patchSession({ messages: [...nextMessages, assistantMessage] });
      }
    } catch (regenerateError) {
      setLocalError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "The assistant could not regenerate that response.",
      );
    }
  }

  function handleFreshStart() {
    if (!session) {
      return;
    }

    stopReadAloud();
    const nextSession = createChatSession("adaptive", session.language);
    nextSession.preferredName = session.preferredName;
    nextSession.voiceTranscript = session.voiceTranscript;
    nextSession.textAudience = session.textAudience ?? "patient";
    setLocalError(null);
    setCopiedText(null);
    setSpeechError(null);
    setInput("");
    setSession(nextSession);
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("ready");
  }

  async function handleCopy(text: string) {
    if (!text) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopiedText(text);
    window.setTimeout(() => setCopiedText(null), 1600);
  }

  function stopReadAloud() {
    speechAbortControllerRef.current?.abort();
    speechAbortControllerRef.current = null;

    resetSpeechElement();

    setReadAloudActiveMessageId(null);
    setReadAloudLoadingMessageId(null);
    setReadAloudNeedsTapMessageId(null);
  }

  async function handleReadAloud(messageId: string, text: string) {
    if (!text.trim()) {
      return;
    }

    if (readAloudActiveMessageId === messageId || readAloudLoadingMessageId === messageId) {
      stopReadAloud();
      return;
    }

    if (!runtimeStatus.serverKeyConfigured) {
      setSpeechError(
        sessionLanguage === "urdu"
          ? "بلند آواز میں سنانے کی سہولت اس وقت دستیاب نہیں۔"
          : "Read-aloud is not available right now.",
      );
      return;
    }

    setSpeechError(null);
    stopReadAloud();
    await ensureSpeechPlaybackUnlocked();

    const cacheKey = `${sessionLanguage}:${audience}:${messageId}`;
    const cachedUrl = speechCacheRef.current.get(cacheKey);

    const playUrl = async (audioUrl: string) => {
      const audio = speechAudioRef.current;

      if (!audio) {
        setReadAloudLoadingMessageId(null);
        setSpeechError(
          sessionLanguage === "urdu"
            ? "آڈیو پلیئر دستیاب نہیں ہو سکا۔"
            : "The audio player could not be started.",
        );
        return;
      }

      resetSpeechElement();
      audio.setAttribute("playsinline", "");
      audio.preload = "auto";
      audio.src = audioUrl;

      audio.onended = () => {
        setReadAloudActiveMessageId(null);
        setReadAloudNeedsTapMessageId(null);
      };
      audio.onerror = () => {
        setSpeechError(
          sessionLanguage === "urdu"
            ? "آواز چلانے میں مسئلہ پیش آیا۔"
            : "The read-aloud audio could not be played.",
        );
        setReadAloudActiveMessageId(null);
        setReadAloudNeedsTapMessageId(null);
      };

      try {
        await audio.play();
        setReadAloudActiveMessageId(messageId);
        setReadAloudLoadingMessageId(null);
        setReadAloudNeedsTapMessageId(null);
      } catch (error) {
        if (isAutoplayDeniedError(error)) {
          setReadAloudNeedsTapMessageId(messageId);
          setSpeechError(
            sessionLanguage === "urdu"
              ? "آڈیو تیار ہے۔ سننے کے لئے اسی بٹن کو دوبارہ دبائیں۔"
              : "Audio is ready. Tap the same button again to play it.",
          );
        } else {
          setSpeechError(
            sessionLanguage === "urdu"
              ? "آواز چلانے میں مسئلہ پیش آیا۔"
              : "The read-aloud audio could not be played.",
          );
        }

        setReadAloudActiveMessageId(null);
        setReadAloudLoadingMessageId(null);
      }
    };

    if (cachedUrl) {
      await playUrl(cachedUrl);
      return;
    }

    const controller = new AbortController();
    speechAbortControllerRef.current = controller;
    setReadAloudLoadingMessageId(messageId);

    try {
      const response = await fetch("/api/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          audience,
          language: sessionLanguage,
          text,
        }),
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "The read-aloud audio could not be prepared.");
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      speechCacheRef.current.set(cacheKey, audioUrl);
      await playUrl(audioUrl);
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      setSpeechError(
        error instanceof Error
          ? error.message
          : sessionLanguage === "urdu"
            ? "read-aloud اس وقت تیار نہیں ہو سکا۔"
            : "Read-aloud could not be prepared right now.",
      );
      setReadAloudActiveMessageId(null);
    } finally {
      if (speechAbortControllerRef.current === controller) {
        speechAbortControllerRef.current = null;
      }

      setReadAloudLoadingMessageId((current) => (current === messageId ? null : current));
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f4f3ee] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[84vh] max-w-4xl items-center justify-center rounded-[32px] border border-black/5 bg-white/92 px-6 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="text-center">
            <Image
              src={SITE_MEDIA.logo}
              alt="Willing Ways"
              width={320}
              height={80}
              className="mx-auto h-11 w-auto object-contain sm:h-12"
              priority
              sizes="(max-width: 640px) 180px, 220px"
            />
            <div className="mt-5 text-lg font-semibold text-slate-900">
              {siteLanguage === "urdu" ? "ڈاکٹر صداقت GPT تیار ہو رہی ہے" : "Dr Sadaqat GPT is getting ready"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerTitle =
    audience === "classroom"
      ? sessionLanguage === "urdu"
        ? "ڈاکٹر صداقت GPT برائے کلاس روم"
        : "Dr Sadaqat GPT for the classroom"
      : sessionLanguage === "urdu"
        ? "ڈاکٹر صداقت GPT"
        : "Dr Sadaqat GPT";

  const pageTitle =
    audience === "family"
      ? sessionLanguage === "urdu"
        ? "خاندان کے لئے پرسکون رہنمائی"
        : "Calm guidance for the whole family"
      : audience === "staff"
        ? sessionLanguage === "urdu"
          ? "اسٹاف کے لئے واضح teaching اور consultation"
          : "Clear teaching and consultation for staff"
        : audience === "classroom"
          ? sessionLanguage === "urdu"
            ? "rehab classes اور projector sessions کے لئے"
            : "Built for rehab classes and projector sessions"
          : sessionLanguage === "urdu"
            ? "relapse، craving اور treatment confusion کے لئے"
            : "For relapse, cravings, and treatment confusion";

  const pageDescription =
    audience === "family"
      ? sessionLanguage === "urdu"
        ? "ڈاکٹر صداقت GPT family system، boundaries، enabling اور post-rehab follow-through کو آسان زبان میں guide کرتی ہے۔"
        : "Dr Sadaqat GPT guides family systems, boundaries, enabling, and post-rehab follow-through in simple language."
      : audience === "staff"
        ? sessionLanguage === "urdu"
          ? "یہ موڈ staff، referrers اور learning sessions کے لئے Willing Ways approach کو زیادہ وضاحت سے سمجھاتا ہے۔"
          : "This mode explains the Willing Ways approach more clearly for staff, referrers, and learning sessions."
        : audience === "classroom"
          ? sessionLanguage === "urdu"
            ? "یہ view بڑی اسکرین، projector اور روزانہ teaching کے لئے زیادہ readable اور read-aloud friendly ہے۔"
            : "This view is more readable and read-aloud friendly for large screens, projectors, and daily teaching."
        : sessionLanguage === "urdu"
          ? "اپنی کیفیت لکھیں، پھر ایک پرسکون اگلا قدم، exercise یا Willing Ways handoff حاصل کریں۔"
          : "Write what is happening, then get one calm next step, one exercise, or a clean Willing Ways handoff.";

  return (
    <div className="min-h-[100dvh] bg-[#050b16] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_26%),radial-gradient(circle_at_left,_rgba(217,70,239,0.12),_transparent_34%),radial-gradient(circle_at_right,_rgba(245,158,11,0.12),_transparent_32%),linear-gradient(180deg,#07111d_0%,#091423_42%,#0d1727_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_22%,transparent_78%,rgba(255,255,255,0.04))]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1440px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <audio ref={speechAudioRef} className="hidden" playsInline preload="none" aria-hidden="true" />

        <header className="rounded-[30px] border border-white/10 bg-[rgba(8,15,28,0.78)] px-4 py-4 shadow-[0_22px_64px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/" className="inline-flex min-h-11 min-w-0 items-center gap-3 rounded-full px-1">
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={320}
                    height={80}
                    className="h-9 w-auto max-w-[180px] object-contain sm:h-10 sm:max-w-[220px]"
                    priority
                    sizes="(max-width: 640px) 180px, 220px"
                  />
                </Link>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                    {headerTitle}
                  </div>
                  {!isHeroCollapsed ? (
                    <div className="mt-1 text-sm text-white/72">
                      {sessionLanguage === "urdu"
                        ? "ایک سادہ چیٹ اسٹیج برائے teaching، counseling اور follow-up"
                        : "A cleaner chat stage for teaching, counseling, and follow-up"}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <LanguageToggle
                  language={session.language}
                  onChange={handleLanguageChange}
                  compact
                  className="w-full sm:w-[170px]"
                />
                <PrivacyDeviceToggle
                  checked={rememberOnDevice}
                  isUrdu={session.language === "urdu"}
                  onCheckedChange={handleRememberOnDeviceChange}
                />
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
                >
                  <PhoneCall className="h-4 w-4" />
                  <span
                    className={session.language === "urdu" ? "font-urdu" : ""}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu" ? "واپس AI call" : "Back to AI call"}
                  </span>
                </Link>
              </div>
            </div>

            {!isHeroCollapsed ? (
              <div className="rounded-[26px] border border-white/12 bg-[linear-gradient(135deg,rgba(21,31,54,0.96),rgba(27,42,70,0.96)_48%,rgba(62,31,76,0.9)_100%)] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-6">
                <div className={session.language === "urdu" ? "font-urdu text-right" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/12 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/88">
                    <Sparkles className="h-3.5 w-3.5" />
                    {session.language === "urdu" ? "AI counseling classroom stage" : "AI counseling classroom stage"}
                  </div>
                  <h1 className="mt-4 max-w-3xl text-[2.1rem] font-semibold tracking-[-0.03em] text-white sm:text-[3rem] sm:leading-[1.02]">
                    {pageTitle}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/78 sm:text-[15px]">
                    {pageDescription}
                  </p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {TEXT_CHAT_AUDIENCE_OPTIONS.map((option) => {
                    const selected = audience === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleAudienceChange(option.id)}
                        className={cn(
                          "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                          getAudiencePillClass(option.id, selected),
                          session.language === "urdu" ? "font-urdu" : "",
                        )}
                        dir={session.language === "urdu" ? "rtl" : "ltr"}
                      >
                        {session.language === "urdu" ? option.urduLabel : option.englishLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-white/12 bg-white/6 px-3 py-3 sm:px-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div
                    className={cn(
                      "text-sm text-white/78",
                      session.language === "urdu" ? "font-urdu text-right" : "",
                    )}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? "گفتگو جاری ہے۔ کردار تبدیل کر سکتے ہیں یا projector mode آن کر سکتے ہیں۔"
                      : "Conversation in progress. Switch audience or enable projector mode anytime."}
                  </div>
                  <a
                    href={WILLING_WAYS_HELPLINE_HREF}
                    className="inline-flex h-10 items-center rounded-full border border-white/16 bg-white/8 px-4 text-xs font-semibold text-white hover:bg-white/12"
                  >
                    {WILLING_WAYS_HELPLINE_DISPLAY}
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {TEXT_CHAT_AUDIENCE_OPTIONS.map((option) => {
                    const selected = audience === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleAudienceChange(option.id)}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm",
                          getAudiencePillClass(option.id, selected),
                          session.language === "urdu" ? "font-urdu" : "",
                        )}
                        dir={session.language === "urdu" ? "rtl" : "ltr"}
                      >
                        {session.language === "urdu" ? option.urduLabel : option.englishLabel}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setClassroomDisplay((current) => !current)}
                    className="ml-auto inline-flex h-10 items-center rounded-full border border-white/16 bg-white/8 px-4 text-xs font-semibold text-white transition hover:bg-white/12 sm:text-sm"
                  >
                    <Volume2 className="mr-2 h-3.5 w-3.5" />
                    {session.language === "urdu"
                      ? classroomDisplay
                        ? "Projector mode: آن"
                        : "Projector mode: آف"
                      : classroomDisplay
                        ? "Projector mode: on"
                        : "Projector mode: off"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[rgba(8,15,28,0.8)] shadow-[0_24px_72px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          <div
            ref={scrollContainerRef}
            className={cn(
              "min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6",
              classroomDisplay ? "sm:px-8 sm:py-8" : "",
            )}
          >
            {isEmptyConversation ? (
              <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center py-8 text-center">
                <h2
                  className={cn(
                    "max-w-4xl text-3xl font-semibold tracking-[-0.03em] text-white sm:text-[3rem]",
                    session.language === "urdu" ? "font-urdu leading-[1.8]" : "",
                    classroomDisplay ? "sm:text-[3.4rem]" : "",
                  )}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? audienceOption.urduStarter
                    : audienceOption.englishStarter}
                </h2>
                <p
                  className={cn(
                    "mt-3 max-w-3xl text-sm leading-7 text-white/74 sm:text-base",
                    session.language === "urdu" ? "font-urdu" : "",
                    classroomDisplay ? "sm:text-[18px] sm:leading-8" : "",
                  )}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? "یہاں سوال، case teaching، relapse prevention، bipolar psychoeducation، family scripts اور aftercare guidance سب ایک ہی جگہ ملتی ہے۔"
                    : "Use this space for questions, case teaching, relapse prevention, bipolar psychoeducation, family scripts, and aftercare guidance."}
                </p>
                <div className="mt-7 grid w-full max-w-4xl gap-3 sm:grid-cols-2">
                  {suggestionChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void submitPrompt(chip)}
                      className={cn(
                        "rounded-[24px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))] px-4 py-4 text-left text-sm leading-6 text-white/86 transition hover:-translate-y-0.5 hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))]",
                        session.language === "urdu" ? "font-urdu text-right" : "",
                        classroomDisplay ? "sm:text-[17px] sm:leading-8" : "",
                      )}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn("mx-auto flex w-full max-w-4xl flex-col gap-4", classroomDisplay ? "max-w-5xl gap-5" : "")}>
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    assistantLabel="Dr Sadaqat GPT"
                    canRegenerate={!isGenerating}
                    isLatestAssistant={latestAssistantMessage?.id === message.id}
                    message={message}
                    onCopy={(text) => void handleCopy(text)}
                    onReadAloud={(messageId, text) => void handleReadAloud(messageId, text)}
                    onRegenerate={() => void handleRegenerate()}
                    presentationMode={classroomDisplay}
                    readAloudNeedsTapMessageId={readAloudNeedsTapMessageId}
                    readAloudActiveMessageId={readAloudActiveMessageId}
                    readAloudLoadingMessageId={readAloudLoadingMessageId}
                    variant="stage"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(7,14,24,0.92),rgba(8,16,27,0.98))] px-3 py-3 sm:px-4 sm:py-4">
            {localError ? (
              <div className="mx-auto mb-3 flex w-full max-w-4xl items-start gap-3 rounded-[18px] border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{localError}</span>
              </div>
            ) : null}

            {speechError ? (
              <div className="mx-auto mb-3 flex w-full max-w-4xl items-start gap-3 rounded-[18px] border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{speechError}</span>
              </div>
            ) : null}

            {copiedText ? (
              <div className="mx-auto mb-3 flex w-full max-w-4xl items-center gap-2 rounded-[18px] border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-50">
                <Check className="h-4 w-4" />
                {session.language === "urdu"
                  ? "جواب clipboard میں کاپی ہو گیا۔"
                  : "Response copied to clipboard."}
              </div>
            ) : null}

            <form
              className="mx-auto w-full max-w-4xl rounded-[26px] border border-white/18 bg-[linear-gradient(180deg,rgba(18,32,53,0.96),rgba(12,23,40,0.98))] p-3 shadow-[0_22px_46px_rgba(0,0,0,0.32)] backdrop-blur sm:p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitPrompt(input);
              }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div
                  className={cn(
                    "text-xs font-semibold uppercase tracking-[0.18em] text-white/60",
                    session.language === "urdu" ? "font-urdu normal-case" : "",
                  )}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? `Active role: ${audienceOption.urduLabel}`
                    : `Active role: ${audienceOption.englishLabel}`}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rememberedName ? (
                    <div className="inline-flex h-10 items-center rounded-full border border-white/12 bg-white/10 px-4 text-xs font-semibold text-white/72">
                      {session.language === "urdu"
                        ? `یاد رکھا گیا نام: ${rememberedName}`
                        : `Remembered name: ${rememberedName}`}
                    </div>
                  ) : null}
                  {messages.length > 0 ? (
                    <Button type="button" variant="outline" onClick={handleFreshStart}>
                      <RotateCcw className="h-4 w-4" />
                      {session.language === "urdu" ? "نئی گفتگو" : "Fresh start"}
                    </Button>
                  ) : null}
                </div>
              </div>

              <label
                htmlFor="ai-text-input"
                className={cn(
                  "mb-2 block text-sm font-semibold text-white/84",
                  session.language === "urdu" ? "font-urdu text-right" : "",
                )}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                {session.language === "urdu"
                  ? "اپنا سوال یا صورتحال لکھیں"
                  : "Write your question or situation"}
              </label>

              <Textarea
                id="ai-text-input"
                placeholder={
                  session.language === "urdu"
                    ? "اپنی صورتحال، سوال یا case لکھیں۔ ڈاکٹر صداقت GPT پہلے سنبھالے گی، پھر ایک calm next step، teaching point یا handoff دے گی۔"
                    : "Write the situation, question, or case. Dr Sadaqat GPT will first reflect it, then offer one calm next step, teaching point, or handoff."
                }
                dir={inputIsUrdu ? "rtl" : "ltr"}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                className={cn(
                  "min-h-[132px] rounded-[18px] border border-white/12 bg-white/[0.03] px-4 py-3 text-[15px] leading-7 text-white placeholder:text-white/42 shadow-none focus-visible:border-white/40 focus-visible:ring-0 sm:min-h-[148px] sm:text-[16px]",
                  classroomDisplay ? "sm:min-h-[168px] sm:text-[20px] sm:leading-9" : "",
                  session.language === "urdu" ? "font-urdu" : "",
                )}
                maxLength={2400}
              />

              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div
                  className={cn(
                    "max-w-xl text-xs leading-6 text-white/62",
                    session.language === "urdu" ? "font-urdu text-right" : "",
                  )}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? "واضح رہنمائی کے لئے اپنی کیفیت سادہ الفاظ میں لکھیں۔ فوری خطرے کی صورت میں 1122 یا 0300-7413639 پر فوراً رابطہ کریں۔"
                    : "For the best guidance, describe what is happening in plain words. In urgent risk, call 1122 or 0300-7413639 immediately."}
                </div>

                <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                  {isGenerating ? (
                    <Button type="button" variant="outline" onClick={handleStop}>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      {session.language === "urdu" ? "روکیں" : "Stop"}
                    </Button>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full min-w-[176px] bg-[linear-gradient(135deg,#f97316,#ec4899_48%,#8b5cf6)] text-white shadow-[0_18px_34px_rgba(217,70,239,0.26)] hover:bg-[linear-gradient(135deg,#f97316,#ec4899_48%,#8b5cf6)] sm:w-auto"
                    disabled={!input.trim() || isGenerating}
                  >
                    {isGenerating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquareText className="h-4 w-4" />
                    )}
                    {session.language === "urdu" ? "ڈاکٹر صداقت GPT سے پوچھیں" : "Ask Dr Sadaqat GPT"}
                  </Button>
                </div>
              </div>

              <div
                className={cn(
                  "mt-2 text-[11px] text-white/48",
                  session.language === "urdu" ? "font-urdu text-right" : "",
                )}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                {session.language === "urdu"
                  ? `Built with love by ${DR_ZARAK_NAME}`
                  : `Built with love by ${DR_ZARAK_NAME}`}
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
