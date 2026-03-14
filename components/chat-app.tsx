"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, Settings2 } from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  APP_SETTINGS_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  DEFAULT_SETTINGS,
  createChatSession,
  deriveChatTitle,
  normalizeChatSessions,
  type AppSettings,
  type ChatLanguage,
  type ChatMode,
  type ChatSession,
  type RuntimeStatus,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

import { ChatPane } from "@/components/chat-pane";
import { LanguageToggle } from "@/components/language-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import { SettingsDialog } from "@/components/settings-dialog";
import { useSiteLanguage } from "@/components/site-language-provider";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";

export function ChatApp() {
  const { isUrdu, language: siteLanguage, hydrated: siteLanguageHydrated } = useSiteLanguage();
  const [hydrated, setHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({
    realtimeConfigured: false,
    serverKeyConfigured: false,
  });

  useEffect(() => {
    if (!siteLanguageHydrated || hydrated) {
      return;
    }

    const storedSettings = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    const storedSessions = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    const storedActiveChatId = window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);

    const parsedSettings = storedSettings ? (JSON.parse(storedSettings) as AppSettings) : DEFAULT_SETTINGS;
    const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];

    const nextSessions =
      parsedSessions.length > 0
        ? normalizeChatSessions(parsedSessions)
        : [createChatSession("patient", siteLanguage)];
    const nextActiveChatId =
      storedActiveChatId && nextSessions.some((session) => session.id === storedActiveChatId)
        ? storedActiveChatId
        : nextSessions[0].id;

    setSettings({
      apiKey: parsedSettings.apiKey ?? DEFAULT_SETTINGS.apiKey,
      modelId: parsedSettings.modelId ?? DEFAULT_SETTINGS.modelId,
    });
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

    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    window.localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    window.localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId);
  }, [activeChatId, hydrated, sessions, settings]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeChatId) ?? null,
    [activeChatId, sessions],
  );

  function handleNewChat() {
    const nextSession = createChatSession(
      activeSession?.mode ?? "patient",
      activeSession?.language ?? siteLanguage,
    );

    startTransition(() => {
      setSessions((current) => [nextSession, ...current.filter((session) => session.id !== nextSession.id)].slice(0, 50));
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
        const replacement = createChatSession(
          activeSession?.mode ?? "patient",
          activeSession?.language ?? "english",
        );
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

  function handleModeChange(mode: ChatMode) {
    if (!activeSession) {
      return;
    }

    setSessions((current) =>
      current.map((session) => (session.id === activeSession.id ? { ...session, mode } : session)),
    );
  }

  function handleLanguageChange(language: ChatLanguage) {
    if (!activeSession) {
      return;
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id ? { ...session, language } : session,
      ),
    );
  }

  function handleSaveSettings(nextSettings: AppSettings) {
    setSettings(nextSettings);
    setSettingsRevision((current) => current + 1);
    setSettingsOpen(false);
  }

  if (!hydrated || !activeSession) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-[#d7b3bf]/35 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#f0dce2]/40 blur-3xl" />
        <div className="mx-auto max-w-7xl animate-fade-up">
          <div className="glass-panel h-[88vh] rounded-[36px] p-6" />
        </div>
      </div>
    );
  }

  const chatPaneKey = `${activeSession.id}:${activeSession.mode}:${activeSession.language}:${settingsRevision}`;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url('${SITE_MEDIA.facilities.karachiExterior}')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#d7b3bf]/35 blur-3xl animate-float" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[#f2dee4]/40 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-10 right-[24%] h-56 w-56 rounded-full bg-[#ecd1d9]/28 blur-3xl" />

      <Sidebar
        activeChatId={activeChatId}
        open={sidebarOpen}
        sessions={sessions}
        onDeleteChat={handleDeleteChat}
        onNewChat={handleNewChat}
        onOpenChange={setSidebarOpen}
        onSelectChat={handleSelectChat}
      />

      <div className="lg:pl-[320px]">
        <header className="sticky top-0 z-20 border-b border-[#e6d8db] bg-white/96 shadow-sm backdrop-blur-xl">
          <div className="border-b border-[#571223] bg-[#651328] px-3 py-2 text-white sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
                {isUrdu ? "ولنگ ویز اے آئی" : "Willing Ways AI"}
              </div>
              <div
                className={`hidden text-xs text-white/75 sm:block ${isUrdu ? "font-urdu text-right" : ""}`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu ? "انگریزی، اردو، وائس اور چیٹ" : "English, Urdu, voice, and chat"}
              </div>
            </div>
          </div>

          <div className="px-3 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  variant="surface"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <Link href="/" className="flex min-w-0 items-center gap-3">
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={320}
                    height={80}
                    className="h-10 w-auto max-w-[170px] object-contain sm:h-12 sm:max-w-[240px]"
                    unoptimized
                    priority
                  />
                  <div className="hidden rounded-full border border-[#ead6dc] bg-[#fff8f9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#651328] sm:inline-flex">
                    AI
                  </div>
                </Link>
              </div>

              <Button variant="surface" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">Open settings</span>
              </Button>
            </div>

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div
                className={`hidden text-sm text-[#6d4452] lg:block ${
                  isUrdu ? "font-urdu text-right" : ""
                }`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                {isUrdu
                  ? "داخلہ، intervention، family guidance، یا psychiatric support کے لیے بات کریں۔"
                  : "Use chat for admissions, interventions, family guidance, and psychiatric support questions."}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
                <ModeToggle mode={activeSession.mode} onChange={handleModeChange} />
                <LanguageToggle language={activeSession.language} onChange={handleLanguageChange} />
              </div>
            </div>
          </div>
        </header>

        <main className="px-3 pb-3 pt-3 sm:px-6 lg:px-8">
          <div className="surface-panel chat-shell overflow-hidden">
            <ChatPane
              key={chatPaneKey}
              apiKey={settings.apiKey}
              modelId={settings.modelId}
              onMessagesChange={handleMessagesChange}
              onOpenSettings={() => setSettingsOpen(true)}
              realtimeConfigured={runtimeStatus.realtimeConfigured}
              serverKeyConfigured={runtimeStatus.serverKeyConfigured}
              session={activeSession}
            />
          </div>
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        serverKeyConfigured={runtimeStatus.serverKeyConfigured}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
