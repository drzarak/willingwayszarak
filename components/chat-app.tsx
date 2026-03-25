"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, MessageSquare, PhoneCall } from "lucide-react";
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
import { SITE_MEDIA } from "@/lib/site-assets";

import { ChatPane } from "@/components/chat-pane";
import { LanguageToggle } from "@/components/language-toggle";
import { RealtimeVoicePanel } from "@/components/realtime-voice-panel";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

interface ChatAppProps {
  surface: "voice" | "chat";
}

export function ChatApp({ surface }: ChatAppProps) {
  const { isUrdu, language: siteLanguage, hydrated: siteLanguageHydrated } = useSiteLanguage();
  const [hydrated, setHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    realtimeConfigured: false,
    serverKeyConfigured: false,
  });

  useEffect(() => {
    if (!siteLanguageHydrated || hydrated) {
      return;
    }

    const storedSessions = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    const storedActiveChatId = window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
    const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];
    const nextSessions =
      parsedSessions.length > 0
        ? normalizeChatSessions(parsedSessions)
        : [createChatSession("adaptive", siteLanguage)];
    const nextActiveChatId =
      storedActiveChatId && nextSessions.some((session) => session.id === storedActiveChatId)
        ? storedActiveChatId
        : nextSessions[0].id;

    window.localStorage.removeItem(APP_SETTINGS_STORAGE_KEY);
    setSessions(nextSessions);
    setActiveChatId(nextActiveChatId);
    setHydrated(true);
  }, [hydrated, siteLanguage, siteLanguageHydrated]);

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
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
  }, [activeChatId, hydrated, sessions]);

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

  if (!hydrated || !activeSession) {
    return (
      <div className="min-h-screen bg-[#f5f4ef] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[84vh] max-w-4xl items-center justify-center rounded-[32px] border border-white/70 bg-white/88 px-6 py-10 shadow-[0_18px_60px_rgba(47,24,32,0.08)]">
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
          label: isUrdu ? "اگر چاہیں تو ٹیکسٹ چیٹ" : "Prefer typing? Open text chat",
        }
      : {
          href: "/",
          icon: PhoneCall,
          label: isUrdu ? "واپس اے آئی کال پر جائیں" : "Back to the AI call",
        };
  const AlternateActionIcon = alternateAction.icon;
  const voiceSurface = surface === "voice";

  return (
    <div className="min-h-[100dvh] bg-[#f6f5f1] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(101,19,40,0.04),_transparent_24%)]" />
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
        className={`relative mx-auto flex min-h-[100dvh] w-full flex-col px-3 py-3 sm:px-5 sm:py-5 ${
          voiceSurface ? "max-w-4xl" : "max-w-5xl"
        }`}
      >
        <header
          className={`border bg-white/88 px-4 py-4 backdrop-blur sm:px-6 ${
            voiceSurface
              ? "rounded-[26px] border-black/5 shadow-[0_12px_36px_rgba(15,23,42,0.06)]"
              : "rounded-[30px] border-white/80 shadow-[0_18px_60px_rgba(47,24,32,0.08)]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {surface === "chat" ? (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : null}

              <Link href="/" className="flex min-w-0 items-center gap-3">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={320}
                  height={80}
                  className={`w-auto object-contain ${
                    voiceSurface ? "h-9 max-w-[150px] sm:h-10 sm:max-w-[190px]" : "h-10 max-w-[170px] sm:h-11 sm:max-w-[220px]"
                  }`}
                  unoptimized
                  priority
                />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {surface === "chat" ? (
                <Link href={alternateAction.href} className="site-action-link hidden sm:inline-flex">
                  <AlternateActionIcon className="h-4 w-4" />
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {alternateAction.label}
                  </span>
                </Link>
              ) : null}
              <a
                href="tel:+923007413639"
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  voiceSurface
                    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-[#ead6dc] bg-[#fff8fa] text-[#651328] hover:bg-[#fff1f4]"
                }`}
              >
                <PhoneCall className="h-4 w-4" />
                0300-7413639
              </a>
              <LanguageToggle language={activeSession.language} onChange={handleLanguageChange} />
            </div>
          </div>

          {surface === "chat" ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div
                className={`${isUrdu ? "font-urdu text-right" : ""}`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  {isUrdu ? "ٹیکسٹ چیٹ" : "Text chat"}
                </div>
                <div className="mt-2 text-lg font-semibold text-slate-950 sm:text-[1.35rem]">
                  {isUrdu ? "اگر بات کرنا آسان نہ ہو تو یہاں لکھیں" : "Type here if speaking is not easy right now"}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">
                  {isUrdu
                    ? "اگر آپ خاموشی سے اپنی بات لکھنا چاہیں تو یہی دوسرا آسان راستہ ہے۔"
                    : "If you would rather type quietly, this is the simpler second route."}
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

        <main className={`flex-1 ${voiceSurface ? "mt-6" : "mt-4"}`}>
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
            <div className="surface-panel chat-shell overflow-hidden border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(47,24,32,0.08)]">
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

        <footer className={`px-1 py-5 text-center ${voiceSurface ? "text-sm text-slate-500" : "text-sm text-slate-500"}`}>
          <div className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
            {isUrdu
              ? "اگر معاملہ فوری ہو تو 1122 یا 0300-7413639 پر فوراً رابطہ کریں۔"
              : "For emergencies, contact 1122 or 0300-7413639 immediately."}
          </div>
          <div className="mt-2 text-sm font-medium text-slate-400">
            {isUrdu ? "محبت سے تعمیر: ڈاکٹر زارک خان" : "Built with love by Dr Zarak Khan"}
          </div>
        </footer>
      </div>
    </div>
  );
}
