"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LayoutDashboard, PhoneCall } from "lucide-react";
import { useEffect, useState } from "react";

import {
  ACTIVE_CHAT_STORAGE_KEY,
  CHAT_SESSIONS_STORAGE_KEY,
  createChatSession,
  normalizeChatSessions,
  type ChatSession,
  type RuntimeStatus,
  type TextChatAudience,
  type VoiceTranscriptEntry,
} from "@/lib/chat";
import {
  DEFAULT_LOCAL_PRIVACY_PREFERENCES,
  LOCAL_PRIVACY_STORAGE_KEY,
  normalizeLocalPrivacyPreferences,
} from "@/lib/privacy";
import { SITE_MEDIA } from "@/lib/site-assets";
import { WILLING_WAYS_HELPLINE_DISPLAY, WILLING_WAYS_HELPLINE_HREF } from "@/lib/site-contact";
import { safeStorageGet, safeStorageRemove, safeStorageSet } from "@/lib/utils";

import { LanguageToggle } from "@/components/language-toggle";
import { PrivacyDeviceToggle } from "@/components/privacy-device-toggle";
import { useSiteLanguage } from "@/components/site-language-provider";

const RealtimeVoicePanel = dynamic(
  () => import("@/components/realtime-voice-panel").then((mod) => mod.RealtimeVoicePanel),
  {
    ssr: false,
    loading: () => <VoiceSurfaceLoading isUrdu={false} />,
  },
);

interface ChatAppProps {
  initialRuntimeStatus?: RuntimeStatus;
}

function VoiceSurfaceLoading({ isUrdu }: { isUrdu: boolean }) {
  return (
    <section className="mx-auto h-full max-w-[1120px]">
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-black/5 bg-white/96 px-3 py-3 shadow-[0_24px_80px_rgba(15,23,42,0.07)] backdrop-blur sm:px-6 sm:py-5">
        <div className="mx-auto flex h-full w-full max-w-[920px] flex-col justify-center">
          <div
            className={`mx-auto text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 ${
              isUrdu ? "font-urdu" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu ? "ولنگ ویز اے آئی کاؤنسلر" : "Willing Ways AI counselor"}
          </div>
          <div
            className={`mx-auto mt-4 max-w-[720px] text-center text-[1.7rem] font-semibold leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-[2.7rem] ${
              isUrdu ? "font-urdu" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "ابھی بات کریں، سکون لیں، اور اگلا درست قدم واضح کریں"
              : "Talk now, settle the moment, and get the next right step."}
          </div>
          <div
            className={`mx-auto mt-3 max-w-[620px] text-center text-sm leading-7 text-slate-600 ${
              isUrdu ? "font-urdu" : ""
            }`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "24/7 ریلیپس سپورٹ، فیملی گائیڈنس، اور ڈاکٹر کے لئے واضح brief۔"
              : "24/7 relapse support, family guidance, and a doctor-ready brief."}
          </div>
          <div className="mx-auto mt-8 h-40 w-40 rounded-full border border-slate-200 bg-[radial-gradient(circle_at_30%_24%,rgba(255,255,255,0.98),rgba(241,245,249,0.96))] shadow-[0_18px_42px_rgba(15,23,42,0.08)] sm:h-44 sm:w-44" />
          <div
            className={`mt-4 text-center text-sm text-slate-500 ${isUrdu ? "font-urdu" : ""}`}
            dir={isUrdu ? "rtl" : "ltr"}
          >
            {isUrdu
              ? "ولنگ ویز اے آئی کال تیار کی جا رہی ہے..."
              : "Preparing the Willing Ways AI call..."}
          </div>
          <div className="mx-auto mt-5 flex max-w-[720px] flex-wrap items-center justify-center gap-2">
            {[
              isUrdu ? "فیملی گائیڈنس" : "Family guidance",
              isUrdu ? "24/7 وائس سپورٹ" : "24/7 voice support",
              isUrdu ? "ڈاکٹر کے لئے brief" : "Doctor-ready brief",
            ].map((item) => (
              <div
                key={item}
                className={`rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ${
                  isUrdu ? "font-urdu" : ""
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function getStoredVoiceSession(siteLanguage: ChatSession["language"]) {
  const storedSessions = safeStorageGet(CHAT_SESSIONS_STORAGE_KEY);
  const storedActiveChatId = safeStorageGet(ACTIVE_CHAT_STORAGE_KEY);
  const parsedSessions = storedSessions ? (JSON.parse(storedSessions) as ChatSession[]) : [];
  const normalizedSessions = normalizeChatSessions(parsedSessions);
  const activeSession =
    normalizedSessions.find((session) => session.id === storedActiveChatId) ??
    normalizedSessions[0] ??
    createChatSession("adaptive", siteLanguage);

  return {
    ...activeSession,
    messages: [],
    textAudience: "patient" as TextChatAudience,
  };
}

export function ChatApp({ initialRuntimeStatus }: ChatAppProps) {
  const { isUrdu, language: siteLanguage, hydrated: siteLanguageHydrated } = useSiteLanguage();
  const [storageReady, setStorageReady] = useState(false);
  const [rememberOnDevice, setRememberOnDevice] = useState(
    DEFAULT_LOCAL_PRIVACY_PREFERENCES.rememberOnDevice,
  );
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus>(
    initialRuntimeStatus ?? {
      realtimeConfigured: false,
      serverKeyConfigured: false,
    },
  );
  const [session, setSession] = useState<ChatSession>(() => createChatSession("adaptive", "english"));

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

      if (privacyPreferences.rememberOnDevice) {
        setSession(getStoredVoiceSession(siteLanguage));
      } else {
        safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
        safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
        setSession(createChatSession("adaptive", siteLanguage));
      }
    } catch {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      setSession(createChatSession("adaptive", siteLanguage));
    } finally {
      setStorageReady(true);
    }
  }, [siteLanguage, siteLanguageHydrated, storageReady]);

  useEffect(() => {
    if (initialRuntimeStatus) {
      return;
    }

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
  }, [initialRuntimeStatus]);

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

    safeStorageSet(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify([session]));
    safeStorageSet(ACTIVE_CHAT_STORAGE_KEY, session.id);
  }, [rememberOnDevice, session, storageReady]);

  function handleLanguageChange(language: ChatSession["language"]) {
    setSession((current) => ({
      ...current,
      language,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handlePreferredNameChange(_chatId: string, preferredName: string) {
    setSession((current) => ({
      ...current,
      preferredName,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleTranscriptChange(_chatId: string, voiceTranscript: VoiceTranscriptEntry[]) {
    setSession((current) => ({
      ...current,
      voiceTranscript,
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleRememberOnDeviceChange(nextValue: boolean) {
    setRememberOnDevice(nextValue);

    if (!nextValue) {
      safeStorageRemove(CHAT_SESSIONS_STORAGE_KEY);
      safeStorageRemove(ACTIVE_CHAT_STORAGE_KEY);
      setSession(createChatSession("adaptive", session.language));
    }
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-[linear-gradient(180deg,#f7f7f5_0%,#f3f2ee_100%)] text-slate-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.04),_transparent_26%)]" />

      <div className="relative mx-auto flex h-full w-full max-w-[1220px] flex-col overflow-hidden px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-3">
        <header className="rounded-[24px] border border-slate-200/80 bg-white/84 px-3 py-2.5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] backdrop-blur sm:px-4 sm:py-3">
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
                    {isUrdu ? "24/7 پرسکون اے آئی کاؤنسلر" : "24/7 calmer AI counselor"}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  href="/for-centers"
                  className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 lg:inline-flex"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>{isUrdu ? "ریحاب سینٹرز" : "For centers"}</span>
                </Link>
                <Link
                  href="/family-training"
                  className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 md:inline-flex"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className={isUrdu ? "font-urdu" : ""} dir={isUrdu ? "rtl" : "ltr"}>
                    {isUrdu ? "فیملی کوچنگ" : "Family coaching"}
                  </span>
                </Link>
                <Link
                  href="/login"
                  className="hidden items-center gap-2 rounded-full border border-slate-200/90 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-950 md:inline-flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>{isUrdu ? "اسٹاف لاگ اِن" : "Staff login"}</span>
                </Link>
                <LanguageToggle
                  language={session.language}
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
                  ? "مریضوں اور گھر والوں کے لئے 24/7 ریلیپس سپورٹ، فیملی گائیڈنس، اور ڈاکٹر کے لئے واضح بریف۔"
                  : "24/7 relapse support, family guidance, and a doctor-ready brief from one calm call."}
              </p>
              <a
                href={WILLING_WAYS_HELPLINE_HREF}
                className="inline-flex items-center gap-1.5 font-medium text-slate-600 transition hover:text-slate-950"
              >
                <PhoneCall className="h-4 w-4" />
                {WILLING_WAYS_HELPLINE_DISPLAY}
              </a>
            </div>
          </div>
        </header>

        <main className="mt-2 min-h-0 flex-1">
          <RealtimeVoicePanel
            key={`${session.id}:voice:${session.language}`}
            bookingConfigured={Boolean(runtimeStatus.bookingConfigured)}
            enabled={runtimeStatus.realtimeConfigured}
            language={session.language}
            mode={session.mode}
            preferredName={session.preferredName ?? ""}
            sessionId={session.id}
            transcript={session.voiceTranscript}
            onPreferredNameChange={handlePreferredNameChange}
            onTranscriptChange={handleTranscriptChange}
          />
        </main>
      </div>
    </div>
  );
}
