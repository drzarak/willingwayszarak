"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
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
      <div className="min-h-screen bg-[#f6f7f4] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto h-[84vh] max-w-5xl rounded-[32px] border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  const tabs = [
    {
      href: "/ai",
      icon: PhoneCall,
      label: isUrdu ? "کال" : "Call",
    },
    {
      href: "/ai/chat",
      icon: MessageSquare,
      label: isUrdu ? "چیٹ" : "Chat",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-slate-950">
      <Sidebar
        activeChatId={activeChatId}
        open={sidebarOpen}
        sessions={sessions}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
        onOpenChange={setSidebarOpen}
        onSelectChat={handleSelectChat}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-3 py-3 sm:px-6 sm:py-5">
        <header className="rounded-[28px] border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>

              <Link href="/" className="flex min-w-0 items-center gap-3">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={320}
                  height={80}
                  className="h-10 w-auto max-w-[170px] object-contain sm:h-11 sm:max-w-[220px]"
                  unoptimized
                  priority
                />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <a
                href="tel:+923007413639"
                className="inline-flex items-center gap-2 rounded-full border border-[#ead6dc] bg-[#fff8fa] px-4 py-2 text-sm font-semibold text-[#651328] transition hover:bg-[#fff1f4]"
              >
                <PhoneCall className="h-4 w-4" />
                0300-7413639
              </a>
              <LanguageToggle language={activeSession.language} onChange={handleLanguageChange} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div
              className={`${isUrdu ? "font-urdu text-right" : ""}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              <div className="text-lg font-semibold text-slate-950">
                {surface === "voice"
                  ? isUrdu
                    ? "سکون سے بات کرنے کے لئے ولنگ ویز اے آئی کال"
                    : "A calmer voice-first Willing Ways AI call"
                  : isUrdu
                    ? "آسان اور صاف ولنگ ویز اے آئی چیٹ"
                    : "A simpler, cleaner Willing Ways AI chat"}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                {surface === "voice"
                  ? isUrdu
                    ? "کال، waveform، saved transcript اور نام کی continuity کے ساتھ۔"
                    : "Voice-first support with a calmer call screen, saved transcript, and name continuity."
                  : isUrdu
                    ? "صرف ٹیکسٹ چیٹ کے لئے الگ صفحہ، تاکہ پڑھنا اور ٹائپ کرنا آسان رہے۔"
                    : "A separate text-only page so reading and typing stay easy on the mind."}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
              <div className="inline-flex rounded-full border border-slate-200 bg-[#fafaf8] p-1">
                {tabs.map((tab) => {
                  const active = pathname === tab.href;
                  const Icon = tab.icon;

                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-[#651328] text-white shadow-sm"
                          : "text-slate-600 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </Link>
                  );
                })}
              </div>
              <div
                className={`text-xs font-semibold tracking-[0.14em] text-slate-500 ${
                  isUrdu ? "font-urdu text-right normal-case" : "uppercase"
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu ? "محبت سے تعمیر: ڈاکٹر زارک خان" : "Built with love by Dr Zarak Khan"}
              </div>
            </div>
          </div>
        </header>

        <main className="mt-3 flex-1">
          <div className="surface-panel chat-shell overflow-hidden">
            {surface === "voice" ? (
              <div className="px-4 py-4 sm:px-6 sm:py-6">
                <div className="mx-auto max-w-5xl">
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
                </div>
              </div>
            ) : (
              <ChatPane
                key={`${activeSession.id}:chat:${activeSession.language}`}
                modelId={DEFAULT_CHAT_MODEL_ID}
                onMessagesChange={handleMessagesChange}
                onPreferredNameChange={handlePreferredNameChange}
                serverKeyConfigured={runtimeStatus.serverKeyConfigured}
                session={activeSession}
              />
            )}
          </div>
        </main>

        <footer className="px-1 py-4 text-center text-sm text-slate-500">
          <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
            {isUrdu
              ? "اگر معاملہ فوری ہو تو 1122 یا 0300-7413639 پر فوراً رابطہ کریں۔"
              : "For emergencies, contact 1122 or 0300-7413639 immediately."}
          </span>
        </footer>
      </div>
    </div>
  );
}
