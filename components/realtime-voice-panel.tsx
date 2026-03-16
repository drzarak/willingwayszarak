"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  BookOpenText,
  CalendarDays,
  HeartHandshake,
  LockKeyhole,
  LoaderCircle,
  MessageSquareHeart,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  Siren,
  Stethoscope,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { type BookingRequestPayload } from "@/lib/booking";
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
  normalizeVoiceCallFocusId,
  voiceCallActionLabel,
  voiceCallFocusLabel,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
  type VoiceCallFocusId,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";

import { VoiceIntakeReview } from "@/components/voice-intake-review";
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

const VOICE_FOCUS_STORAGE_KEY = "willing-ways-ai:call-focus";

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
  if (focus === "guided-intake") {
    return <MessageSquareHeart className={className} />;
  }

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

function getStatusLabel(status: VoiceStatus, language: ChatLanguage) {
  if (status === "requesting") {
    return language === "urdu" ? "کال ملائی جا رہی ہے" : "Placing your call";
  }

  if (status === "connecting") {
    return language === "urdu" ? "فون بج رہا ہے" : "Phone is ringing";
  }

  if (status === "listening") {
    return language === "urdu" ? "ہم سن رہے ہیں" : "We are listening";
  }

  if (status === "responding") {
    return language === "urdu" ? "ولنگ ویز اے آئی جواب دے رہی ہے" : "Willing Ways AI is speaking";
  }

  if (status === "connected") {
    return language === "urdu" ? "کال جڑ چکی ہے" : "Willing Ways AI picked up";
  }

  if (status === "error") {
    return language === "urdu" ? "کال میں مسئلہ آیا" : "The call ran into a problem";
  }

  return language === "urdu" ? "کال کے لئے تیار" : "Ready when you are";
}

function createInitialIntakeDraft(language: ChatLanguage): BookingRequestPayload {
  return {
    requesterName: "",
    patientName: "",
    relation: "family",
    phone: "",
    email: "",
    branchPreference: "first-available",
    serviceInterest: "consultation",
    contactMethod: "phone",
    contactLanguage: language === "urdu" ? "urdu" : "english",
    availability: "asap",
    notes: "",
    consent: false,
    source: "ai-guided-intake",
    website: "",
  };
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
  const [voiceFocus, setVoiceFocus] = useState<VoiceCallFocusId>(DEFAULT_VOICE_CALL_FOCUS_ID);
  const [intakeDraft, setIntakeDraft] = useState<BookingRequestPayload>(() =>
    createInitialIntakeDraft(language),
  );
  const [intakeStatus, setIntakeStatus] = useState<
    "idle" | "preparing" | "ready" | "submitting" | "success" | "error"
  >("idle");
  const [intakeMessage, setIntakeMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);

  useEffect(() => {
    const storedVoice = window.localStorage.getItem(REALTIME_VOICE_STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(REALTIME_VOICE_VERSION_STORAGE_KEY);
    const nextVoice =
      storedVersion !== CURRENT_REALTIME_VOICE_VERSION && (!storedVoice || storedVoice === "cedar")
        ? DEFAULT_REALTIME_VOICE_ID
        : normalizeRealtimeVoiceId(storedVoice);
    const nextFocus = normalizeVoiceCallFocusId(
      window.localStorage.getItem(VOICE_FOCUS_STORAGE_KEY),
    );

    setVoiceId(nextVoice);
    setVoiceFocus(nextFocus);
    window.localStorage.setItem(REALTIME_VOICE_STORAGE_KEY, nextVoice);
    window.localStorage.setItem(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
    window.localStorage.setItem(VOICE_FOCUS_STORAGE_KEY, nextFocus);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REALTIME_VOICE_STORAGE_KEY, voiceId);
    window.localStorage.setItem(
      REALTIME_VOICE_VERSION_STORAGE_KEY,
      CURRENT_REALTIME_VOICE_VERSION,
    );
  }, [voiceId]);

  useEffect(() => {
    window.localStorage.setItem(VOICE_FOCUS_STORAGE_KEY, voiceFocus);
  }, [voiceFocus]);

  useEffect(() => {
    setIntakeDraft((current) => {
      if (current.requesterName || current.phone || current.notes || current.aiIntake) {
        return current;
      }

      const nextLanguage = language === "urdu" ? "urdu" : "english";

      if (current.contactLanguage === nextLanguage) {
        return current;
      }

      return {
        ...current,
        contactLanguage: nextLanguage,
      };
    });
  }, [language]);

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

  function resetIntakeReview() {
    setIntakeDraft(createInitialIntakeDraft(language));
    setIntakeStatus("idle");
    setIntakeMessage(null);
  }

  function updateIntakeField<K extends keyof BookingRequestPayload>(
    field: K,
    value: BookingRequestPayload[K],
  ) {
    setIntakeDraft((current) => ({
      ...current,
      [field]: value,
    }));

    if (intakeStatus === "success" || intakeStatus === "error") {
      setIntakeStatus("ready");
    }

    if (intakeMessage) {
      setIntakeMessage(null);
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
    resetIntakeReview();
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

  async function prepareIntakeDraft() {
    if (!bookingConfigured) {
      setIntakeStatus("error");
      setIntakeMessage(
        language === "urdu"
          ? "ولنگ ویز ٹیم کو handoff بھیجنے کی سہولت ابھی دستیاب نہیں۔ براہ کرم 0300-7413639 پر کال کریں۔"
          : "The Willing Ways handoff service is not available right now. Please call 0300-7413639.",
      );
      return;
    }

    if (mode !== "patient") {
      setIntakeStatus("error");
      setIntakeMessage(
        language === "urdu"
          ? "یہ handoff flow مریض یا خاندان کے لئے ہے۔"
          : "This handoff flow is designed for patients and families.",
      );
      return;
    }

    const callerTurns = transcript.filter(
      (entry) => entry.role === "user" && entry.text.trim(),
    ).length;

    if (callerTurns === 0) {
      setIntakeStatus("error");
      setIntakeMessage(
        language === "urdu"
          ? "پہلے اپنی بات کال میں بتائیں، پھر handoff summary تیار کریں۔"
          : "Please speak in the call first, then prepare the handoff summary.",
      );
      return;
    }

    setIntakeStatus("preparing");
    setIntakeMessage(
      language === "urdu"
        ? "ہم آپ کی گفتگو کو ولنگ ویز ٹیم کے لئے ترتیب دے رہے ہیں..."
        : "We are organizing this call into a handoff for the Willing Ways team...",
    );

    try {
      const response = await fetch("/api/intake", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          focus: voiceFocus,
          language,
          mode,
          transcript,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { draft?: BookingRequestPayload; error?: string; ok?: boolean }
        | null;

      if (!response.ok || !data?.draft) {
        throw new Error(
          data?.error ??
            (language === "urdu"
              ? "AI handoff summary اس وقت تیار نہیں ہو سکی۔"
              : "The AI handoff summary could not be prepared right now."),
        );
      }

      setIntakeDraft({
        ...createInitialIntakeDraft(language),
        ...data.draft,
        consent: false,
        source: "ai-guided-intake",
        website: "",
      });
      setIntakeStatus("ready");
      setIntakeMessage(
        language === "urdu"
          ? "Summary تیار ہے۔ اب نیچے details چیک کر کے ولنگ ویز ٹیم کو بھیج دیں۔"
          : "Your handoff summary is ready. Review the details below and send it to the Willing Ways team.",
      );
    } catch (error) {
      setIntakeStatus("error");
      setIntakeMessage(
        error instanceof Error
          ? error.message
          : language === "urdu"
            ? "AI handoff summary اس وقت تیار نہیں ہو سکی۔"
            : "The AI handoff summary could not be prepared right now.",
      );
    }
  }

  async function submitIntake(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (intakeStatus === "submitting") {
      return;
    }

    setIntakeStatus("submitting");
    setIntakeMessage(
      language === "urdu"
        ? "ہم یہ handoff ولنگ ویز ٹیم کو بھیج رہے ہیں..."
        : "We are sending this handoff to the Willing Ways team...",
    );

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...intakeDraft,
          source: "ai-guided-intake",
          website: "",
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; ok?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (language === "urdu"
              ? "یہ handoff اس وقت بھیجا نہیں جا سکا۔"
              : "This handoff could not be sent right now."),
        );
      }

      setIntakeStatus("success");
      setIntakeMessage(
        language === "urdu"
          ? "ہینڈ آف ولنگ ویز ٹیم کو بھیج دیا گیا ہے۔ اگر معاملہ فوری ہے تو ابھی 0300-7413639 پر کال کریں۔"
          : "The handoff has been sent to the Willing Ways team. If the matter is urgent, call 0300-7413639 right away.",
      );
    } catch (error) {
      setIntakeStatus("error");
      setIntakeMessage(
        error instanceof Error
          ? error.message
          : language === "urdu"
            ? "یہ handoff اس وقت بھیجا نہیں جا سکا۔"
            : "This handoff could not be sent right now.",
      );
    }
  }

  const selectedFocus = useMemo(
    () =>
      VOICE_CALL_FOCUS_OPTIONS.find((focus) => focus.id === voiceFocus) ??
      VOICE_CALL_FOCUS_OPTIONS[0],
    [voiceFocus],
  );
  const selectedVoiceLabel = useMemo(
    () =>
      REALTIME_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId,
    [voiceId],
  );
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
  const selectionLocked = callIsStarting || callIsLive;
  const selectedFocusLabel = voiceCallFocusLabel(voiceFocus, language);
  const selectedFocusTag =
    language === "urdu" ? selectedFocus.urduTag : selectedFocus.englishTag;
  const voiceSelectionHint =
    language === "urdu"
      ? "آواز بدلنے کے لئے موجودہ کال ختم کر کے نئی کال کریں۔"
      : "End the current call before switching voices.";
  const stepOneLabel = language === "urdu" ? "مرحلہ 1" : "Step 1";
  const stepTwoLabel = language === "urdu" ? "مرحلہ 2" : "Step 2";
  const statusLabel = getStatusLabel(status, language);
  const callButtonLabel = voiceCallActionLabel(voiceFocus, language);
  const statusDescription =
    status === "requesting"
      ? language === "urdu"
        ? "ہم ولنگ ویز اے آئی کے ساتھ آپ کی کال شروع کر رہے ہیں۔"
        : "We are starting your call with Willing Ways AI."
      : status === "connecting"
        ? language === "urdu"
          ? "براہ کرم ایک لمحہ رکیں، لائن مل رہی ہے۔"
          : "Please hold for a moment while the line connects."
        : status === "connected"
          ? language === "urdu"
            ? "کال جڑ چکی ہے، اب آپ قدرتی انداز میں بات شروع کر سکتے ہیں۔"
            : "The line is open. You can start speaking naturally."
          : status === "listening"
            ? language === "urdu"
              ? "آپ بولیں، ہم غور سے سن رہے ہیں۔"
              : "Go ahead. We are listening carefully."
            : status === "responding"
              ? language === "urdu"
                ? "ولنگ ویز اے آئی مختصر اور واضح جواب دے رہی ہے۔"
                : "Willing Ways AI is replying with the next helpful step."
              : status === "error"
                ? language === "urdu"
                  ? "اکثر ایک نئی کال شروع کرنے سے مسئلہ حل ہو جاتا ہے۔"
                  : "Starting a fresh call usually fixes this."
                : language === "urdu"
                  ? "پہلے اپنی ضرورت منتخب کریں، پھر کال شروع کریں۔"
                  : "Choose the kind of help you need, then start the call.";
  const careSignalTone =
    careSignal?.severity === "urgent"
      ? "border-rose-200 bg-rose-50 text-rose-950"
      : careSignal?.severity === "watch"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-emerald-200 bg-emerald-50 text-emerald-950";
  const hasCallerTranscript = userTranscriptTexts.length > 0;
  const canOfferHandoff = bookingConfigured && mode === "patient";
  const shouldShowHandoffReview =
    canOfferHandoff && (Boolean(intakeDraft.aiIntake) || intakeStatus !== "idle");

  return (
    <div className="rounded-[28px] border border-[#ead6dc] bg-white/95 p-5 shadow-card backdrop-blur-xl">
      <audio ref={audioRef} autoPlay />

      <div className="grid gap-4 xl:grid-cols-[1.16fr_0.84fr]">
        <section className="order-2 rounded-[28px] border border-[#ead6dc] bg-[#fff8fa] p-5 sm:p-6 xl:order-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-[#ead6dc] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {stepOneLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#ead6dc] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <PhoneCall className="mr-2 h-3.5 w-3.5" />
            {language === "urdu" ? "ولنگ ویز اے آئی کال" : "Willing Ways AI voice support"}
            </span>
          </div>

          <h2
            className={`mt-4 text-3xl font-semibold leading-tight text-[#3b1725] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? "وہ مدد منتخب کریں جو اس وقت آپ کے لئے سب سے زیادہ اہم ہے"
              : "Choose the kind of help that matters most right now"}
          </h2>

          <p
            className={`mt-3 max-w-3xl text-base leading-8 text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? "یہ صفحہ families، patients اور referrers کے لئے بنایا گیا ہے۔ پہلے اپنی ضرورت منتخب کریں، پھر کال شروع کریں یا چاہیں تو نیچے چیٹ میں سوال لکھیں۔"
              : "This page is designed for families, patients, and referrers. Choose your need first, then place the call or switch to chat below if that feels easier."}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {VOICE_CALL_FOCUS_OPTIONS.map((focus) => {
              const active = focus.id === voiceFocus;

              return (
                <button
                  key={focus.id}
                  type="button"
                  disabled={selectionLocked}
                  onClick={() => setVoiceFocus(focus.id)}
                  className={`rounded-[26px] border px-4 py-4 text-left transition ${
                    active
                      ? "border-[#651328] bg-white shadow-soft"
                      : "border-[#ead6dc] bg-[#fff8fa] hover:border-primary/35 hover:bg-white"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                        active ? "bg-[#651328] text-white" : "bg-white text-primary"
                      }`}
                    >
                      <FocusIcon focus={focus.id} className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div
                          className={`text-sm font-semibold text-[#3b1725] ${
                            language === "urdu" ? "font-urdu text-right" : ""
                          }`}
                          dir={language === "urdu" ? "rtl" : "ltr"}
                        >
                          {language === "urdu" ? focus.urduLabel : focus.englishLabel}
                        </div>
                        <span className="rounded-full border border-[#ead6dc] bg-[#fff4f7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {language === "urdu" ? focus.urduTag : focus.englishTag}
                        </span>
                      </div>
                      <div
                        className={`mt-2 text-sm leading-6 text-[#6d4452] ${
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
        </section>

        <div className="order-1 space-y-4 xl:order-2">
          <section className="rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  <span className="inline-flex items-center rounded-full border border-[#ead6dc] bg-[#fff8fa] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    {stepTwoLabel}
                  </span>
                  <span>{language === "urdu" ? "اب کال شروع کریں" : "Now start the call"}</span>
                </div>
                <div
                  className={`mt-2 text-2xl font-semibold text-[#3b1725] ${
                    language === "urdu" ? "font-urdu text-right" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {selectedFocusLabel}
                </div>
                <p
                  className={`mt-2 max-w-md text-sm leading-7 text-[#6d4452] ${
                    language === "urdu" ? "font-urdu text-right" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  {language === "urdu"
                    ? selectedFocus.urduDescription
                    : selectedFocus.englishDescription}
                </p>
              </div>

              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#ead6dc] bg-[#fff8fa]">
                {callIsStarting || callIsLive ? (
                  <span className="absolute inset-0 rounded-full border border-primary/25 animate-ping" />
                ) : null}
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={60}
                  height={60}
                  className="h-8 w-auto object-contain"
                  unoptimized
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#ead6dc] bg-[#fff4f7] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                {selectedFocusTag}
              </span>
              <span className="rounded-full border border-[#ead6dc] bg-white px-3 py-1 text-xs font-semibold text-[#7a5a64]">
                {language === "urdu" ? `آواز: ${selectedVoiceLabel}` : `Voice: ${selectedVoiceLabel}`}
              </span>
              <span className="rounded-full border border-[#ead6dc] bg-white px-3 py-1 text-xs font-semibold text-[#7a5a64]">
                {language === "urdu"
                  ? "زبانیں: انگریزی، اردو، پاکستانی پنجابی"
                  : "Languages: English, Urdu, Pakistani Punjabi"}
              </span>
            </div>

            <div
              className={`mt-4 rounded-[24px] border px-4 py-4 text-sm ${
                status === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-950"
                  : callIsLive
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-[#ead6dc] bg-[#fff8fa] text-[#5a3743]"
              } ${language === "urdu" ? "font-urdu text-right" : ""}`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {callIsStarting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : status === "error" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <PhoneCall className="h-4 w-4" />
                )}
                {statusLabel}
              </div>
              <div className="mt-2 leading-7">{statusDescription}</div>
            </div>

            <label className="mt-4 block space-y-2">
              <div
                className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a5a64] ${
                  language === "urdu" ? "font-urdu justify-end normal-case" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <Volume2 className="h-4 w-4 text-primary" />
                {language === "urdu" ? "کال کی آواز" : "Call voice"}
              </div>
              <select
                className="flex h-12 w-full rounded-2xl border border-[#ead6dc] bg-white px-4 py-3 text-sm font-medium text-[#3b1725] shadow-sm outline-none transition focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={selectionLocked}
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
              className={`mt-3 text-xs leading-6 text-[#7a5a64] ${
                language === "urdu" ? "font-urdu text-right" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {voiceSelectionHint}
            </div>

            <div className="mt-5 grid gap-3">
              {status === "idle" || status === "error" ? (
                <Button onClick={startSession} className="h-12 text-base shadow-soft">
                  <PhoneCall className="h-4 w-4" />
                  {callButtonLabel}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={stopSession}
                  className="h-12 text-base shadow-soft"
                >
                  <PhoneOff className="h-4 w-4" />
                  {language === "urdu" ? "کال بند کریں" : "End call"}
                </Button>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="#ai-text-input" className="site-action-link justify-center">
                  <MessageSquareHeart className="h-4 w-4" />
                  <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                    {language === "urdu" ? "نیچے چیٹ میں لکھیں" : "Type in chat below"}
                  </span>
                </Link>
                <Link href="/book-session" className="site-action-link justify-center">
                  <CalendarDays className="h-4 w-4" />
                  <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                    {language === "urdu" ? "سیشن بک کریں" : "Book a session"}
                  </span>
                </Link>
              </div>
            </div>
          </section>

          <section
            className={`rounded-[28px] border border-[#ead6dc] bg-[#fff8fa] px-5 py-4 text-sm leading-7 text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
              <Stethoscope className="h-4 w-4 text-primary" />
              {language === "urdu" ? "کال کے دوران کیا ہوگا؟" : "What happens during the call"}
            </div>
            <div className="mt-3 grid gap-3">
              <div className="rounded-[20px] border border-[#ead6dc] bg-white px-4 py-3">
                {language === "urdu"
                  ? "آپ قدرتی انداز میں انگریزی، اردو یا پاکستانی پنجابی میں بات کر سکتے ہیں۔"
                  : "Speak naturally in English, Urdu, or Pakistani Punjabi."}
              </div>
              <div className="rounded-[20px] border border-[#ead6dc] bg-white px-4 py-3">
                {language === "urdu"
                  ? "اگر آپ private intake چاہتے ہیں تو شروع میں نام بتانا ضروری نہیں۔"
                  : "If you want a private intake, you do not need to begin with names."}
              </div>
              <div className="rounded-[20px] border border-[#ead6dc] bg-white px-4 py-3">
                {language === "urdu"
                  ? "اگر overdose، self-harm، violent relapse یا psychiatric danger ہو تو فوراً 0300-7413639 پر کال کریں یا ہسپتال جائیں۔"
                  : "For overdose, self-harm, violent relapse, or immediate psychiatric danger, call 0300-7413639 at once or go to the nearest hospital."}
              </div>
            </div>
          </section>
        </div>
      </div>

      {canOfferHandoff ? (
        <section className="mt-4 rounded-[28px] border border-[#ead6dc] bg-[#fff8fa] p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div
                className={`text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d] ${
                  language === "urdu" ? "font-urdu normal-case text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu"
                  ? "ولنگ ویز team handoff"
                  : "Willing Ways team handoff"}
              </div>
              <h3
                className={`mt-2 text-2xl font-semibold text-[#3b1725] ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu"
                  ? "اگر آپ چاہیں تو یہ کال callback یا intervention follow-up میں بدل سکتی ہے"
                  : "If you want, this call can become a callback or intervention follow-up"}
              </h3>
              <p
                className={`mt-3 text-sm leading-7 text-[#5a3743] ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {language === "urdu"
                  ? "اپنی پوری صورتحال بیان کریں، سوالات کے جواب دیں، پھر ہم اسی کال سے ایک صاف summary تیار کر کے ولنگ ویز ٹیم کو بھیجنے کے لئے review کے ساتھ دکھائیں گے۔"
                  : "Tell the full story, answer the follow-up questions, and we will turn this call into a clean reviewed summary you can send to the Willing Ways team."}
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:min-w-[280px]">
              <Button
                type="button"
                className="h-12 text-base"
                disabled={
                  !hasCallerTranscript ||
                  intakeStatus === "preparing" ||
                  intakeStatus === "submitting" ||
                  callIsStarting
                }
                onClick={prepareIntakeDraft}
              >
                {intakeStatus === "preparing" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <MessageSquareHeart className="h-4 w-4" />
                )}
                {language === "urdu"
                  ? "AI handoff summary تیار کریں"
                  : "Prepare AI handoff summary"}
              </Button>

              <Link href="/book-session" className="site-action-link justify-center">
                <CalendarDays className="h-4 w-4" />
                <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                  {language === "urdu"
                    ? "اگر چاہیں تو عام booking form استعمال کریں"
                    : "Use the regular booking form instead"}
                </span>
              </Link>
            </div>
          </div>

          <div
            className={`mt-4 rounded-[22px] border border-[#ead6dc] bg-white px-4 py-3 text-sm leading-7 text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {!hasCallerTranscript
              ? language === "urdu"
                ? "پہلے کال میں اپنی بات بتائیں، پھر handoff summary تیار کریں۔ AI-guided intake focus اس کام کے لئے سب سے بہتر ہے۔"
                : "Speak in the call first, then prepare the handoff summary. The AI intake handoff focus is the best fit for this."
              : voiceFocus === "guided-intake"
                ? language === "urdu"
                  ? "یہ بہترین intake mode ہے۔ AI آپ کی کہانی، history، family context اور expectations کو منظم کرے گی۔"
                  : "This is the best intake mode. The AI will organize the story, history, family context, and expectations."
                : language === "urdu"
                  ? "آپ کسی بھی support call کو follow-up handoff میں بدل سکتے ہیں، مگر مکمل story-based handoff کے لئے AI intake focus بہتر ہے۔"
                  : "You can turn any support call into a follow-up handoff, but the AI intake focus works best for a full story-based handoff."}
          </div>

          {intakeMessage && !intakeDraft.aiIntake ? (
            <div
              className={`mt-4 rounded-[22px] border px-4 py-3 text-sm ${
                intakeStatus === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : "border-[#ead6dc] bg-white text-[#5a3743]"
              } ${language === "urdu" ? "font-urdu text-right" : ""}`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {intakeMessage}
            </div>
          ) : null}
        </section>
      ) : null}

      {shouldShowHandoffReview && intakeDraft.aiIntake ? (
        <VoiceIntakeReview
          draft={intakeDraft}
          language={language}
          message={intakeMessage}
          onFieldChange={updateIntakeField}
          onRefreshDraft={prepareIntakeDraft}
          onSubmit={submitIntake}
          preparing={intakeStatus === "preparing"}
          status={intakeStatus}
        />
      ) : null}

      {careSignal ? (
        <section
          className={`mt-4 rounded-[28px] border px-5 py-4 text-sm leading-7 ${careSignalTone} ${
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
            {language === "urdu" ? "اس کال سے نمایاں باتیں" : "What this call is picking up"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-current/15 bg-white/55 px-3 py-1 text-xs font-semibold">
              {language === "urdu" ? "زبان" : "Language"}:{" "}
              {careSignalLanguageLabel(careSignal.detectedLanguage, language)}
            </span>
            <span className="rounded-full border border-current/15 bg-white/55 px-3 py-1 text-xs font-semibold">
              {language === "urdu" ? "کیفیت" : "Emotional load"}:{" "}
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
                ? "اس گفتگو میں فوری خطرے کے اشارے موجود ہیں۔ ابھی ہیلپ لائن یا ہسپتال کو ترجیح دیں۔"
                : "This conversation contains urgent-risk cues. Prioritize the helpline or hospital right now."
              : careSignal.severity === "watch"
                ? language === "urdu"
                  ? "اس گفتگو میں distress، relapse، privacy یا family strain کے اشارے موجود ہیں، اس لئے اگلا قدم زیادہ احتیاط سے لیا جائے گا۔"
                  : "This conversation shows distress, relapse, privacy, or family-strain cues, so the next step should be handled more carefully."
                : language === "urdu"
                  ? "ابھی گفتگو نسبتاً steady ہے، مگر آپ کسی بھی وقت زیادہ مخصوص مدد مانگ سکتے ہیں۔"
                  : "So far the call sounds relatively steady, but you can ask for more specific support at any time."}
          </div>
        </section>
      ) : null}

      {transcript.length > 0 ? (
        <section className="mt-4 rounded-[28px] border border-[#ead6dc] bg-white p-5 shadow-soft">
          <div
            className={`text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d] ${
              language === "urdu" ? "font-urdu text-right normal-case" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu" ? "کال کی حالیہ جھلک" : "Recent call highlights"}
          </div>
          <div className="mt-4 grid gap-3">
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
        </section>
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
    </div>
  );
}
