"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CURRENT_REALTIME_VOICE_VERSION,
  DEFAULT_REALTIME_VOICE_ID,
  REALTIME_VOICE_OPTIONS,
  REALTIME_VOICE_STORAGE_KEY,
  REALTIME_VOICE_VERSION_STORAGE_KEY,
  analyzeVoiceCareSignals,
  normalizeRealtimeVoiceId,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import {
  buildBookingPayloadFromToolInput,
  getContactResult,
  getCrisisRedirectResult,
  getHumanEscalationResult,
  getSupportResourceResult,
  type BookSessionToolInput,
  type ContactToolInput,
  type CrisisRedirectToolInput,
  type EscalateToHumanToolInput,
  type SendResourceToolInput,
} from "@/lib/support-tools";

import { Button } from "@/components/ui/button";

type VoiceStatus =
  | "idle"
  | "requesting"
  | "connecting"
  | "connected"
  | "listening"
  | "responding"
  | "error";

interface TranscriptEntry {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface RealtimeVoicePanelProps {
  bookingConfigured: boolean;
  enabled: boolean;
  language: ChatLanguage;
  mode: ChatMode;
}

function normalizeRealtimeClientError(message: string, language: ChatLanguage) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("<!doctype html") || lowerMessage.includes("<html")) {
    return language === "urdu"
      ? "کال ملانے میں بہت زیادہ وقت لگ گیا۔ براہ کرم چند لمحوں بعد دوبارہ کوشش کریں۔"
      : "The AI call line took too long to respond. Please try again in a moment.";
  }

  if (
    lowerMessage.includes("api version mismatch") ||
    lowerMessage.includes("api_version_mismatch")
  ) {
    return language === "urdu"
      ? "کال لائن کو تازہ کرنے کی ضرورت ہے۔ صفحہ ریفریش کر کے دوبارہ کوشش کریں۔"
      : "The AI call line needs a quick refresh. Please reload the page and try again.";
  }

  if (!message.trim()) {
    return language === "urdu"
      ? "اے آئی کال اس وقت شروع نہیں ہو سکی۔"
      : "The AI call could not be started right now.";
  }

  return message;
}

function getStatusLabel(status: VoiceStatus, language: ChatLanguage) {
  if (status === "requesting") {
    return language === "urdu" ? "کال تیار ہو رہی ہے" : "Preparing your call";
  }

  if (status === "connecting") {
    return language === "urdu" ? "فون بج رہا ہے" : "Phone is ringing";
  }

  if (status === "connected") {
    return language === "urdu" ? "ولنگ ویز اے آئی نے کال اٹھا لی" : "Willing Ways AI picked up";
  }

  if (status === "listening") {
    return language === "urdu" ? "ہم سن رہے ہیں" : "Listening";
  }

  if (status === "responding") {
    return language === "urdu" ? "ولنگ ویز اے آئی بات کر رہی ہے" : "Willing Ways AI is speaking";
  }

  if (status === "error") {
    return language === "urdu" ? "کال میں مسئلہ آ گیا" : "The call ran into a problem";
  }

  return language === "urdu" ? "کال کے لئے تیار" : "Ready for your call";
}

function getStatusDescription(status: VoiceStatus, language: ChatLanguage) {
  if (status === "requesting") {
    return language === "urdu"
      ? "ہم مائیکروفون اور اے آئی لائن تیار کر رہے ہیں۔"
      : "We are preparing the microphone and AI line.";
  }

  if (status === "connecting") {
    return language === "urdu"
      ? "براہ کرم ایک لمحہ رکیں، لائن مل رہی ہے۔"
      : "Please hold for a moment while the line connects.";
  }

  if (status === "connected") {
    return language === "urdu"
      ? "اے آئی پہلے آپ سے پوچھے گی کہ آپ کون ہیں اور کیا مدد چاہتے ہیں۔"
      : "The AI will start by understanding who you are and what kind of help you need.";
  }

  if (status === "listening") {
    return language === "urdu"
      ? "قدرتی انداز میں بولیں۔ آپ اردو، انگریزی یا پاکستانی پنجابی میں بات کر سکتے ہیں۔"
      : "Speak naturally. You can talk in English, Urdu, or Pakistani Punjabi.";
  }

  if (status === "responding") {
    return language === "urdu"
      ? "اے آئی اگلا مفید قدم، رہنمائی یا follow-up سنبھال رہی ہے۔"
      : "The AI is working through the next useful step, guidance, or follow-up.";
  }

  if (status === "error") {
    return language === "urdu"
      ? "اکثر ایک نئی کال شروع کرنے سے مسئلہ حل ہو جاتا ہے۔"
      : "Starting a fresh call usually fixes this.";
  }

  return language === "urdu"
    ? "ایک کال میں رہنمائی، routing اور follow-up request سب سنبھل سکتے ہیں۔"
    : "One call can cover guidance, routing, and follow-up requests.";
}

export function RealtimeVoicePanel({
  bookingConfigured,
  enabled,
  language,
  mode,
}: RealtimeVoicePanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [voiceId, setVoiceId] = useState<RealtimeVoiceId>(DEFAULT_REALTIME_VOICE_ID);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);
  const handledToolCallsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const storedVoice = window.localStorage.getItem(REALTIME_VOICE_STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(REALTIME_VOICE_VERSION_STORAGE_KEY);
    const nextVoice =
      storedVersion !== CURRENT_REALTIME_VOICE_VERSION && (!storedVoice || storedVoice === "cedar")
        ? DEFAULT_REALTIME_VOICE_ID
        : normalizeRealtimeVoiceId(storedVoice);

    setVoiceId(nextVoice);
    window.localStorage.setItem(REALTIME_VOICE_STORAGE_KEY, nextVoice);
    window.localStorage.setItem(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REALTIME_VOICE_STORAGE_KEY, voiceId);
    window.localStorage.setItem(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
  }, [voiceId]);

  useEffect(() => () => cleanupSession(), []);

  function cleanupSession() {
    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    assistantEntryIdRef.current = null;
    handledToolCallsRef.current.clear();
    setToolActivity(null);
  }

  function sendRealtimeEvent(payload: Record<string, unknown>) {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
    }
  }

  function appendAssistantDelta(delta: string, itemId?: string) {
    if (!delta) {
      return;
    }

    const nextId = itemId ?? assistantEntryIdRef.current ?? crypto.randomUUID();
    assistantEntryIdRef.current = nextId;

    setTranscript((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === nextId);

      if (existingIndex === -1) {
        return [...current, { id: nextId, role: "assistant", text: delta }];
      }

      const next = [...current];
      next[existingIndex] = {
        ...next[existingIndex],
        text: `${next[existingIndex].text}${delta}`,
      };
      return next;
    });
  }

  async function executeRealtimeTool(
    name: string,
    rawInput: unknown,
  ): Promise<Record<string, unknown>> {
    if (name === "book_session") {
      const input = rawInput as Partial<BookSessionToolInput>;

      if (!bookingConfigured) {
        return {
          ok: false,
          message:
            "The follow-up request service is not available right now. Please ask the caller to use the helpline 0300-7413639.",
        };
      }

      if (!input?.consentConfirmed) {
        return {
          ok: false,
          needsConsent: true,
          message:
            "Explicit permission to share the request with the Willing Ways team is still required before booking.",
        };
      }

      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildBookingPayloadFromToolInput(input as BookSessionToolInput),
        ),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        return {
          ok: false,
          message:
            data?.error ??
            "The request could not be noted right now. Ask the caller to use the helpline if it is urgent.",
        };
      }

      setSubmissionNotice(
        language === "urdu"
          ? "ولنگ ویز ٹیم کے لئے follow-up request نوٹ کر دی گئی ہے۔"
          : "The follow-up request has been noted for the Willing Ways team.",
      );

      return {
        ok: true,
        status: "noted",
        message:
          "The request has been noted for the Willing Ways team. They should follow up within about 24 hours on the provided contact route.",
        helpline: "0300-7413639",
      };
    }

    if (name === "get_contact") {
      return getContactResult(rawInput as ContactToolInput);
    }

    if (name === "crisis_redirect") {
      return getCrisisRedirectResult(rawInput as CrisisRedirectToolInput);
    }

    if (name === "send_resource") {
      return getSupportResourceResult(rawInput as SendResourceToolInput);
    }

    if (name === "escalate_to_human") {
      return getHumanEscalationResult(rawInput as EscalateToHumanToolInput);
    }

    return {
      ok: false,
      message: `Unsupported realtime tool: ${name}`,
    };
  }

  async function handleRealtimeToolCall(
    toolName: string,
    callId: string,
    rawArguments: string,
  ) {
    if (handledToolCallsRef.current.has(callId)) {
      return;
    }

    handledToolCallsRef.current.add(callId);

    let parsedArguments: unknown = {};

    try {
      parsedArguments = rawArguments ? JSON.parse(rawArguments) : {};
    } catch {
      parsedArguments = {};
    }

    setToolActivity(
      toolName === "book_session"
        ? language === "urdu"
          ? "ہم آپ کی follow-up request نوٹ کر رہے ہیں..."
          : "We are noting your follow-up request..."
        : toolName === "crisis_redirect"
          ? language === "urdu"
            ? "ہم فوری حفاظتی رہنمائی تیار کر رہے ہیں..."
            : "We are preparing urgent safety guidance..."
          : language === "urdu"
            ? "ہم اگلا مفید قدم تیار کر رہے ہیں..."
            : "We are working on the next useful step...",
    );

    try {
      const output = await executeRealtimeTool(toolName, parsedArguments);
      sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify(output),
        },
      });
      sendRealtimeEvent({ type: "response.create" });
    } catch (error) {
      sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: JSON.stringify({
            ok: false,
            message:
              error instanceof Error
                ? error.message
                : "The tool call failed unexpectedly.",
          }),
        },
      });
      sendRealtimeEvent({ type: "response.create" });
    }
  }

  function handleRealtimeEvent(event: unknown) {
    if (!event || typeof event !== "object" || !("type" in event)) {
      return;
    }

    const payload = event as Record<string, unknown>;
    const type = typeof payload.type === "string" ? payload.type : "";

    if (type === "input_audio_buffer.speech_started") {
      setStatus("listening");
      return;
    }

    if (type === "response.created") {
      setStatus("responding");
      return;
    }

    if (type === "response.done") {
      assistantEntryIdRef.current = null;
      setStatus("connected");
      setToolActivity(null);
      return;
    }

    if (
      type === "response.output_audio_transcript.delta" ||
      type === "response.audio_transcript.delta"
    ) {
      appendAssistantDelta(
        typeof payload.delta === "string" ? payload.delta : "",
        typeof payload.item_id === "string" ? payload.item_id : undefined,
      );
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcriptText =
        typeof payload.transcript === "string" ? payload.transcript.trim() : "";

      if (!transcriptText) {
        return;
      }

      setTranscript((current) => [
        ...current,
        {
          id: typeof payload.item_id === "string" ? payload.item_id : crypto.randomUUID(),
          role: "user",
          text: transcriptText,
        },
      ]);
      setStatus("connected");
      return;
    }

    if (type === "response.function_call_arguments.done") {
      const callId =
        typeof payload.call_id === "string"
          ? payload.call_id
          : typeof payload.item_id === "string"
            ? payload.item_id
            : "";
      const name = typeof payload.name === "string" ? payload.name : "";

      if (!callId || !name) {
        return;
      }

      void handleRealtimeToolCall(
        name,
        callId,
        typeof payload.arguments === "string" ? payload.arguments : "",
      );
      return;
    }

    if (type === "response.output_item.done") {
      const item =
        typeof payload.item === "object" && payload.item
          ? (payload.item as Record<string, unknown>)
          : null;

      if (!item || item.type !== "function_call") {
        return;
      }

      const callId = typeof item.call_id === "string" ? item.call_id : "";
      const name = typeof item.name === "string" ? item.name : "";

      if (!callId || !name) {
        return;
      }

      void handleRealtimeToolCall(
        name,
        callId,
        typeof item.arguments === "string" ? item.arguments : "",
      );
      return;
    }

    if (type === "error") {
      const error =
        typeof payload.error === "object" &&
        payload.error &&
        "message" in payload.error
          ? String((payload.error as { message?: string }).message ?? "Realtime voice failed.")
          : "Realtime voice failed.";

      setErrorMessage(normalizeRealtimeClientError(error, language));
      setStatus("error");
      setToolActivity(null);
    }
  }

  async function startSession() {
    if (!enabled) {
      setErrorMessage(
        language === "urdu"
          ? "اے آئی کال اس وقت عارضی طور پر دستیاب نہیں۔"
          : "AI calling is temporarily unavailable right now.",
      );
      setStatus("error");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage(
        language === "urdu"
          ? "اس کال کے لئے مائیکروفون درکار ہے، لیکن یہ browser اسے support نہیں کرتا۔"
          : "This call needs microphone access, but this browser does not support it.",
      );
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setSubmissionNotice(null);
    setToolActivity(null);
    setTranscript([]);
    handledToolCallsRef.current.clear();
    setStatus("requesting");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const peerConnection = new RTCPeerConnection();
      const dataChannel = peerConnection.createDataChannel("oai-events");

      dataChannelRef.current = dataChannel;
      localStreamRef.current = localStream;
      peerConnectionRef.current = peerConnection;

      dataChannel.onmessage = (messageEvent) => {
        try {
          handleRealtimeEvent(JSON.parse(messageEvent.data));
        } catch {
          // Ignore non-JSON realtime messages.
        }
      };

      dataChannel.onopen = () => {
        setStatus("connected");
        sendRealtimeEvent({ type: "response.create" });
      };

      dataChannel.onerror = () => {
        setErrorMessage(
          language === "urdu"
            ? "کال غیر متوقع طور پر منقطع ہو گئی۔"
            : "The call disconnected unexpectedly.",
        );
        setStatus("error");
      };

      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      setStatus("connecting");

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      const localSdp = peerConnection.localDescription?.sdp ?? offer.sdp ?? "";

      if (!localSdp.trim()) {
        throw new Error(
          language === "urdu"
            ? "کال شروع کرنے کے لئے آڈیو تیار نہیں ہو سکی۔"
            : "The browser could not prepare audio for the call.",
        );
      }

      const realtimeResponse = await fetch(
        `/api/realtime/session?mode=${encodeURIComponent(mode)}&language=${encodeURIComponent(language)}&focus=general-support&voice=${encodeURIComponent(voiceId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
          },
          body: localSdp,
        },
      );

      if (!realtimeResponse.ok) {
        throw new Error(await realtimeResponse.text());
      }

      await peerConnection.setRemoteDescription({
        type: "answer",
        sdp: await realtimeResponse.text(),
      });
    } catch (error) {
      cleanupSession();
      setErrorMessage(
        normalizeRealtimeClientError(
          error instanceof Error ? error.message : "The AI call could not be started.",
          language,
        ),
      );
      setStatus("error");
    }
  }

  function stopSession() {
    cleanupSession();
    setStatus("idle");
  }

  const selectedVoiceLabel =
    REALTIME_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId;
  const userTranscriptTexts = useMemo(
    () => transcript.filter((entry) => entry.role === "user").map((entry) => entry.text),
    [transcript],
  );
  const careSignal = useMemo(
    () => analyzeVoiceCareSignals(userTranscriptTexts),
    [userTranscriptTexts],
  );
  const callIsStarting = status === "requesting" || status === "connecting";
  const callIsLive =
    status === "connected" || status === "listening" || status === "responding";

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
      <audio ref={audioRef} autoPlay />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="section-kicker">
            {language === "urdu" ? "24/7 اے آئی کال سپورٹ" : "24/7 AI call support"}
          </div>
          <h2
            className={`mt-4 text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? "ولنگ ویز اے آئی کو کال کریں"
              : "Call Willing Ways AI"}
          </h2>
          <p
            className={`mt-3 max-w-3xl text-base leading-7 text-slate-600 ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? "بس کال شروع کریں۔ اے آئی خود پوچھے گی کہ آپ کون ہیں، کیا مسئلہ ہے، اور پھر رہنمائی، crisis routing، یا follow-up request کا اگلا قدم خود سنبھالے گی۔"
              : "Just start the call. The AI will ask who you are, understand the situation, and then handle the next useful step, whether that is guidance, urgent routing, or a follow-up request."}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              language === "urdu"
                ? "اردو، انگریزی، پاکستانی پنجابی"
                : "English, Urdu, Pakistani Punjabi",
              language === "urdu"
                ? "فیملی guidance اور intervention support"
                : "Family guidance and intervention support",
              language === "urdu"
                ? "ضرورت ہو تو session request بھی نوٹ ہو سکتی ہے"
                : "Can note a session or callback request",
            ].map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-[#faf8f8] px-3 py-2 text-sm text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-[#ead6dc] bg-[#fff8fa]">
            {callIsStarting || callIsLive ? (
              <span className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
            ) : null}
            <Image
              src={SITE_MEDIA.logo}
              alt="Willing Ways"
              width={72}
              height={72}
              className="h-10 w-auto object-contain"
              unoptimized
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
        <div
          className={`rounded-[24px] border px-4 py-4 ${
            status === "error"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : callIsLive
                ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                : "border-slate-200 bg-[#fafaf8] text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            {callIsStarting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : status === "error" ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            {getStatusLabel(status, language)}
          </div>
          <div
            className={`mt-2 text-sm leading-7 ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {getStatusDescription(status, language)}
          </div>

          {toolActivity ? (
            <div
              className={`mt-3 rounded-[18px] border border-current/10 bg-white/70 px-3 py-3 text-sm ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {toolActivity}
            </div>
          ) : null}

          {submissionNotice ? (
            <div
              className={`mt-3 flex items-start gap-2 rounded-[18px] border border-emerald-200 bg-white px-3 py-3 text-sm text-emerald-900 ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{submissionNotice}</span>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              language === "urdu"
                ? "اے آئی پہلے سمجھے گی کہ آپ کون ہیں"
                : "The AI starts by understanding who you are",
              language === "urdu"
                ? "ضرورت ہو تو follow-up request نوٹ کر سکتی ہے"
                : "It can note a follow-up request when needed",
              language === "urdu"
                ? "بحرانی اشاروں میں فوراً safety-first جواب"
                : "Urgent safety-first handling for crisis cues",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
          <label className="block space-y-2">
            <div
              className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                language === "urdu" ? "font-urdu justify-end normal-case" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <Volume2 className="h-4 w-4 text-primary" />
              {language === "urdu" ? "کال کی آواز" : "Call voice"}
            </div>
            <select
              className="flex h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={callIsStarting || callIsLive}
              value={voiceId}
              onChange={(event) => setVoiceId(event.target.value as RealtimeVoiceId)}
            >
              {REALTIME_VOICE_OPTIONS.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className={`mt-3 text-xs leading-6 text-slate-500 ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? `فی الحال منتخب آواز: ${selectedVoiceLabel}`
              : `Current voice: ${selectedVoiceLabel}`}
          </div>

          <div className="mt-4 grid gap-3">
            {status === "idle" || status === "error" ? (
              <Button onClick={startSession} className="h-12 text-base shadow-sm">
                <PhoneCall className="h-4 w-4" />
                {language === "urdu" ? "ولنگ ویز اے آئی کو کال کریں" : "Call Willing Ways AI now"}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={stopSession}
                className="h-12 text-base shadow-sm"
              >
                <PhoneOff className="h-4 w-4" />
                {language === "urdu" ? "کال بند کریں" : "End call"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {careSignal && careSignal.severity !== "normal" ? (
        <div
          className={`mt-4 rounded-[22px] border px-4 py-4 text-sm leading-7 ${
            careSignal.severity === "urgent"
              ? "border-rose-200 bg-rose-50 text-rose-950"
              : "border-amber-200 bg-amber-50 text-amber-950"
          } ${language === "urdu" ? "font-urdu text-right" : ""}`}
          dir={language === "urdu" ? "rtl" : "ltr"}
        >
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            {language === "urdu"
              ? "اس کال میں اہم care cues نظر آ رہے ہیں"
              : "This call is showing important care cues"}
          </div>
          <div className="mt-2">
            {careSignal.severity === "urgent"
              ? language === "urdu"
                ? "گفتگو میں فوری خطرے کے اشارے موجود ہیں۔ 1122 یا 0300-7413639 کو ترجیح دیں۔"
                : "The conversation includes urgent-risk cues. Prioritize 1122 or 0300-7413639 right now."
              : language === "urdu"
                ? "گفتگو میں distress، privacy یا relapse جیسے اشارے ہیں، اس لئے اگلا قدم احتیاط سے لیا جائے گا۔"
                : "The conversation includes distress, privacy, or relapse cues, so the next step should be handled carefully."}
          </div>
        </div>
      ) : null}

      {transcript.length > 0 ? (
        <div className="mt-4 rounded-[24px] border border-slate-200 bg-[#fafaf8] px-4 py-4">
          <div
            className={`text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
              language === "urdu" ? "font-urdu text-right normal-case" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu" ? "حالیہ کال جھلک" : "Recent call highlights"}
          </div>
          <div className="mt-3 grid gap-3">
            {transcript.slice(-4).map((entry) => (
              <div
                key={entry.id}
                className={`rounded-[20px] border px-4 py-3 ${
                  entry.role === "assistant"
                    ? "border-slate-200 bg-white"
                    : "border-[#ead6dc] bg-[#fff3f6]"
                }`}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {entry.role === "assistant"
                    ? language === "urdu"
                      ? "ولنگ ویز اے آئی"
                      : "Willing Ways AI"
                    : language === "urdu"
                      ? "آپ"
                      : "You"}
                </div>
                <div
                  className={`mt-2 text-base leading-7 text-slate-800 ${
                    language === "urdu" ? "font-urdu text-right" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {entry.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          className={`mt-4 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900 ${
            language === "urdu" ? "font-urdu text-right" : ""
          }`}
          dir={language === "urdu" ? "rtl" : "ltr"}
        >
          {errorMessage}
        </div>
      ) : null}
    </section>
  );
}
