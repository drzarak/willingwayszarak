"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  LoaderCircle,
  ShieldAlert,
  Square,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";

import {
  getSuggestionChips,
  isUrduText,
  type ChatSession,
  type ModelId,
} from "@/lib/chat";

import { MessageBubble } from "@/components/message-bubble";
import { RealtimeVoicePanel } from "@/components/realtime-voice-panel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatPaneProps {
  bookingConfigured: boolean;
  modelId: ModelId;
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
  realtimeConfigured: boolean;
  serverKeyConfigured: boolean;
  session: ChatSession;
}

export function ChatPane({
  bookingConfigured,
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
          ? "اے آئی چیٹ اس وقت دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
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
          ? "اے آئی چیٹ اس وقت دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <RealtimeVoicePanel
            bookingConfigured={bookingConfigured}
            enabled={realtimeConfigured}
            language={session.language}
            mode={session.mode}
          />

          {deferredMessages.length === 0 ? (
            <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-6">
              <div
                className={`text-center ${session.language === "urdu" ? "font-urdu" : ""}`}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="mx-auto max-w-2xl">
                  <h2 className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
                    {session.language === "urdu"
                      ? "جو کچھ ہو رہا ہے وہ مختصر بتا دیں، ولنگ ویز اے آئی اگلا قدم خود سنبھال لے گی"
                      : "Tell us what is happening, and Willing Ways AI will guide the next step"}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">
                    {session.language === "urdu"
                      ? "یہ چیٹ آپ سے چند ضروری سوالات پوچھ سکتی ہے، practical guidance دے سکتی ہے، crisis کی صورت میں فوراً راستہ دکھا سکتی ہے، اور اگر آپ چاہیں تو follow-up request بھی نوٹ کر سکتی ہے۔"
                      : "This chat can ask a few useful questions, guide the family, handle urgent routing, and note a follow-up request for the Willing Ways team when you want."}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {suggestionChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    className="rounded-full border border-slate-200 bg-[#faf8f8] px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-[#d4b8c0] hover:bg-white hover:text-[#651328]"
                    onClick={() => submitPrompt(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </section>
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
              <div className="max-w-[88%] rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Willing Ways AI
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                  {session.language === "urdu"
                    ? "ہم آپ کے لئے اگلا مفید قدم تیار کر رہے ہیں..."
                    : "We are working out the next useful step..."}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {currentError ? (
            <div className="mb-4 flex items-start gap-3 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{currentError}</span>
            </div>
          ) : null}

          {copiedText ? (
            <div className="mb-4 flex items-center gap-2 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <Check className="h-4 w-4" />
              {session.language === "urdu"
                ? "جواب clipboard میں کاپی ہو گیا۔"
                : "Response copied to clipboard."}
            </div>
          ) : null}

          <form
            className="rounded-[28px] border border-slate-200 bg-[#fbfbfa] p-3 shadow-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void submitPrompt(input);
            }}
          >
            <Textarea
              id="ai-text-input"
              placeholder={
                session.language === "urdu"
                  ? "جو کچھ ہو رہا ہے وہ لکھ دیں۔ ہم رہنمائی، family support، crisis direction یا session request میں مدد کریں گے۔"
                  : "Type what is going on. We can guide, support the family, handle urgent routing, or note a session request for the team."
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
              className="min-h-[100px] resize-none border-0 bg-transparent text-[16px] leading-7 shadow-none focus-visible:ring-0"
            />

            <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div
                className={`flex items-center gap-2 text-xs text-slate-500 ${
                  session.language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                <ShieldAlert className="h-4 w-4 text-primary" />
                {session.language === "urdu"
                  ? "ہنگامی صورت میں 1122 یا 0300-7413639 کو ترجیح دیں"
                  : "In emergencies, prioritize 1122 or 0300-7413639"}
              </div>

              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <Button type="button" variant="outline" onClick={() => void stop()}>
                    <Square className="h-4 w-4 fill-current" />
                    {session.language === "urdu" ? "روکیں" : "Stop"}
                  </Button>
                ) : null}

                <Button type="submit" variant="default" disabled={!input.trim()}>
                  <ArrowUp className="h-4 w-4" />
                  {session.language === "urdu" ? "بھیجیں" : "Send"}
                </Button>
              </div>
            </div>
          </form>

          {latestAssistantMessage && !isGenerating ? (
            <div
              className={`mt-3 text-xs leading-6 text-slate-500 ${
                session.language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={session.language === "urdu" ? "rtl" : "ltr"}
            >
              {session.language === "urdu"
                ? "اگر جواب میں کوئی غلطی ہو تو سوال دوبارہ مختلف انداز میں پوچھیں، یا فوری معاملے میں براہ راست ہیلپ لائن پر کال کریں۔"
                : "If the reply misses something important, ask again more directly, or call the helpline immediately for urgent cases."}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
