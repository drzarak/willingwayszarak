"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, PhoneCall } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  APP_SETTINGS_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_CHAT_MODEL_ID,
  createChatSession,
  deriveChatTitle,
  normalizeChatSessions,
  type ChatSession,
  type RuntimeStatus,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

import { ChatPane } from "@/components/chat-pane";
import { LanguageToggle } from "@/components/language-toggle";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

export function ChatApp() {
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

  const handleMessagesChange = useCallback((chatId: string, nextMessages: ChatSession["messages"]) => {
    setSessions((current) =>
      current.map((session) =>
        session.id === chatId
          ? {
              ...session,
              messages: nextMessages,
              title: deriveChatTitle(nextMessages),
              updatedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
  }, []);

  function handleLanguageChange(language: ChatSession["language"]) {
    if (!activeSession) {
      return;
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id ? { ...session, language } : session,
      ),
    );
  }

  if (!hydrated || !activeSession) {
    return (
      <div className="min-h-screen bg-[#f6f7f4] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto h-[84vh] max-w-5xl rounded-[32px] border border-slate-200 bg-white shadow-sm" />
      </div>
    );
  }

  const chatPaneKey = `${activeSession.id}:${activeSession.language}`;

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

          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div
              className={`${isUrdu ? "font-urdu text-right" : ""}`}
              dir={isUrdu ? "rtl" : "ltr"}
            >
              <div className="text-lg font-semibold text-slate-950">
                {isUrdu
                  ? "ایک سادہ ونڈو میں ولنگ ویز اے آئی مدد"
                  : "One simple support window for Willing Ways AI"}
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-600">
                {isUrdu
                  ? "کال یا چیٹ شروع کریں۔ اے آئی خود سمجھے گی کہ آپ مریض ہیں، خاندان ہیں یا ریفرر، پھر اگلا مناسب قدم خود سنبھالے گی۔"
                  : "Start a call or type a message. The AI will figure out whether you are the patient, family, or a referrer, then handle the next useful step for you."}
              </div>
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
        </header>

        <main className="mt-3 flex-1">
          <div className="surface-panel chat-shell overflow-hidden">
            <ChatPane
              key={chatPaneKey}
              bookingConfigured={Boolean(runtimeStatus.bookingConfigured)}
              modelId={DEFAULT_CHAT_MODEL_ID}
              onMessagesChange={handleMessagesChange}
              realtimeConfigured={runtimeStatus.realtimeConfigured}
              serverKeyConfigured={runtimeStatus.serverKeyConfigured}
              session={activeSession}
            />
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
