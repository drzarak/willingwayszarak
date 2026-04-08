"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Menu, MessageSquare, PhoneCall } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  APP_SETTINGS_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_CHAT_MODEL_ID,
  createChatSession,
  deriveSessionTitle,
  normalizeChatSessions,
  type ChatSession,
  type RuntimeStatus,
  type VoiceTranscriptEntry,
} from "@/lib/chat";
import {
  DEFAULT_LOCAL_PRIVACY_PREFERENCES,
  LOCAL_PRIVACY_STORAGE_KEY,
  normalizeLocalPrivacyPreferences,
} from "@/lib/privacy";
import {
  DR_ZARAK_LINKEDIN_URL,
  DR_ZARAK_NAME,
  DR_ZARAK_PHONE_DISPLAY,
  DR_ZARAK_PHONE_HREF,
  WILLING_WAYS_HELPLINE_DISPLAY,
  WILLING_WAYS_HELPLINE_HREF,
} from "@/lib/site-contact";
import { SITE_MEDIA } from "@/lib/site-assets";
import { safeStorageGet, safeStorageRemove, safeStorageSet } from "@/lib/utils";

import { LanguageToggle } from "@/components/language-toggle";
import { PrivacyDeviceToggle } from "@/components/privacy-device-toggle";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Button } from "@/components/ui/button";

if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

const ChatPane = dynamic(
  () => import("@/components/chat-pane").then((mod) => mod.ChatPane),
  { ssr: false },
);

const RealtimeVoicePanel = dynamic(
  () => import("@/components/realtime-voice-panel").then((mod) => mod.RealtimeVoicePanel),
  { ssr: false },
);

const Sidebar = dynamic(
  () => import("@/components/sidebar").then((mod) => mod.Sidebar),
  { ssr: false },
);

interface ChatAppProps {
  surface: "voice" | "chat";
}

const BOOTSTRAP_SESSION_ID = "bootstrap-session";
const BOOTSTRAP_TIMESTAMP = "2026-01-01T00:00:00.000Z";

function createBootstrapSession(language: ChatSession["language"] = "english"): ChatSession {
  return {
    id: BOOTSTRAP_SESSION_ID,
    title: "New conversation",
    createdAt: BOOTSTRAP_TIMESTAMP,
    updatedAt: BOOTSTRAP_TIMESTAMP,
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

export function ChatApp({ surface }: ChatAppProps) {
  const { isUrdu, language: siteLanguage, hydrated: siteLanguageHydrated } = useSiteLanguage();
  const [storageReady, setStorageReady] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([createBootstrapSession()]);
  const [activeChatId, setActiveChatId] = useState(BOOTSTRAP_SESSION_ID);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rememberOnDevice, setRememberOnDevice] = useState(
    DEFAULT_LOCAL_PRIVACY_PREFERENCES.rememberOnDevice,
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    realtimeConfigured: false,
    serverKeyConfigured: false,
  });

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
        const fallbackSession = createChatSession("adaptive", siteLanguage);
        setSessions([fallbackSession]);
        setActiveChatId(fallbackSession.id);
        return;
      }

      const storedSessions = safeStorageGet(CHAT_SESSIONS_STORAGE_KEY);
      const storedActiveChatId = safeStorageGet(ACTIVE_CHAT_STORAGE_KEY);
      const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];
      const nextSessions =
        parsedSessions.length > 0
          ? normalizeChatSessions(parsedSessions)
          : [createChatSession("adaptive", siteLanguage)];
      const nextActiveChatId =
        storedActiveChatId && nextSessions.some((session) => session.id === storedActiveChatId)
          ? storedActiveChatId
          : nextSessions[0].id;

      setSessions(nextSessions);
      setActiveChatId(nextActiveChatId);
    } catch {
      const fallbackSession = createChatSession("adaptive", siteLanguage);
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      setSessions([fallbackSession]);
      setActiveChatId(fallbackSession.id);
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
      .then((status) => setRuntimeStatus(status))
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
    if (!storageReady) {
      return;
    }

    if (!rememberOnDevice) {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      return;
    }

    safeStorageSet(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    safeStorageSet(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
  }, [activeChatId, rememberOnDevice, sessions, storageReady]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeChatId) ?? null,
    [activeChatId, sessions],
  );

  function handleNewChat() {
    const nextSession = createChatSession("adaptive", activeSession?.language ?? siteLanguage);

    startTransition(() => {
      setSessions((current) =>
        [nextSession, ...current.filter((session) => session.id !== nextSession.id)].slice(0, 50),
      );
      setActiveChatId(nextSession.id);
      setSidebarOpen(false);
    });
  }

  function handleSelectChat(chatId: string) {
    setActiveChatId(chatId);
    setSidebarOpen(false);
  }

  function handleDeleteChat(chatId: string) {
    setSessions((current) => {
      const filtered = current.filter((session) => session.id !== chatId);

      if (filtered.length === 0) {
        const replacement = createChatSession("adaptive", activeSession?.language ?? siteLanguage);
        setActiveChatId(replacement.id);
        return [replacement];
      }

      if (activeChatId === chatId) {
        setActiveChatId(filtered[0].id);
      }

      return filtered;
    });
  }

  const patchSession = useCallback(
    (chatId: string, patch: Partial<ChatSession>) => {
      setSessions((current) =>
        current.map((session) => {
          if (session.id !== chatId) {
            return session;
          }

          const nextSession: ChatSession = {
            ...session,
            ...patch,
            updatedAt: new Date().toISOString(),
          };

          return {
            ...nextSession,
            title: deriveSessionTitle(nextSession),
          };
        }),
      );
    },
    [],
  );

  const handleMessagesChange = useCallback(
    (chatId: string, nextMessages: ChatSession["messages"]) => {
      patchSession(chatId, { messages: nextMessages });
    },
    [patchSession],
  );

  const handleVoiceTranscriptChange = useCallback(
    (chatId: string, voiceTranscript: VoiceTranscriptEntry[]) => {
      patchSession(chatId, { voiceTranscript });
    },
    [patchSession],
  );

  const handlePreferredNameChange = useCallback(
    (chatId: string, preferredName: string) => {
      patchSession(chatId, { preferredName });
    },
    [patchSession],
  );

  function handleLanguageChange(language: ChatSession["language"]) {
    if (!activeSession) {
      return;
    }

    patchSession(activeSession.id, { language });
  }

  function handleRememberOnDeviceChange(nextValue: boolean) {
    setRememberOnDevice(nextValue);

    if (!nextValue) {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
    }
  }

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] px-4 py-6 sm:px-6 lg:px-8">
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
            <div className={`mt-5 text-lg font-semibold text-slate-900 ${isUrdu ? "font-urdu" : ""}`}>
              {isUrdu ? "ولنگ ویز اے آئی تیار ہو رہی ہے" : "Willing Ways AI is getting ready"}
            </div>
            <div
              className={`mx-auto mt-2 max-w-md text-sm leading-7 text-slate-500 ${
                isUrdu ? "font-urdu" : ""
              }`}
            >
              {isUrdu
                ? "چند لمحوں میں آپ پرسکون آواز یا ٹیکسٹ سپورٹ شروع کر سکیں گے۔"
                : "In a few seconds, you can start calm voice or text support."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const alternateAction =
    surface === "voice"
      ? {
          href: "/chat",
          icon: MessageSquare,
          label: isUrdu ? "ڈاکٹر صداقت GPT کھولیں" : "Open Dr Sadaqat GPT",
        }
      : {
          href: "/",
          icon: PhoneCall,
          label: isUrdu ? "واپس اے آئی کال پر جائیں" : "Back to the AI call",
        };
  const AlternateActionIcon = alternateAction.icon;
  const voiceSurface = surface === "voice";

  const rootClass = voiceSurface ? "h-[100dvh] overflow-hidden" : "min-h-screen";

  return (
    <div className={`bg-[linear-gradient(180deg,#f7f7f5_0%,#f3f2ee_100%)] text-slate-950 ${rootClass}`}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.04),_transparent_26%)]" />
      {surface === "chat" ? (
        <Sidebar
          activeChatId={activeChatId}
          open={sidebarOpen}
          sessions={sessions}
          onDeleteChat={handleDeleteChat}
          onNewChat={handleNewChat}
          onOpenChange={setSidebarOpen}
          onSelectChat={handleSelectChat}
        />
      ) : null}

      <div
        className={`relative mx-auto flex w-full flex-col ${
          voiceSurface
            ? "h-full max-w-[1200px] overflow-hidden px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-3"
            : "min-h-[100dvh] max-w-5xl px-3 py-3 sm:px-5 sm:py-5"
        }`}
      >
        <header
          className={`border bg-white/88 px-4 py-4 backdrop-blur sm:px-6 ${
            voiceSurface
              ? "rounded-[24px] border-slate-200/80 bg-white/82 px-3 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] sm:px-4 sm:py-3"
              : "rounded-[30px] border-white/80 shadow-[0_18px_60px_rgba(47,24,32,0.08)]"
          }`}
        >
          {voiceSurface ? (
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/"
                  aria-label="Go to Willing Ways AI home"
                  className="flex min-w-0 items-center gap-3"
                >
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={320}
                    height={80}
                    className="h-7 w-auto max-w-[148px] object-contain sm:h-8 sm:max-w-[172px]"
                    priority
                    sizes="(max-width: 640px) 148px, 172px"
                  />
                  <div className="hidden min-w-0 sm:block">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Willing Ways AI
                    </div>
                    <div className="text-sm text-slate-600">
                      {isUrdu ? "پرسکون اے آئی کال" : "A calmer AI counseling call"}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    href="/chat"
                    className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 md:inline-flex"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                      {isUrdu ? "Dr Sadaqat GPT" : "Dr Sadaqat GPT"}
                    </span>
                  </Link>
                  <LanguageToggle
                    language={activeSession.language}
                    onChange={handleLanguageChange}
                    compact
                    className="w-[116px] shrink-0"
                  />
                  <PrivacyDeviceToggle
                    checked={rememberOnDevice}
                    compact
                    isUrdu={isUrdu}
                    onCheckedChange={handleRememberOnDeviceChange}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-slate-500">
                <p
                  className={`min-w-0 flex-1 leading-5 ${isUrdu ? "font-urdu text-right" : ""}`}
                  dir={isUrdu ? "rtl" : "ltr"}
                >
                  {isUrdu
                    ? "ایک آسان ون ونڈو اے آئی کال جو پہلے سنتی ہے، پھر واضح اگلا قدم دیتی ہے۔"
                    : "One simple AI call window that listens first and then gives one clear next step."}
                </p>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition hover:text-slate-950 md:hidden"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {isUrdu ? "ٹیکسٹ GPT" : "Text GPT"}
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={isUrdu ? "پچھلی گفتگو کھولیں" : "Open conversation history"}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <Link href="/" aria-label="Go to Willing Ways AI home" className="flex min-w-0 items-center gap-3">
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={320}
                    height={80}
                    className="h-10 w-auto max-w-[170px] object-contain sm:h-11 sm:max-w-[220px]"
                    priority
                    sizes="(max-width: 640px) 170px, 220px"
                  />
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <Link href={alternateAction.href} className="site-action-link hidden sm:inline-flex">
                  <AlternateActionIcon className="h-4 w-4" />
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {alternateAction.label}
                  </span>
                </Link>
                <a
                  href={WILLING_WAYS_HELPLINE_HREF}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <PhoneCall className="h-4 w-4" />
                  {WILLING_WAYS_HELPLINE_DISPLAY}
                </a>
                <LanguageToggle language={activeSession.language} onChange={handleLanguageChange} />
                <PrivacyDeviceToggle
                  checked={rememberOnDevice}
                  compact
                  isUrdu={isUrdu}
                  onCheckedChange={handleRememberOnDeviceChange}
                />
              </div>
            </div>
          )}

          {surface === "chat" ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div
                className={`${isUrdu ? "font-urdu text-right" : ""}`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {isUrdu ? "ڈاکٹر صداقت GPT" : "Dr Sadaqat GPT"}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950 sm:text-[1.35rem]">
                  {isUrdu
                    ? "اگر بولنا آسان نہ ہو تو یہاں ڈاکٹر صداقت GPT سے بات کریں"
                    : "Talk to Dr Sadaqat GPT here if speaking is not easy right now"}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  {isUrdu
                    ? "یہ خاموش reflection، classroom teaching اور family guidance کے لئے زیادہ موزوں text space ہے۔"
                    : "This is the calmer text space for reflection, classroom teaching, and family guidance."}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
                <Link href={alternateAction.href} className="site-action-link sm:hidden">
                  <AlternateActionIcon className="h-4 w-4" />
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {isUrdu ? "اے آئی کال" : "AI call"}
                  </span>
                </Link>
              </div>
            </div>
          ) : null}
        </header>

        <main className={`min-h-0 flex-1 ${voiceSurface ? "mt-2" : "mt-4"}`}>
          {surface === "voice" ? (
            <RealtimeVoicePanel
              key={`${activeSession.id}:voice:${activeSession.language}`}
              bookingConfigured={Boolean(runtimeStatus.bookingConfigured)}
              enabled={runtimeStatus.realtimeConfigured}
              language={activeSession.language}
              mode={activeSession.mode}
              preferredName={activeSession.preferredName ?? ""}
              sessionId={activeSession.id}
              transcript={activeSession.voiceTranscript}
              onPreferredNameChange={handlePreferredNameChange}
              onTranscriptChange={handleVoiceTranscriptChange}
            />
          ) : (
            <div className="surface-panel chat-shell overflow-hidden border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <ChatPane
                key={`${activeSession.id}:chat:${activeSession.language}`}
                modelId={DEFAULT_CHAT_MODEL_ID}
                onMessagesChange={handleMessagesChange}
                onPreferredNameChange={handlePreferredNameChange}
                serverKeyConfigured={runtimeStatus.serverKeyConfigured}
                session={activeSession}
              />
            </div>
          )}
        </main>

        {voiceSurface ? null : (
          <footer className="px-1 py-5 text-center text-sm text-slate-600">
            <div className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
              {isUrdu
                ? "اگر معاملہ فوری ہو تو 1122 یا 0300-7413639 پر فوراً رابطہ کریں۔"
                : "For emergencies, contact 1122 or 0300-7413639 immediately."}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
              <a href={DR_ZARAK_PHONE_HREF} className="site-inline-link">
                <PhoneCall className="h-4 w-4" />
                {DR_ZARAK_NAME} · {DR_ZARAK_PHONE_DISPLAY}
              </a>
              <a
                href={DR_ZARAK_LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className="site-inline-link"
              >
                <ExternalLink className="h-4 w-4" />
                LinkedIn
              </a>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
