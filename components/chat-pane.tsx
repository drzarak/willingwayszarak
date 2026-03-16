"use client";

import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  LoaderCircle,
  PhoneCall,
  ShieldAlert,
  Square,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  buildVoiceResumeContext,
  extractPreferredNameFromMessages,
  getSuggestionChips,
  isUrduText,
  type ChatSession,
  type ModelId,
} from "@/lib/chat";

import { MessageBubble } from "@/components/message-bubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatPaneProps {
  modelId: ModelId;
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
  onPreferredNameChange: (chatId: string, preferredName: string) => void;
  serverKeyConfigured: boolean;
  session: ChatSession;
}

export function ChatPane({
  modelId,
  onMessagesChange,
  onPreferredNameChange,
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
        preferredName: session.preferredName ?? "",
        resumeContext: buildVoiceResumeContext(session.voiceTranscript),
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
  const rememberedName = useMemo(
    () => extractPreferredNameFromMessages(deferredMessages) || session.preferredName || "",
    [deferredMessages, session.preferredName],
  );
  const isEmptyConversation = deferredMessages.length === 0;

  useEffect(() => {
    onMessagesChange(session.id, messages);
  }, [messages, onMessagesChange, session.id]);

  useEffect(() => {
    if (!rememberedName || rememberedName === session.preferredName) {
      return;
    }

    onPreferredNameChange(session.id, rememberedName);
  }, [onPreferredNameChange, rememberedName, session.id, session.preferredName]);

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

  function renderAlerts() {
    return (
      <>
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
      </>
    );
  }

  function renderComposer(centered: boolean) {
    return (
      <form
        className={`rounded-[30px] border border-slate-200 bg-white/95 shadow-sm ${
          centered ? "p-4 sm:p-5" : "bg-[#fbfbfa] p-3"
        }`}
        onSubmit={(event) => {
          event.preventDefault();
          void submitPrompt(input);
        }}
      >
        <Textarea
          id="ai-text-input"
          placeholder={
            session.language === "urdu"
              ? "اپنی صورتحال لکھ دیں۔ ہم فوری رہنمائی، pre-treatment اور post-treatment family support، relapse follow-up اور session request میں مدد کریں گے۔"
              : "Tell us what is happening. We can help with urgent guidance, pre-treatment and post-treatment family support, relapse follow-up, or a session request."
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
          className={`resize-none border-0 bg-transparent text-[16px] leading-7 shadow-none focus-visible:ring-0 ${
            centered ? "min-h-[132px]" : "min-h-[100px]"
          }`}
        />

        <div
          className={`mt-3 flex flex-col gap-3 border-t border-slate-200 px-1 pt-3 ${
            centered ? "lg:flex-row lg:items-center lg:justify-between" : "sm:flex-row sm:items-center sm:justify-between"
          }`}
        >
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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link href="/ai" className="site-action-link justify-center">
              <PhoneCall className="h-4 w-4" />
              <span
                className={session.language === "urdu" ? "font-urdu" : ""}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                {session.language === "urdu"
                  ? "اگر بات کرنا آسان ہو تو کال کھولیں"
                  : "Prefer to talk? Open the AI call"}
              </span>
            </Link>

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
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6 ${
          isEmptyConversation ? "flex" : ""
        }`}
      >
        {isEmptyConversation ? (
          <div className="mx-auto flex min-h-[calc(100vh-17rem)] w-full max-w-4xl flex-col justify-center py-6">
            <section className="relative overflow-hidden rounded-[38px] border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-9">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(101,19,40,0.08),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(255,238,242,0.85),_transparent_34%)]" />

              <div className="relative">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="section-kicker">
                    {session.language === "urdu"
                      ? "ڈاکٹر صداقت علی کا اے آئی کونسلر"
                      : "Dr. Sadaqat Ali's AI counselor"}
                  </div>

                  <h1
                    className={`mt-5 text-4xl font-semibold leading-[1.08] text-slate-950 sm:text-5xl ${
                      session.language === "urdu" ? "font-urdu" : ""
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? rememberedName
                        ? `${rememberedName}، آج ہم آپ کی کیسے مدد کر سکتے ہیں؟`
                        : "آج ہم آپ کی کیسے مدد کر سکتے ہیں؟"
                      : rememberedName
                        ? `How can we support you today, ${rememberedName}?`
                        : "How can we support you today?"}
                  </h1>

                  <p
                    className={`mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl ${
                      session.language === "urdu" ? "font-urdu" : ""
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? "یہ جگہ مریضوں اور خاندانوں کے لئے فوری counselling، treatment سے پہلے اور بعد کی رہنمائی، relapse support اور session request کے لئے بنائی گئی ہے۔"
                      : "This space is for urgent counseling, treatment guidance before and after care, relapse support, and session requests for patients and families."}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    session.language === "urdu"
                      ? "فوری رہنمائی"
                      : "Urgent guidance",
                    session.language === "urdu"
                      ? "فیملی intervention سپورٹ"
                      : "Family intervention support",
                    session.language === "urdu"
                      ? "علاج کے دوران اور بعد کی مدد"
                      : "During and after treatment support",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#ead6dc] bg-[#fff8fa] px-3 py-2 text-sm font-medium text-[#651328]"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {rememberedName ? (
                  <div
                    className={`mx-auto mt-6 max-w-3xl rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-3 text-sm text-[#651328] ${
                      session.language === "urdu" ? "font-urdu text-center" : "text-center"
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? `ہم آپ کا نام ${rememberedName} کے طور پر یاد رکھے ہوئے ہیں تاکہ گفتگو زیادہ ذاتی محسوس ہو۔`
                      : `We have your name saved as ${rememberedName} so the conversation feels more personal.`}
                  </div>
                ) : null}

                {session.voiceTranscript.length > 0 ? (
                  <div
                    className={`mx-auto mt-4 max-w-3xl rounded-[22px] border border-slate-200 bg-[#fafaf8] px-4 py-3 text-sm text-slate-600 ${
                      session.language === "urdu" ? "font-urdu text-center" : "text-center"
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? "پچھلی کال کا محفوظ خلاصہ اس چیٹ کو continuity دیتا ہے، اس لئے آپ وہیں سے بات آگے بڑھا سکتے ہیں۔"
                      : "A saved summary from the last call gives this chat continuity, so you can continue from where you left off."}
                  </div>
                ) : null}

                <div className="mx-auto mt-6 max-w-3xl">{renderAlerts()}</div>

                <div className="mx-auto mt-6 max-w-3xl">{renderComposer(true)}</div>

                {isGenerating ? (
                  <div className="mx-auto mt-5 flex max-w-3xl justify-center">
                    <div className="rounded-[22px] border border-slate-200 bg-[#fafaf8] px-5 py-4 text-sm text-slate-600 shadow-sm">
                      <div className="flex items-center gap-3">
                        <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
                        {session.language === "urdu"
                          ? "ہم آپ کے لئے اگلا مفید قدم تیار کر رہے ہیں..."
                          : "We are working out the next useful step..."}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {suggestionChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className={`rounded-[24px] border border-slate-200 bg-[#fcfaf8] px-4 py-4 text-left text-sm font-medium text-slate-700 transition hover:border-[#d4b8c0] hover:bg-white hover:text-[#651328] ${
                        session.language === "urdu" ? "font-urdu text-right" : ""
                      }`}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                      onClick={() => submitPrompt(chip)}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <Link href="/ai" className="site-action-link justify-center">
                    <PhoneCall className="h-4 w-4" />
                    <span
                      className={session.language === "urdu" ? "font-urdu" : ""}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {session.language === "urdu"
                        ? "اگر چاہیں تو اے آئی کال شروع کریں"
                        : "Start the AI call instead"}
                    </span>
                  </Link>
                  <Link href="/about" className="site-action-link justify-center">
                    <span
                      className={session.language === "urdu" ? "font-urdu" : ""}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {session.language === "urdu"
                        ? "ولنگ ویز کے بارے میں مزید دیکھیں"
                        : "Learn more about Willing Ways"}
                    </span>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {deferredMessages.map((message) => (
              <MessageBubble
                key={message.id}
                canRegenerate={!isGenerating}
                isLatestAssistant={latestAssistantMessage?.id === message.id}
                message={message}
                onCopy={handleCopy}
                onRegenerate={handleRegenerate}
              />
            ))}

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
        )}
      </div>

      {isEmptyConversation ? null : (
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-4xl">
            {renderAlerts()}
            {renderComposer(false)}
          </div>
        </div>
      )}
    </div>
  );
}
