"use client";

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

import { ChatPane } from "@/components/chat-pane";
import { LanguageToggle } from "@/components/language-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import { SettingsDialog } from "@/components/settings-dialog";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { WelcomeDialog } from "@/components/welcome-dialog";

export function ChatApp() {
  const [hydrated, setHydrated] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>({ serverKeyConfigured: false });

  useEffect(() => {
    const storedSettings = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    const storedSessions = window.localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    const storedActiveChatId = window.localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);

    const parsedSettings = storedSettings ? (JSON.parse(storedSettings) as AppSettings) : DEFAULT_SETTINGS;
    const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];

    const nextSessions =
      parsedSessions.length > 0 ? normalizeChatSessions(parsedSessions) : [createChatSession("patient")];
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
  }, []);

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
        setRuntimeStatus({ serverKeyConfigured: false });
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

  useEffect(() => {
    if (!hydrated || !activeSession) {
      return;
    }

    setWelcomeOpen(!activeSession.welcomed);
  }, [activeSession, hydrated]);

  function handleNewChat() {
    const nextSession = createChatSession(
      activeSession?.mode ?? "patient",
      activeSession?.language ?? "english",
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

  function handleWelcomeConfirm() {
    if (!activeSession) {
      return;
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id ? { ...session, welcomed: true } : session,
      ),
    );
    setWelcomeOpen(false);
  }

  function handleSaveSettings(nextSettings: AppSettings) {
    setSettings(nextSettings);
    setSettingsRevision((current) => current + 1);
    setSettingsOpen(false);
  }

  if (!hydrated || !activeSession) {
    return (
      <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="absolute -left-24 top-16 h-64 w-64 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-teal-200/40 blur-3xl" />
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
          backgroundImage: "url('/images/medical-bg.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      />
      <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl animate-float" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-teal-200/40 blur-3xl animate-float" />
      <div className="pointer-events-none absolute bottom-10 right-[24%] h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />

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
        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="surface"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <div className="truncate text-xs font-semibold uppercase tracking-[0.24em] text-primary">
                  Willing Ways AI
                </div>
                <div className="truncate font-serif text-xl font-semibold text-slate-950 sm:text-2xl">
                  Pakistan’s Leading Addiction Treatment & Mental Health Rehabilitation Center
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-3 xl:flex-row xl:items-center">
              <ModeToggle mode={activeSession.mode} onChange={handleModeChange} />
              <LanguageToggle language={activeSession.language} onChange={handleLanguageChange} />
              <Button variant="surface" size="icon" onClick={() => setSettingsOpen(true)}>
                <Settings2 className="h-5 w-5" />
                <span className="sr-only">Open settings</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-4 pt-4 sm:px-6 lg:px-8">
          <div className="surface-panel chat-shell overflow-hidden">
            <ChatPane
              key={chatPaneKey}
              apiKey={settings.apiKey}
              modelId={settings.modelId}
              onMessagesChange={handleMessagesChange}
              onOpenSettings={() => setSettingsOpen(true)}
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

      <WelcomeDialog
        mode={activeSession.mode}
        open={welcomeOpen}
        onConfirm={handleWelcomeConfirm}
        serverKeyConfigured={runtimeStatus.serverKeyConfigured}
      />
    </div>
  );
}
