"use client";

import Link from "next/link";
import type { UIMessage } from "ai";
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
import { createSafeId } from "@/lib/utils";

interface ChatPaneProps {
  modelId: ModelId;
  onMessagesChange: (chatId: string, messages: UIMessage[]) => void;
  onPreferredNameChange: (chatId: string, preferredName: string) => void;
  serverKeyConfigured: boolean;
  session: ChatSession;
}

interface ChatResponseBody {
  message?: UIMessage;
  preferredName?: string;
}

function createTextUiMessage(role: "assistant" | "user", text: string): UIMessage {
  return {
    id: createSafeId(role),
    role,
    parts: [
      {
        type: "text",
        text,
        state: "done",
      },
    ],
  };
}

export function ChatPane({
  modelId,
  onMessagesChange,
  onPreferredNameChange,
  serverKeyConfigured,
  session,
}: ChatPaneProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UIMessage[]>(session.messages);
  const [status, setStatus] = useState<"ready" | "submitted">("ready");
  const [localError, setLocalError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousSessionIdRef = useRef(session.id);

  const deferredMessages = useDeferredValue(messages);
  const isGenerating = status === "submitted";
  const currentError = localError;
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
    if (previousSessionIdRef.current === session.id) {
      return;
    }

    previousSessionIdRef.current = session.id;
    setMessages(session.messages);
    setInput("");
    setLocalError(null);
    setCopiedText(null);
    setStatus("ready");
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, [session.id, session.messages]);

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

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function requestAssistant(nextMessages: UIMessage[]) {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setStatus("submitted");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          id: session.id,
          language: session.language,
          messages: nextMessages,
          mode: session.mode,
          modelId,
          preferredName: rememberedName || session.preferredName || "",
          responseMode: "json",
          resumeContext: buildVoiceResumeContext(session.voiceTranscript),
        }),
      });

      if (!response.ok) {
        const message = (await response.text()).trim();
        throw new Error(message || "The message could not be sent right now.");
      }

      const data = (await response.json()) as ChatResponseBody;

      if (!data.message) {
        throw new Error("The assistant did not return a valid reply.");
      }

      return data.message;
    } catch (error) {
      if (controller.signal.aborted) {
        return null;
      }

      throw error;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }

      setStatus("ready");
    }
  }

  async function submitPrompt(text: string) {
    const nextText = text.trim();

    if (!nextText || isGenerating) {
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
      setLocalError(null);
      setInput("");

      const userMessage = createTextUiMessage("user", nextText);
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);

      const assistantMessage = await requestAssistant(nextMessages);

      if (assistantMessage) {
        setMessages([...nextMessages, assistantMessage]);
      }
    } catch (submitError) {
      setLocalError(
        submitError instanceof Error
          ? submitError.message
          : "The message could not be sent right now.",
      );
    }
  }

  async function handleRegenerate() {
    if (!serverKeyConfigured || isGenerating) {
      setLocalError(
        session.language === "urdu"
          ? "اے آئی چیٹ اس وقت دستیاب نہیں۔ براہ کرم کچھ دیر بعد دوبارہ کوشش کریں یا 0300-7413639 پر رابطہ کریں۔"
          : "AI chat is temporarily unavailable right now. Please try again shortly or call 0300-7413639.",
      );
      return;
    }

    const lastAssistantIndex = [...messages]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find((entry) => entry.message.role === "assistant")?.index;

    if (lastAssistantIndex == null) {
      return;
    }

    try {
      setLocalError(null);

      const nextMessages = messages.filter((_, index) => index !== lastAssistantIndex);
      setMessages(nextMessages);

      const assistantMessage = await requestAssistant(nextMessages);

      if (assistantMessage) {
        setMessages([...nextMessages, assistantMessage]);
      }
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

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiedText(text);
    window.setTimeout(() => setCopiedText(null), 1600);
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus("ready");
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
              ? "اپنی صورتحال لکھ دیں۔ ہم cravings، relapse warning signs، family stress، post-rehab follow-up اور session request میں مدد کریں گے۔"
              : "Tell us what is happening. We can help with cravings, relapse warning signs, family stress, post-rehab follow-up, or a session request."
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
            className={`flex items-center gap-2 text-sm text-slate-600 ${
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
            <Link href="/" className="site-action-link justify-center">
              <PhoneCall className="h-4 w-4" />
              <span
                className={session.language === "urdu" ? "font-urdu" : ""}
                dir={session.language === "urdu" ? "rtl" : "ltr"}
              >
                {session.language === "urdu"
                  ? "اگر بات کرنا آسان ہو تو اے آئی کال پر جائیں"
                  : "Prefer to talk? Go to the AI call"}
              </span>
            </Link>

            {isGenerating ? (
              <Button type="button" variant="outline" onClick={handleStop}>
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
          <div className="mx-auto flex min-h-[calc(100vh-18rem)] w-full max-w-4xl flex-col justify-center py-6">
            <section className="relative overflow-hidden rounded-[38px] border border-white/80 bg-white/94 px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:px-8 sm:py-9">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_40%),radial-gradient(circle_at_bottom_right,_rgba(248,250,252,0.9),_transparent_34%)]" />

              <div className="relative">
                <div className="mx-auto max-w-3xl text-center">
                  <div className="section-kicker">
                    {session.language === "urdu"
                      ? "آرام سے لکھ کر بات کریں"
                      : "Write instead if that feels easier"}
                  </div>

                  <h1
                    className={`mt-5 text-4xl font-semibold leading-[1.08] text-slate-950 sm:text-[3.2rem] ${
                      session.language === "urdu" ? "font-urdu" : ""
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? rememberedName
                        ? `${rememberedName}، cravings یا family stress کے بارے میں لکھیں`
                        : "cravings یا family stress کے بارے میں لکھیں"
                      : rememberedName
                        ? `Write what is happening with cravings or family stress, ${rememberedName}`
                        : "Write what is happening with cravings or family stress"}
                  </h1>

                  <p
                    className={`mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl ${
                      session.language === "urdu" ? "font-urdu" : ""
                    }`}
                    dir={session.language === "urdu" ? "rtl" : "ltr"}
                  >
                    {session.language === "urdu"
                      ? "اگر کال کرنا آسان نہ ہو تو یہ پرسکون چیٹ مریضوں اور خاندانوں کے لئے فوری رہنمائی، treatment support اور follow-up میں مدد دیتی ہے۔"
                      : "If calling is not easy right now, this calmer chat can still help with urgent guidance, treatment support, and follow-up."}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    session.language === "urdu"
                      ? "فوری رہنمائی"
                      : "Urgent guidance",
                    session.language === "urdu"
                      ? "خاندانی سپورٹ"
                      : "Family support",
                    session.language === "urdu"
                      ? "علاج کے بعد follow-up"
                      : "After-treatment follow-up",
                  ].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {rememberedName ? (
                  <div
                    className={`mx-auto mt-6 max-w-3xl rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 ${
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
                    className={`mx-auto mt-4 max-w-3xl rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 ${
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
                    <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600 shadow-sm">
                      <div className="flex items-center gap-3">
                        <LoaderCircle className="h-4 w-4 animate-spin text-slate-600" />
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
                      className={`rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-left text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 ${
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
                  <Link href="/" className="site-action-link justify-center">
                    <PhoneCall className="h-4 w-4" />
                    <span
                      className={session.language === "urdu" ? "font-urdu" : ""}
                      dir={session.language === "urdu" ? "rtl" : "ltr"}
                    >
                      {session.language === "urdu"
                        ? "اگر چاہیں تو اے آئی کال پر واپس جائیں"
                        : "Go back to the AI call"}
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
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
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
