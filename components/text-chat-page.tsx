"use client";

import Image from "next/image";
import Link from "next/link";
import type { UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  ExternalLink,
  LoaderCircle,
  MessageSquareText,
  PhoneCall,
  RotateCcw,
  ShieldAlert,
  Square,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  APP_SETTINGS_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_CHAT_MODEL_ID,
  buildVoiceResumeContext,
  createChatSession,
  extractPreferredNameFromMessages,
  getSuggestionChips,
  isUrduText,
  normalizeChatSessions,
  type ChatLanguage,
  type ChatSession,
  type RuntimeStatus,
} from "@/lib/chat";
import {
  DR_ZARAK_LINKEDIN_URL,
  DR_ZARAK_NAME,
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  WILLING_WAYS_HELPLINE_DISPLAY,
  WILLING_WAYS_HELPLINE_HREF,
} from "@/lib/site-contact";
import { SITE_MEDIA } from "@/lib/site-assets";
import { createSafeId, safeStorageGet, safeStorageRemove, safeStorageSet } from "@/lib/utils";

import { LanguageToggle } from "@/components/language-toggle";
import { MessageBubble } from "@/components/message-bubble";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatResponseBody {
  message?: UIMessage;
  preferredName?: string;
}

const EMPTY_MESSAGES: UIMessage[] = [];

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

export function TextChatPage() {
  const { hydrated: siteLanguageHydrated, language: siteLanguage, setLanguage: setSiteLanguage } = useSiteLanguage();
  const [hydrated, setHydrated] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    realtimeConfigured: false,
    serverKeyConfigured: false,
  });
  const [session, setSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isGenerating = status === "submitted";

  useEffect(() => {
    if (!siteLanguageHydrated || hydrated) {
      return;
    }

    try {
      const storedSessions = safeStorageGet(CHAT_SESSIONS_STORAGE_KEY);
      const storedActiveChatId = safeStorageGet(ACTIVE_CHAT_STORAGE_KEY);
      const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];
      const normalizedSessions = normalizeChatSessions(parsedSessions);
      const nextSession =
        normalizedSessions.find((candidate) => candidate.id === storedActiveChatId) ??
        normalizedSessions[0] ??
        createChatSession("adaptive", siteLanguage);

      setSession(nextSession);
    } catch {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      setSession(createChatSession("adaptive", siteLanguage));
    } finally {
      safeStorageRemove(APP_SETTINGS_STORAGE_KEY);
      setHydrated(true);
    }
  }, [hydrated, siteLanguage, siteLanguageHydrated]);

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
    if (!hydrated || !session) {
      return;
    }

    safeStorageSet(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify([session]));
    safeStorageSet(ACTIVE_CHAT_STORAGE_KEY, session.id);
  }, [hydrated, session]);

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
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sessionLanguage = session?.language ?? siteLanguage;
  const inputIsUrdu = sessionLanguage === "urdu" || isUrduText(input);
  const suggestionChips = getSuggestionChips(sessionLanguage);
  const messages = session?.messages ?? EMPTY_MESSAGES;
  const rememberedName = useMemo(
    () => extractPreferredNameFromMessages(messages) || session?.preferredName || "",
    [messages, session?.preferredName],
  );
  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant");
  const isEmptyConversation = messages.length === 0;

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
          mode: session.mode,
          modelId: DEFAULT_CHAT_MODEL_ID,
          preferredName: rememberedName || session.preferredName || "",
          responseMode: "json",
          resumeContext: buildVoiceResumeContext(session.voiceTranscript),
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

    const nextSession = createChatSession("adaptive", session.language);
    nextSession.preferredName = session.preferredName;
    nextSession.voiceTranscript = session.voiceTranscript;
    setLocalError(null);
    setCopiedText(null);
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

  if (!hydrated || !session) {
    return (
      <div className="min-h-screen bg-[#f4f4f1] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[84vh] max-w-4xl items-center justify-center rounded-[32px] border border-black/5 bg-white/92 px-6 py-10 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div className="text-center">
            <Image
              src={SITE_MEDIA.logo}
              alt="Willing Ways"
              width={320}
              height={80}
              className="mx-auto h-11 w-auto object-contain sm:h-12"
              unoptimized
              priority
            />
            <div className="mt-5 text-lg font-semibold text-slate-900">
              {siteLanguage === "urdu" ? "ٹیکسٹ سپورٹ تیار ہو رہی ہے" : "Text support is getting ready"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f4f4f1] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.03),_transparent_26%)]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[980px] flex-col px-3 py-3 sm:px-5 sm:py-5">
        <header className="rounded-[28px] border border-black/5 bg-white/88 px-4 py-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)] backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/" className="inline-flex min-h-11 min-w-0 items-center gap-3 rounded-full px-1">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={320}
                  height={80}
                  className="h-9 w-auto max-w-[180px] object-contain sm:h-10 sm:max-w-[220px]"
                  unoptimized
                  priority
                />
              </Link>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <LanguageToggle
                language={session.language}
                onChange={handleLanguageChange}
                compact
                className="w-full sm:w-[170px]"
              />
              <a
                href={WILLING_WAYS_HELPLINE_HREF}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <PhoneCall className="h-4 w-4" />
                {WILLING_WAYS_HELPLINE_DISPLAY}
              </a>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-slate-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div className={session.language === "urdu" ? "font-urdu text-right" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {session.language === "urdu" ? "خاموش ٹیکسٹ سپورٹ" : "Quiet text support"}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
                {session.language === "urdu"
                  ? "جو کچھ ہو رہا ہے وہ یہاں لکھ دیں"
                  : "Write what is happening"}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
                {session.language === "urdu"
                  ? "اگر بولنا مشکل ہو تو یہ آسان راستہ ہے۔ ہم cravings، family stress، relapse risk اور follow-up کے اگلے قدم میں مدد کریں گے۔"
                  : "If speaking feels hard right now, this is the calmer route. We help with cravings, family stress, relapse risk, and the next follow-up step."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {rememberedName ? (
                <div className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-600">
                  {session.language === "urdu" ? `یاد رکھا گیا نام: ${rememberedName}` : `Remembered name: ${rememberedName}`}
                </div>
              ) : null}
              {messages.length > 0 ? (
                <Button type="button" variant="outline" onClick={handleFreshStart}>
                  <RotateCcw className="h-4 w-4" />
                  {session.language === "urdu" ? "نئی گفتگو" : "Fresh start"}
                </Button>
              ) : null}
              <Link href="/" className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
                <PhoneCall className="h-4 w-4" />
                <span className={session.language === "urdu" ? "font-urdu" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
                  {session.language === "urdu" ? "واپس اے آئی کال" : "Back to the AI call"}
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
          <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            {isEmptyConversation ? (
              <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center py-8 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 shadow-sm">
                  <MessageSquareText className="h-6 w-6" />
                </div>
                <h2
                  className={`mt-6 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.35rem] ${
                    session.language === "urdu" ? "font-urdu leading-[1.8]" : ""
                  }`}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? "جو بات سب سے زیادہ مشکل لگ رہی ہے، وہیں سے شروع کریں"
                    : "Start with what feels hardest right now"}
                </h2>
                <p
                  className={`mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base ${
                    session.language === "urdu" ? "font-urdu" : ""
                  }`}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  {session.language === "urdu"
                    ? "ہم ایک وقت میں ایک قدم لیں گے، صورتحال سمجھیں گے، اور پھر محفوظ اگلا راستہ نکالیں گے۔"
                    : "We will take one step at a time, understand the situation, and then work out the safest next step."}
                </p>
                <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
                  {suggestionChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => void submitPrompt(chip)}
                      className={`rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-left text-sm leading-6 text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 ${
                        session.language === "urdu" ? "font-urdu text-right" : ""
                      }`}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
                {messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    canRegenerate={!isGenerating}
                    isLatestAssistant={latestAssistantMessage?.id === message.id}
                    message={message}
                    onCopy={(text) => void handleCopy(text)}
                    onRegenerate={() => void handleRegenerate()}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-3 py-3 sm:px-4 sm:py-4">
            {localError ? (
              <div className="mx-auto mb-3 flex w-full max-w-3xl items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{localError}</span>
              </div>
            ) : null}

            {copiedText ? (
              <div className="mx-auto mb-3 flex w-full max-w-3xl items-center gap-2 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <Check className="h-4 w-4" />
                {session.language === "urdu"
                  ? "جواب clipboard میں کاپی ہو گیا۔"
                  : "Response copied to clipboard."}
              </div>
            ) : null}

            <form
              className="mx-auto w-full max-w-3xl rounded-[30px] border border-slate-200 bg-[#fbfbfa] p-3 shadow-sm"
              onSubmit={(event) => {
                event.preventDefault();
                void submitPrompt(input);
              }}
            >
              <Textarea
                id="ai-text-input"
                placeholder={
                  session.language === "urdu"
                    ? "جو کچھ ہو رہا ہے وہ لکھ دیں۔ ہم cravings، relapse warning signs، family stress، post-rehab follow-up یا session request میں مدد کریں گے۔"
                    : "Tell us what is happening. We can help with cravings, relapse warning signs, family stress, post-rehab follow-up, or a session request."
                }
                dir={inputIsUrdu ? "rtl" : "ltr"}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  if (localError) {
                    setLocalError(null);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submitPrompt(input);
                  }
                }}
                className="min-h-[112px] resize-none border-0 bg-transparent text-[16px] leading-7 shadow-none focus-visible:ring-0"
              />

              <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`flex items-center gap-2 text-sm text-slate-600 ${
                    session.language === "urdu" ? "font-urdu text-right" : ""
                  }`}
                  dir={session.language === "urdu" ? "rtl" : "ltr"}
                >
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  {session.language === "urdu"
                    ? "ہنگامی صورت میں 1122 یا 0300-7413639 کو ترجیح دیں"
                    : "In emergencies, prioritize 1122 or 0300-7413639"}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {isGenerating ? (
                    <Button type="button" variant="outline" onClick={handleStop}>
                      <Square className="h-4 w-4 fill-current" />
                      {session.language === "urdu" ? "روکیں" : "Stop"}
                    </Button>
                  ) : null}

                  <Button type="submit" variant="default" disabled={!input.trim()}>
                    {isGenerating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                    {session.language === "urdu" ? "بھیجیں" : "Send"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </main>

        <footer className="px-2 py-4 text-center text-xs text-slate-500">
          <div className={session.language === "urdu" ? "font-urdu" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
            {session.language === "urdu"
              ? "یہ جگہ اسی براؤزر میں نجی رہتی ہے۔"
              : "This conversation stays private in this browser."}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <a
              href={DR_ZARAK_PHONE_HREF}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-slate-600 transition hover:text-slate-950"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              {DR_ZARAK_NAME} · {DR_ZARAK_PHONE_DISPLAY}
            </a>
            <a
              href={DR_ZARAK_LINKEDIN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-slate-600 transition hover:text-slate-950"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              LinkedIn
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
