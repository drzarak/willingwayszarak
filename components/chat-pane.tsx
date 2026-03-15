"use client";

import Image from "next/image";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  LoaderCircle,
  ShieldAlert,
  Sparkles,
  Square,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import {
  getMessageText,
  getSuggestionChips,
  isUrduText,
  type ChatSession,
  type ModelId,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

import { MessageBubble } from "@/components/message-bubble";
import { RealtimeVoicePanel } from "@/components/realtime-voice-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatPaneProps {
  modelId: ModelId;
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
  realtimeConfigured: boolean;
  serverKeyConfigured: boolean;
  session: ChatSession;
}

export function ChatPane({
  modelId,
  onMessagesChange,
  realtimeConfigured,
  serverKeyConfigured,
  session,
}: ChatPaneProps) {
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    prepareSendMessagesRequest: async ({ body, id, messageId, messages, trigger }) => ({
      body: {
        ...body,
        id,
        messages,
        trigger,
        messageId,
        language: session.language,
        modelId,
        mode: session.mode,
      },
    }),
  });

  const { clearError, error, messages, regenerate, sendMessage, status, stop } = useChat({
    id: session.id,
    messages: session.messages,
    experimental_throttle: 50,
    transport,
    onError: (chatError) => {
      setLocalError(chatError.message);
    },
  });

  const deferredMessages = useDeferredValue(messages);
  const isGenerating = status === "submitted" || status === "streaming";
  const currentError = error?.message ?? localError;
  const latestAssistantMessage = [...deferredMessages].reverse().find(
    (message) => message.role === "assistant",
  );
  const inputIsUrdu = session.language === "urdu" || isUrduText(input);
  const suggestionChips = getSuggestionChips(session.language);

  useEffect(() => {
    onMessagesChange(session.id, messages);
  }, [messages, onMessagesChange, session.id]);

  useEffect(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: status === "ready" ? "smooth" : "auto",
    });
  }, [deferredMessages, status]);

  async function submitPrompt(text: string) {
    const nextText = text.trim();

    if (!nextText) {
      return;
    }

    if (!serverKeyConfigured) {
      setLocalError(
        session.language === "urdu"
          ? "اے آئی چیٹ اس وقت عارضی طور پر دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
          : "AI chat is temporarily unavailable right now. Please try again shortly or call 0300-7413639.",
      );
      return;
    }

    try {
      clearError();
      setLocalError(null);
      setInput("");
      await sendMessage({ text: nextText });
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "The message could not be sent right now.",
      );
    }
  }

  async function handleRegenerate() {
    if (!serverKeyConfigured) {
      setLocalError(
        session.language === "urdu"
          ? "اے آئی چیٹ اس وقت عارضی طور پر دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
          : "AI chat is temporarily unavailable right now. Please try again shortly or call 0300-7413639.",
      );
      return;
    }

    try {
      clearError();
      setLocalError(null);
      await regenerate();
    } catch (regenerateError) {
      setLocalError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "The assistant could not regenerate that response.",
      );
    }
  }

  async function handleCopy(text: string) {
    if (!text) {
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    window.setTimeout(() => setCopiedText(null), 1600);
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-6 pt-6 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <RealtimeVoicePanel
            enabled={realtimeConfigured}
            language={session.language}
            mode={session.mode}
          />

          {deferredMessages.length === 0 ? (
            <div className="animate-fade-up py-10">
              <div className="mx-auto max-w-3xl text-center">
                <div className="mx-auto inline-flex items-center rounded-full border border-[#ead6dc] bg-[#fff4f7] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary shadow-sm">
                  <Image
                    src={SITE_MEDIA.logo}
                    alt="Willing Ways"
                    width={108}
                    height={27}
                    className="mr-3 h-5 w-auto object-contain"
                    unoptimized
                  />
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Willing Ways AI
                </div>
                <h2 className="gradient-heading mt-6 font-serif text-3xl font-semibold leading-tight sm:text-5xl">
                  {session.language === "urdu"
                    ? "پرسکون رہنمائی، جیسے ولنگ ویز ٹیم سے پہلی مطمئن گفتگو"
                    : "Calm guidance that feels like a first reassuring conversation with Willing Ways."}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-lg leading-9 text-[#5a3743]">
                  {session.language === "urdu"
                    ? "علاج، داخلے، فیملی سپورٹ، برانچ رابطوں، یا اے آئی کال کے بارے میں سادہ انداز میں پوچھیں۔"
                    : "Ask in simple language about treatment, admissions, family support, branch contacts, or make an AI call."}
                </p>

                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  {suggestionChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="rounded-full border border-[#ead6dc] bg-white px-4 py-3 text-base font-medium text-[#4b2934] shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary"
                      onClick={() => submitPrompt(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="mt-10 rounded-[28px] border border-[#ead6dc] bg-white/95 p-5 shadow-card backdrop-blur-xl sm:flex sm:items-center sm:gap-5">
                  <Image
                    src={SITE_MEDIA.founder}
                    alt="Dr. Sadaqat Ali"
                    width={96}
                    height={96}
                    className="mx-auto h-24 w-24 rounded-[24px] object-cover sm:mx-0"
                    unoptimized
                  />
                  <div className={`mt-4 sm:mt-0 ${session.language === "urdu" ? "text-right" : "text-left"}`}>
                    <div
                      className={`text-xs font-semibold tracking-[0.22em] text-primary ${
                        session.language === "urdu" ? "font-urdu normal-case" : "uppercase"
                      }`}
                    >
                      {session.language === "urdu" ? "بانی" : "Founded By"}
                    </div>
                    <div className={`mt-2 text-2xl font-semibold text-slate-950 ${session.language === "urdu" ? "font-urdu" : "font-serif"}`}>
                      Dr. Sadaqat Ali
                    </div>
                    <p
                      className={`mt-2 text-base leading-8 text-[#5a3743] ${
                        session.language === "urdu" ? "font-urdu" : ""
                      }`}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {session.language === "urdu"
                        ? "پاکستان میں addiction psychiatry کی 50+ سالہ قیادت، جس کی رہنمائی اب اسی محفوظ اور آسان اے آئی سپورٹ میں شامل ہے۔"
                        : "50+ years of addiction psychiatry leadership in Pakistan, now reflected in a simple and reassuring AI support experience."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            deferredMessages.map((message) => (
              <MessageBubble
                key={message.id}
                canRegenerate={!isGenerating}
                isLatestAssistant={latestAssistantMessage?.id === message.id}
                message={message}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
              />
            ))
          )}

          {isGenerating ? (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-[30px] border border-[#ead6dc] bg-white/95 px-5 py-4 shadow-card backdrop-blur-xl">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Willing Ways AI
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  {session.language === "urdu" ? "ہماری ٹیم غور کر رہی ہے..." : "Our team is thinking..."}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[#ead6dc] bg-white/88 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-4xl">
          {currentError ? (
            <div className="mb-4 flex items-start gap-3 rounded-[24px] border border-[#e7c8d1] bg-[#fff3f6] px-4 py-3 text-sm text-[#651328]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{currentError}</span>
            </div>
          ) : null}

          {copiedText ? (
            <div className="mb-4 flex items-center gap-2 rounded-[24px] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
              <Check className="h-4 w-4" />
              {session.language === "urdu" ? "جواب clipboard میں کاپی ہو گیا۔" : "Response copied to clipboard."}
            </div>
          ) : null}

          <form
            className="glass-panel rounded-[30px] p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPrompt(input);
            }}
          >
            <Textarea
              placeholder={
                session.language === "urdu"
                  ? "اپنا سوال لکھیے، ہم آپ کو پُرسکون اور واضح رہنمائی دیں گے۔"
                  : session.mode === "doctor"
                    ? "Ask for clinical program details, referral context, detox structure, or branch-specific information."
                    : "Tell us what you or your loved one is facing, and we will respond with calm, practical guidance."
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
              className="min-h-[124px] resize-none border-0 bg-transparent text-[16px] leading-8 shadow-none focus-visible:ring-0"
            />

            <div className="mt-3 flex flex-col gap-3 border-t border-[#ead6dc] px-2 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#7a5a64]">
                {session.mode === "doctor" ? (
                  <ShieldAlert className="h-4 w-4 text-primary" />
                ) : (
                  <Sparkles className="h-4 w-4 text-accent" />
                )}
                {session.mode === "doctor"
                  ? session.language === "urdu"
                    ? "ڈاکٹروں کے لئے تفصیلی مگر محفوظ رہنمائی"
                    : "Doctor mode with detailed but safe guidance"
                  : session.language === "urdu"
                    ? "مریض اور خاندان کے لئے نرم اور سادہ رہنمائی"
                    : "Patient and family mode with calm, simple guidance"}
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <Button type="button" variant="outline" onClick={() => void stop()}>
                    <Square className="h-4 w-4 fill-current" />
                    {session.language === "urdu" ? "روکیں" : "Stop"}
                  </Button>
                ) : null}

                <Button type="submit" variant="accent" disabled={!input.trim()}>
                  <ArrowUp className="h-4 w-4" />
                  {session.language === "urdu" ? "بھیجیں" : "Send"}
                </Button>
              </div>
            </div>
          </form>

          {latestAssistantMessage && !isGenerating ? (
            <div className="mt-3 flex flex-col gap-2 text-xs text-[#7a5a64] sm:flex-row sm:items-center sm:justify-between">
              <span className={session.language === "urdu" ? "font-urdu text-right" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
                {session.language === "urdu"
                  ? `آخری جواب کی لمبائی: ${getMessageText(latestAssistantMessage).split(/\s+/).filter(Boolean).length} الفاظ`
                  : `Last reply length: ${getMessageText(latestAssistantMessage).split(/\s+/).filter(Boolean).length} words`}
              </span>
              <span className={session.language === "urdu" ? "font-urdu text-right" : ""} dir={session.language === "urdu" ? "rtl" : "ltr"}>
                {session.language === "urdu"
                  ? "AI generated responses میں غلطیاں ہو سکتی ہیں۔ ہنگامی صورت میں فوراً Willing Ways کی 24/7 helpline سے رابطہ کریں۔"
                  : "AI generated responses may contain inaccuracies. In emergencies, contact the 24/7 Willing Ways helpline immediately."}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
