"use client";

import Image from "next/image";
import {
  AlertTriangle,
  BookOpenText,
  HeartHandshake,
  LockKeyhole,
  LoaderCircle,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Siren,
  Stethoscope,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  CURRENT_REALTIME_VOICE_VERSION,
  DEFAULT_REALTIME_VOICE_ID,
  DEFAULT_VOICE_CALL_FOCUS_ID,
  REALTIME_VOICE_OPTIONS,
  REALTIME_VOICE_STORAGE_KEY,
  REALTIME_VOICE_VERSION_STORAGE_KEY,
  VOICE_CALL_FOCUS_OPTIONS,
  analyzeVoiceCareSignals,
  normalizeRealtimeVoiceId,
  voiceCallFocusLabel,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
  type VoiceCallFocusId,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

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
      ? "کال لائن کو تازہ کرنے کی ضرورت ہے۔ صفحہ refresh کر کے دوبارہ کوشش کریں۔"
      : "The AI call line needs a quick refresh. Please reload the page and try again.";
  }

  if (!message.trim()) {
    return language === "urdu"
      ? "اے آئی کال اس وقت شروع نہیں ہو سکی۔"
      : "The AI call could not be started right now.";
  }

  return message;
}

function FocusIcon({
  focus,
  className,
}: {
  focus: VoiceCallFocusId;
  className?: string;
}) {
  if (focus === "family-coach") {
    return <Users className={className} />;
  }

  if (focus === "crisis-triage") {
    return <Siren className={className} />;
  }

  if (focus === "founder-method") {
    return <BookOpenText className={className} />;
  }

  if (focus === "private-intake") {
    return <LockKeyhole className={className} />;
  }

  return <HeartHandshake className={className} />;
}

function careSignalLanguageLabel(
  detectedLanguage: "english" | "urdu" | "punjabi" | "mixed",
  language: ChatLanguage,
) {
  if (language === "urdu") {
    if (detectedLanguage === "punjabi") {
      return "پاکستانی پنجابی";
    }
    if (detectedLanguage === "urdu") {
      return "اردو";
    }
    if (detectedLanguage === "mixed") {
      return "مخلوط";
    }
    return "انگریزی";
  }

  if (detectedLanguage === "punjabi") {
    return "Pakistani Punjabi";
  }
  if (detectedLanguage === "urdu") {
    return "Urdu";
  }
  if (detectedLanguage === "mixed") {
    return "Mixed";
  }
  return "English";
}

function careSignalEmotionLabel(
  emotionalLoad: "steady" | "distressed" | "acute",
  language: ChatLanguage,
) {
  if (language === "urdu") {
    if (emotionalLoad === "acute") {
      return "شدید دباؤ";
    }
    if (emotionalLoad === "distressed") {
      return "ذہنی دباؤ";
    }
    return "نسبتاً پُرسکون";
  }

  if (emotionalLoad === "acute") {
    return "Acute strain";
  }
  if (emotionalLoad === "distressed") {
    return "Distressed";
  }
  return "Steady";
}

function careSignalCategoryLabel(
  category: "crisis" | "distress" | "family" | "privacy" | "relapse",
  language: ChatLanguage,
) {
  if (language === "urdu") {
    if (category === "crisis") {
      return "بحران";
    }
    if (category === "distress") {
      return "ذہنی دباؤ";
    }
    if (category === "family") {
      return "خاندانی معاملہ";
    }
    if (category === "privacy") {
      return "رازداری";
    }
    return "relapse / دوبارہ نشہ";
  }

  if (category === "crisis") {
    return "Crisis";
  }
  if (category === "distress") {
    return "Distress";
  }
  if (category === "family") {
    return "Family";
  }
  if (category === "privacy") {
    return "Privacy";
  }
  return "Relapse";
}

export function RealtimeVoicePanel({
  enabled,
  language,
  mode,
}: RealtimeVoicePanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [voiceId, setVoiceId] = useState<RealtimeVoiceId>(DEFAULT_REALTIME_VOICE_ID);
  const [voiceFocus, setVoiceFocus] = useState<VoiceCallFocusId>(DEFAULT_VOICE_CALL_FOCUS_ID);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    const storedVoice = window.localStorage.getItem(REALTIME_VOICE_STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(REALTIME_VOICE_VERSION_STORAGE_KEY);
    const needsDefaultVoiceMigration = storedVersion !== CURRENT_REALTIME_VOICE_VERSION;
    const nextVoice =
      needsDefaultVoiceMigration && (!storedVoice || storedVoice === "cedar")
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
          id:
            typeof payload.item_id === "string"
              ? payload.item_id
              : crypto.randomUUID(),
          role: "user",
          text: transcriptText,
        },
      ]);
      setStatus("connected");
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
    setTranscript([]);
    setStatus("requesting");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const peerConnection = new RTCPeerConnection();
      const dataChannel = peerConnection.createDataChannel("oai-events");

      dataChannel.onmessage = (messageEvent) => {
        try {
          handleRealtimeEvent(JSON.parse(messageEvent.data));
        } catch {
          // Ignore non-JSON realtime messages.
        }
      };

      dataChannel.onopen = () => {
        setStatus("connected");
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

      localStreamRef.current = localStream;
      peerConnectionRef.current = peerConnection;
      dataChannelRef.current = dataChannel;

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
        `/api/realtime/session?mode=${encodeURIComponent(mode)}&language=${encodeURIComponent(language)}&focus=${encodeURIComponent(voiceFocus)}&voice=${encodeURIComponent(voiceId)}`,
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

      const answer = {
        type: "answer" as const,
        sdp: await realtimeResponse.text(),
      };

      await peerConnection.setRemoteDescription(answer);
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

  const selectedVoiceLabel = useMemo(
    () =>
      REALTIME_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId,
    [voiceId],
  );
  const selectedFocus = useMemo(
    () =>
      VOICE_CALL_FOCUS_OPTIONS.find((focus) => focus.id === voiceFocus) ??
      VOICE_CALL_FOCUS_OPTIONS[0],
    [voiceFocus],
  );
  const userTranscriptTexts = useMemo(
    () => transcript.filter((entry) => entry.role === "user").map((entry) => entry.text),
    [transcript],
  );
  const careSignal = useMemo(
    () => analyzeVoiceCareSignals(userTranscriptTexts),
    [userTranscriptTexts],
  );

  const voiceSelectionLocked =
    status === "connecting" ||
    status === "connected" ||
    status === "listening" ||
    status === "responding";
  const focusSelectionLocked = voiceSelectionLocked;

  const voiceSelectionHint =
    language === "urdu"
      ? "آواز بدلنے کے لئے موجودہ کال ختم کر کے نئی کال کریں۔"
      : "End this call and start a new one to switch voices.";

  const statusLabel =
    status === "requesting"
      ? language === "urdu"
        ? "آپ کی کال ملائی جا رہی ہے"
        : "Placing your call"
      : status === "connecting"
        ? language === "urdu"
          ? "فون بج رہا ہے"
          : "Phone is ringing"
        : status === "listening"
          ? language === "urdu"
            ? "ہم سن رہے ہیں"
            : "We are listening"
          : status === "responding"
            ? language === "urdu"
              ? "ولنگ ویز اے آئی بات کر رہی ہے"
              : "Willing Ways AI is speaking"
            : status === "connected"
              ? language === "urdu"
                ? "ولنگ ویز اے آئی نے کال اٹھا لی ہے"
                : "Willing Ways AI picked up"
              : status === "error"
                ? language === "urdu"
                  ? "کال میں مسئلہ آیا"
                  : "The call ran into a problem"
                  : language === "urdu"
                    ? "کال کے لئے تیار"
                    : "Ready for your call";

  const idleSupportDescription =
    language === "urdu"
      ? selectedFocus.urduDescription
      : selectedFocus.englishDescription;

  const statusDescription =
    status === "requesting"
      ? language === "urdu"
        ? "ہم ولنگ ویز اے آئی کے ساتھ آپ کی کال شروع کر رہے ہیں۔"
        : "We are starting your call with Willing Ways AI."
      : status === "connecting"
        ? language === "urdu"
          ? "براہ کرم ایک لمحہ رکیں، کال بج رہی ہے۔"
          : "Please hold for a moment while the line rings."
        : status === "connected"
          ? language === "urdu"
            ? "کال جڑ چکی ہے، اب آپ بات شروع کر سکتے ہیں۔"
            : "The call is connected. You can start speaking now."
          : status === "listening"
            ? language === "urdu"
              ? "اپنی بات قدرتی انداز میں کہیں، ہم غور سے سن رہے ہیں۔"
              : "Speak naturally. We are listening carefully."
            : status === "responding"
              ? language === "urdu"
                ? "ولنگ ویز اے آئی آپ کو جواب دے رہی ہے۔"
                : "Willing Ways AI is replying to you."
                : status === "error"
                  ? language === "urdu"
                    ? "دوبارہ کال کرنے سے مسئلہ اکثر حل ہو جاتا ہے۔"
                    : "Starting a fresh call usually fixes this."
                  : language === "urdu"
                    ? `${idleSupportDescription} انگریزی، اردو یا پاکستانی پنجابی میں بات کریں۔`
                    : `${idleSupportDescription} Speak in English, Urdu, or Pakistani Punjabi.`;

  const callIsStarting = status === "requesting" || status === "connecting";
  const callIsLive =
    status === "connected" || status === "listening" || status === "responding";
  const showCallPulse = callIsStarting || callIsLive;
  const callBadgeClass = callIsLive
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : status === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-[#ead6dc] bg-[#fff4f7] text-primary";
  const selectedFocusLabel = voiceCallFocusLabel(voiceFocus, language);
  const careSignalTone =
    careSignal?.severity === "urgent"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : careSignal?.severity === "watch"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-emerald-200 bg-emerald-50 text-emerald-950";

  return (
    <div className="rounded-[28px] border border-[#ead6dc] bg-white/95 p-5 shadow-card backdrop-blur-xl">
      <audio ref={audioRef} autoPlay />

      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[28px] border border-[#ead6dc] bg-[#fff8fa] p-5 sm:p-6">
          <div className="inline-flex items-center rounded-full border border-[#ead6dc] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <PhoneCall className="mr-2 h-3.5 w-3.5" />
            {language === "urdu" ? "ولنگ ویز اے آئی کال" : "Willing Ways AI call"}
          </div>

          <div className="mt-6 flex flex-col items-center text-center">
            <div className="relative flex h-36 w-full items-center justify-center">
              {showCallPulse ? (
                <>
                  <span className="absolute h-24 w-[15rem] rounded-[32px] bg-primary/10 animate-ping sm:h-28 sm:w-[18rem]" />
                  <span className="absolute h-28 w-[16rem] rounded-[34px] border border-primary/20 sm:h-32 sm:w-[19rem]" />
                </>
              ) : null}
              <div className="relative flex items-center justify-center rounded-[30px] border border-[#ead6dc] bg-white px-5 py-4 shadow-soft sm:px-6">
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={320}
                  height={80}
                  className="h-14 w-auto max-w-[220px] object-contain sm:h-16 sm:max-w-[280px]"
                  unoptimized
                />
              </div>
            </div>

            <div className="mt-5 text-2xl font-semibold text-[#3b1725]">Willing Ways AI</div>
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-full border border-[#ead6dc] bg-white px-4 py-2 text-sm font-semibold text-[#651328] ${
                language === "urdu" ? "font-urdu" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <FocusIcon focus={voiceFocus} className="h-4 w-4" />
              {selectedFocusLabel}
            </div>
            <p
              className={`mt-2 max-w-xl text-base leading-8 text-[#5a3743] ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu"
                ? "انگریزی، اردو یا پاکستانی پنجابی میں قدرتی انداز میں بات کریں۔ یہ تجربہ ایسے محسوس ہوگا جیسے آپ ولنگ ویز کی معاون ٹیم سے پرسکون کال پر ہوں۔"
                : "Speak naturally in English, Urdu, or Pakistani Punjabi. The experience is designed to feel like a calm support call with the Willing Ways team."}
            </p>
            <div
              className={`mt-4 rounded-[22px] border border-[#ead6dc] bg-white px-4 py-3 text-sm leading-7 text-[#5a3743] ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                {language === "urdu" ? "اس کال کی ابتدا یوں کریں" : "Good first line for this call"}
              </div>
              <div className="mt-2">
                {language === "urdu" ? selectedFocus.urduStarter : selectedFocus.englishStarter}
              </div>
            </div>

            <div
              className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${callBadgeClass} ${
                language === "urdu" ? "font-urdu" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {callIsStarting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : status === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
              {statusLabel}
            </div>

            <p
              className={`mt-3 text-sm leading-7 text-[#6d4452] ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {statusDescription}
            </p>
          </div>
        </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft">
              <div
                className={`text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5a64] ${
                  language === "urdu" ? "font-urdu text-right normal-case" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu" ? "کال کس مقصد کے لئے ہے؟" : "What should this call focus on?"}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {VOICE_CALL_FOCUS_OPTIONS.map((focus) => {
                  const active = focus.id === voiceFocus;

                  return (
                    <button
                      key={focus.id}
                      type="button"
                      disabled={focusSelectionLocked}
                      onClick={() => setVoiceFocus(focus.id)}
                      className={`rounded-[24px] border px-4 py-4 text-left transition ${
                        active
                          ? "border-[#651328] bg-[#fff3f6] shadow-soft"
                          : "border-[#ead6dc] bg-[#fff8fa] hover:border-primary/35 hover:bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                            active ? "bg-[#651328] text-white" : "bg-white text-primary"
                          }`}
                        >
                          <FocusIcon focus={focus.id} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-semibold text-[#3b1725] ${
                              language === "urdu" ? "font-urdu text-right" : ""
                            }`}
                            dir={language === "urdu" ? "rtl" : "ltr"}
                          >
                            {language === "urdu" ? focus.urduLabel : focus.englishLabel}
                          </div>
                          <div
                            className={`mt-1 text-sm leading-6 text-[#6d4452] ${
                              language === "urdu" ? "font-urdu text-right" : ""
                            }`}
                            dir={language === "urdu" ? "rtl" : "ltr"}
                          >
                            {language === "urdu"
                              ? focus.urduDescription
                              : focus.englishDescription}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <label className="space-y-2">
                <div
                  className={`mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5a64] ${
                    language === "urdu" ? "font-urdu justify-end normal-case" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <Volume2 className="h-4 w-4 text-primary" />
                {language === "urdu" ? "کال کی آواز منتخب کریں" : "Choose the voice for the call"}
              </div>
              <select
                className="flex h-12 w-full rounded-2xl border border-[#ead6dc] bg-white px-4 py-3 text-sm font-medium text-[#3b1725] shadow-sm outline-none transition focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={voiceSelectionLocked}
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
              className={`mt-4 rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-3 text-sm text-[#5a3743] ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu"
                ? `منتخب کال فوکس: ${selectedFocusLabel}. منتخب آواز: ${selectedVoiceLabel}. ${voiceSelectionHint}`
                : `Call focus: ${selectedFocusLabel}. Selected voice: ${selectedVoiceLabel}. ${voiceSelectionHint}`}
            </div>

            <div className="mt-4 grid gap-3">
              {status === "idle" || status === "error" ? (
                <Button onClick={startSession} className="h-12 text-base">
                  <PhoneCall className="h-4 w-4" />
                  {language === "urdu" ? "ولنگ ویز اے آئی کو کال کریں" : "Make a call to Willing Ways AI"}
                </Button>
              ) : (
                <Button variant="secondary" onClick={stopSession} className="h-12 text-base">
                  <PhoneOff className="h-4 w-4" />
                  {language === "urdu" ? "کال بند کریں" : "End call"}
                </Button>
              )}
            </div>
          </div>

          <div
            className={`rounded-[28px] border border-[#ead6dc] bg-[#fff8fa] px-5 py-4 text-sm leading-7 text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
              <Stethoscope className="h-4 w-4 text-primary" />
              {language === "urdu" ? "اس کال میں کیا ہوگا؟" : "What this call will do"}
            </div>
            <div className="mt-3">
              {language === "urdu"
                ? selectedFocus.urduDescription
                : selectedFocus.englishDescription}
            </div>
            <div className="mt-3">
              {language === "urdu"
                ? "اگر کال میں ہنگامی الفاظ سنائی دیں تو ہیلپ لائن کو فوراً ترجیح دی جائے گی۔"
                : "If the call includes emergency cues, the UI will push the helpline and urgent next steps immediately."}
            </div>
          </div>

          {careSignal ? (
            <div
              className={`rounded-[28px] border px-5 py-4 text-sm leading-7 ${careSignalTone} ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                {careSignal.severity === "urgent" ? (
                  <ShieldAlert className="h-4 w-4" />
                ) : (
                  <HeartHandshake className="h-4 w-4" />
                )}
                {language === "urdu" ? "لائیو care signals" : "Live care signals"}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full border border-current/15 bg-white/55 px-3 py-1 text-xs font-semibold">
                  {language === "urdu" ? "زبان" : "Language"}:{" "}
                  {careSignalLanguageLabel(careSignal.detectedLanguage, language)}
                </span>
                <span className="rounded-full border border-current/15 bg-white/55 px-3 py-1 text-xs font-semibold">
                  {language === "urdu" ? "حالت" : "Load"}:{" "}
                  {careSignalEmotionLabel(careSignal.emotionalLoad, language)}
                </span>
                {careSignal.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full border border-current/15 bg-white/55 px-3 py-1 text-xs font-semibold"
                  >
                    {careSignalCategoryLabel(category, language)}
                  </span>
                ))}
              </div>

              <div className="mt-3">
                {careSignal.severity === "urgent"
                  ? language === "urdu"
                    ? "اس گفتگو میں بحران یا فوری خطرے کے اشارے سنائی دے رہے ہیں۔ اگر معاملہ واقعی فوری ہے تو ابھی 0300-7413639 پر کال کریں یا قریب ترین ہسپتال جائیں۔"
                    : "This conversation contains crisis or immediate-risk cues. If the situation is truly urgent, call 0300-7413639 now or go to the nearest hospital."
                  : careSignal.severity === "watch"
                    ? language === "urdu"
                      ? "اس گفتگو میں ذہنی دباؤ، relapse، رازداری یا خاندانی کشیدگی کے اشارے موجود ہیں۔ اے آئی اسی حساب سے اگلا قدم زیادہ احتیاط سے لے گی۔"
                      : "This conversation shows distress, relapse, privacy, or family-strain cues. The AI will steer more carefully around those needs."
                    : language === "urdu"
                      ? "ابھی تک گفتگو نسبتاً پُرسکون ہے، مگر آپ کسی بھی وقت زیادہ مخصوص مدد مانگ سکتے ہیں۔"
                      : "So far the call sounds relatively steady, but you can ask for more specific support at any time."}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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

      {transcript.length > 0 ? (
        <div className="mt-5 grid gap-3">
          <div
            className={`text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d] ${
              language === "urdu" ? "font-urdu text-right normal-case" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu" ? "کال کی جھلک" : "Recent call highlights"}
          </div>
          {transcript.slice(-4).map((entry) => (
            <div
              key={entry.id}
              className={`rounded-[22px] border px-4 py-4 ${
                entry.role === "assistant"
                  ? "border-[#ead6dc] bg-[#fff8fa]"
                  : "border-primary/20 bg-primary/5"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                {entry.role === "assistant"
                  ? language === "urdu"
                    ? "ولنگ ویز اے آئی"
                    : "Willing Ways AI"
                  : language === "urdu"
                    ? "آپ"
                    : "You"}
              </div>
              <div
                className={`mt-2 text-base leading-8 text-[#4b2934] ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {entry.text}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
