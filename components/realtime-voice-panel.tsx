"use client";

import Link from "next/link";
import Image from "next/image";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MessageSquare,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  ShieldAlert,
  UserRound,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildVoiceResumeContext,
  CURRENT_REALTIME_VOICE_VERSION,
  DEFAULT_REALTIME_VOICE_ID,
  MAX_PERSISTED_VOICE_TURNS,
  REALTIME_VOICE_OPTIONS,
  REALTIME_VOICE_STORAGE_KEY,
  REALTIME_VOICE_VERSION_STORAGE_KEY,
  analyzeVoiceCareSignals,
  normalizeRealtimeVoiceId,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
  type VoiceTranscriptEntry,
} from "@/lib/chat";
import { SITE_MEDIA } from "@/lib/site-assets";
import {
  buildBookingPayloadFromToolInput,
  getContactResult,
  getCrisisRedirectResult,
  getHumanEscalationResult,
  getRememberedPreferredNameResult,
  getSupportResourceResult,
  normalizePreferredName,
  type BookSessionToolInput,
  type ContactToolInput,
  type CrisisRedirectToolInput,
  type EscalateToHumanToolInput,
  type RememberPreferredNameToolInput,
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

interface RealtimeVoicePanelProps {
  bookingConfigured: boolean;
  enabled: boolean;
  language: ChatLanguage;
  mode: ChatMode;
  preferredName: string;
  sessionId: string;
  transcript: VoiceTranscriptEntry[];
  onPreferredNameChange: (chatId: string, preferredName: string) => void;
  onTranscriptChange: (chatId: string, transcript: VoiceTranscriptEntry[]) => void;
}

interface PendingRealtimeTurn {
  itemId: string;
  epoch: number;
  peakLevel: number;
  stoppedAt: number;
  confidence?: number | null;
  transcript?: string;
  ignored?: boolean;
  responded?: boolean;
  scheduled?: boolean;
}

interface QueuedResponseRequest {
  source: "turn" | "tool" | "greeting";
  itemId?: string;
}

const RESPONSE_DEBOUNCE_MS = 420;
const TURN_RESPONSE_COOLDOWN_MS = 650;
const MIN_TRANSCRIPT_PROBABILITY = 0.45;
const MIN_SHORT_TRANSCRIPT_PROBABILITY = 0.62;
const MIN_TRANSCRIPT_CHARACTERS = 3;
const MIN_SPEECH_LEVEL = 0.009;
const ECHO_GUARD_WINDOW_MS = 1600;
const INTRODUCTORY_TURN_HOLD_MS = 1200;
const SHORT_TURN_HOLD_MS = 900;
const INCOMPLETE_TURN_HOLD_MS = 700;
const PICKUP_TONE_DELAY_MS = 280;
const UI_TONE_VOLUME = 0.024;
const RING_TONE_GAP_MS = 1600;
const FILLER_TRANSCRIPTS = new Set([
  "uh",
  "uhh",
  "umm",
  "um",
  "hmm",
  "hm",
  "mmm",
  "mm",
  "ah",
  "eh",
]);

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
    return language === "urdu" ? "کال تیار ہو رہی ہے" : "Preparing the call";
  }

  if (status === "connecting") {
    return language === "urdu" ? "لائن مل رہی ہے" : "Ringing the line";
  }

  if (status === "connected") {
    return language === "urdu" ? "کال اٹھا لی گئی" : "Call picked up";
  }

  if (status === "listening") {
    return language === "urdu" ? "ہم سن رہے ہیں" : "Listening";
  }

  if (status === "responding") {
    return language === "urdu" ? "اے آئی رہنمائی دے رہی ہے" : "Speaking";
  }

  if (status === "error") {
    return language === "urdu" ? "کال میں مسئلہ آ گیا" : "The call ran into a problem";
  }

  return language === "urdu" ? "شروع کرنے کے لئے تیار" : "Ready to begin";
}

function getStatusDescription(status: VoiceStatus, language: ChatLanguage) {
  if (status === "requesting") {
    return language === "urdu"
      ? "ہم مائیکروفون اور کال لائن تیار کر رہے ہیں۔"
      : "We are getting the microphone and call line ready.";
  }

  if (status === "connecting") {
    return language === "urdu"
      ? "ایک لمحہ رکیں، relapse prevention line سے رابطہ کیا جا رہا ہے۔"
      : "Please hold for a moment while we connect the relapse prevention line.";
  }

  if (status === "connected") {
    return language === "urdu"
      ? "اے آئی اب پہلے سلام کرے گی، آپ کا نام کنفرم کرے گی اور پھر آپ کی بات سنے گی۔"
      : "The AI will greet you first, confirm your name, and then listen.";
  }

  if (status === "listening") {
    return language === "urdu"
      ? "آرام سے بولیں۔ آپ اردو، انگریزی یا پاکستانی پنجابی میں بات کر سکتے ہیں۔"
      : "Speak naturally. You can use English, Urdu, or Pakistani Punjabi.";
  }

  if (status === "responding") {
    return language === "urdu"
      ? "اے آئی relapse prevention کے لئے اگلا مفید قدم، exercise یا رہنمائی دے رہی ہے۔"
      : "The AI is giving the next useful step, exercise, or guidance for relapse prevention.";
  }

  if (status === "error") {
    return language === "urdu"
      ? "اکثر ایک نئی کال شروع کرنے سے مسئلہ حل ہو جاتا ہے۔"
      : "Starting a fresh call usually fixes this.";
  }

  return language === "urdu"
    ? "کال شروع کریں۔ اے آئی پہلے آپ سے نام پوچھے گی، پھر cravings، warning signs یا family stress کے بارے میں مدد دے گی۔"
    : "Start the call. The AI will greet you first, ask your name, and then help with cravings, warning signs, or family stress.";
}

function normalizeTranscriptComparisonText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptLooksLikeAssistantEcho(
  transcriptText: string,
  transcript: VoiceTranscriptEntry[],
  lastAssistantSpeechAt: number,
) {
  if (!lastAssistantSpeechAt || Date.now() - lastAssistantSpeechAt > ECHO_GUARD_WINDOW_MS) {
    return false;
  }

  const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);

  if (normalizedTranscript.length < 18) {
    return false;
  }

  const lastAssistantEntry = [...transcript]
    .reverse()
    .find((entry) => entry.role === "assistant" && entry.text.trim());

  if (!lastAssistantEntry) {
    return false;
  }

  const normalizedAssistant = normalizeTranscriptComparisonText(lastAssistantEntry.text);

  if (normalizedAssistant.length < 18) {
    return false;
  }

  return (
    normalizedAssistant.includes(normalizedTranscript) ||
    normalizedTranscript.includes(normalizedAssistant)
  );
}

function extractAverageLogprob(payload: Record<string, unknown>) {
  const logprobs = Array.isArray(payload.logprobs) ? payload.logprobs : [];
  const values = logprobs
    .map((entry) => {
      if (typeof entry === "number" && Number.isFinite(entry)) {
        return entry;
      }

      if (entry && typeof entry === "object" && "logprob" in entry) {
        const logprob = Number((entry as { logprob?: unknown }).logprob);
        return Number.isFinite(logprob) ? logprob : null;
      }

      return null;
    })
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function probabilityFromAverageLogprob(averageLogprob: number | null) {
  if (averageLogprob === null) {
    return null;
  }

  return Math.exp(Math.max(-8, Math.min(0, averageLogprob)));
}

function getContinuationHoldDelay(transcriptText: string) {
  const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);
  const wordCount = normalizedTranscript.split(" ").filter(Boolean).length;
  const introducesSelf =
    /\b(hello|hi|hey|assalam|assalamu|salaam|my name is|i am|this is)\b/i.test(
      normalizedTranscript,
    ) &&
    !/\b(help|need|using|problem|issue|brother|sister|mother|father|relapse|session|rehab|treatment|suic|admission)\b/i.test(
      normalizedTranscript,
    );
  const endsAbruptly = !/[.!?؟]$/.test(transcriptText.trim());

  if (introducesSelf) {
    return INTRODUCTORY_TURN_HOLD_MS;
  }

  if (wordCount <= 5) {
    return SHORT_TURN_HOLD_MS;
  }

  if (endsAbruptly) {
    return INCOMPLETE_TURN_HOLD_MS;
  }

  return 0;
}

function trimPersistedTranscript(entries: VoiceTranscriptEntry[]) {
  return entries.slice(-MAX_PERSISTED_VOICE_TURNS);
}

function formatCallDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

export function RealtimeVoicePanel({
  bookingConfigured,
  enabled,
  language,
  mode,
  preferredName,
  sessionId,
  transcript,
  onPreferredNameChange,
  onTranscriptChange,
}: RealtimeVoicePanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [localTranscript, setLocalTranscript] = useState<VoiceTranscriptEntry[]>(
    trimPersistedTranscript(transcript),
  );
  const [voiceId, setVoiceId] = useState<RealtimeVoiceId>(DEFAULT_REALTIME_VOICE_ID);
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [submissionNotice, setSubmissionNotice] = useState<string | null>(null);
  const [rememberedName, setRememberedName] = useState(preferredName);
  const [showNotes, setShowNotes] = useState(false);
  const [showVoiceOptions, setShowVoiceOptions] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [callConnectedAt, setCallConnectedAt] = useState<number | null>(null);
  const [callDurationSeconds, setCallDurationSeconds] = useState(0);
  const localTranscriptRef = useRef<VoiceTranscriptEntry[]>(transcript);
  const statusRef = useRef<VoiceStatus>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const uiAudioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const analyserFrameRef = useRef<number | null>(null);
  const analyserBufferRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const ringToneTimerRef = useRef<number | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);
  const handledToolCallsRef = useRef<Set<string>>(new Set());
  const lastSessionIdRef = useRef(sessionId);
  const intentionalCloseRef = useRef(false);
  const activeResponseRef = useRef(false);
  const initialGreetingRequestedRef = useRef(false);
  const queuedResponseRequestRef = useRef<QueuedResponseRequest | null>(null);
  const pendingToolOutputsRef = useRef<Array<{ callId: string; output: string }>>([]);
  const lastAssistantSpeechAtRef = useRef(0);
  const recentAssistantDeltaSignatureRef = useRef<{ signature: string; at: number } | null>(null);
  const pendingResponseTimerRef = useRef<number | null>(null);
  const activeSpeechEpochRef = useRef(0);
  const latestSpeechEpochRef = useRef(0);
  const speechIsActiveRef = useRef(false);
  const currentSpeechPeakLevelRef = useRef(0);
  const stoppedTurnsQueueRef = useRef<Array<{ epoch: number; peakLevel: number; stoppedAt: number }>>(
    [],
  );
  const pendingTurnsRef = useRef<Map<string, PendingRealtimeTurn>>(new Map());
  const turnCooldownUntilRef = useRef(0);
  const currentMicLevelRef = useRef(0);
  const micNoiseFloorRef = useRef(0.004);

  useEffect(() => {
    const storedVoice = window.localStorage.getItem(REALTIME_VOICE_STORAGE_KEY);
    const storedVersion = window.localStorage.getItem(REALTIME_VOICE_VERSION_STORAGE_KEY);
    const shouldRefreshVoicePreference =
      !storedVoice || storedVoice === "marin" || storedVoice === "marine";
    const nextVoice =
      storedVersion !== CURRENT_REALTIME_VOICE_VERSION && shouldRefreshVoicePreference
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

  useEffect(() => {
    if (lastSessionIdRef.current === sessionId) {
      return;
    }

    lastSessionIdRef.current = sessionId;
    cleanupSession();
    setLocalTranscript(trimPersistedTranscript(transcript));
    setRememberedName(preferredName);
    setSubmissionNotice(null);
    setToolActivity(null);
    setErrorMessage(null);
    setShowNotes(false);
    setShowVoiceOptions(false);
    setIsMicMuted(false);
    setStatus("idle");
  }, [preferredName, sessionId, transcript]);

  useEffect(() => {
    if (!preferredName.trim() || preferredName === rememberedName) {
      return;
    }

    setRememberedName(preferredName);
  }, [preferredName, rememberedName]);

  useEffect(() => {
    localTranscriptRef.current = localTranscript;
  }, [localTranscript]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!callConnectedAt || status === "idle" || status === "error") {
      setCallDurationSeconds(0);
      return;
    }

    setCallDurationSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));

    const intervalId = window.setInterval(() => {
      setCallDurationSeconds(Math.max(0, Math.floor((Date.now() - callConnectedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [callConnectedAt, status]);

  useEffect(() => {
    const transcriptIsUnchanged =
      localTranscript.length === transcript.length &&
      localTranscript.every(
        (entry, index) =>
          entry.id === transcript[index]?.id &&
          entry.role === transcript[index]?.role &&
          entry.text === transcript[index]?.text,
      );

    if (transcriptIsUnchanged) {
      return;
    }

    onTranscriptChange(sessionId, localTranscript);
  }, [localTranscript, onTranscriptChange, sessionId, transcript]);

  useEffect(() => {
    if (!rememberedName.trim() || rememberedName === preferredName) {
      return;
    }

    onPreferredNameChange(sessionId, rememberedName.trim());
  }, [onPreferredNameChange, preferredName, rememberedName, sessionId]);

  useEffect(() => () => cleanupSession(), []);

  function cleanupSession() {
    intentionalCloseRef.current = true;

    if (ringToneTimerRef.current !== null) {
      window.clearTimeout(ringToneTimerRef.current);
      ringToneTimerRef.current = null;
    }

    if (pendingResponseTimerRef.current !== null) {
      window.clearTimeout(pendingResponseTimerRef.current);
      pendingResponseTimerRef.current = null;
    }

    if (analyserFrameRef.current !== null) {
      window.cancelAnimationFrame(analyserFrameRef.current);
      analyserFrameRef.current = null;
    }

    dataChannelRef.current?.close();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    void audioContextRef.current?.close().catch(() => {
      // Ignore analyzer shutdown errors.
    });
    audioContextRef.current = null;
    void uiAudioContextRef.current?.close().catch(() => {
      // Ignore UI tone shutdown errors.
    });
    uiAudioContextRef.current = null;
    analyserNodeRef.current = null;
    analyserBufferRef.current = null;

    assistantEntryIdRef.current = null;
    handledToolCallsRef.current.clear();
    activeResponseRef.current = false;
    initialGreetingRequestedRef.current = false;
    queuedResponseRequestRef.current = null;
    pendingToolOutputsRef.current = [];
    pendingTurnsRef.current.clear();
    stoppedTurnsQueueRef.current = [];
    activeSpeechEpochRef.current = 0;
    latestSpeechEpochRef.current = 0;
    speechIsActiveRef.current = false;
    currentSpeechPeakLevelRef.current = 0;
    currentMicLevelRef.current = 0;
    micNoiseFloorRef.current = 0.004;
    turnCooldownUntilRef.current = 0;
    recentAssistantDeltaSignatureRef.current = null;
    setCallConnectedAt(null);
    setCallDurationSeconds(0);
    setIsMicMuted(false);
    setToolActivity(null);
  }

  function ensureUiAudioContext() {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!uiAudioContextRef.current || uiAudioContextRef.current.state === "closed") {
      uiAudioContextRef.current = new AudioContextCtor();
    }

    return uiAudioContextRef.current;
  }

  function scheduleUiTone(
    audioContext: AudioContext,
    frequency: number,
    startDelaySeconds: number,
    durationSeconds: number,
    volume = UI_TONE_VOLUME,
  ) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const startAt = audioContext.currentTime + startDelaySeconds;
    const endAt = startAt + durationSeconds;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, endAt);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  function playPickupTone() {
    const audioContext = ensureUiAudioContext();

    if (!audioContext) {
      return;
    }

    void audioContext.resume().catch(() => {
      // Ignore browser resume issues for UI tones.
    });
    scheduleUiTone(audioContext, 920, 0, 0.12, 0.028);
    scheduleUiTone(audioContext, 690, 0.16, 0.14, 0.022);
  }

  function startRingToneLoop() {
    if (ringToneTimerRef.current !== null) {
      return;
    }

    const playRingBurst = () => {
      const audioContext = ensureUiAudioContext();

      if (audioContext) {
        void audioContext.resume().catch(() => {
          // Ignore browser resume issues for UI tones.
        });
        scheduleUiTone(audioContext, 480, 0, 0.16, 0.02);
        scheduleUiTone(audioContext, 620, 0.24, 0.2, 0.02);
      }

      ringToneTimerRef.current = window.setTimeout(playRingBurst, RING_TONE_GAP_MS);
    };

    playRingBurst();
  }

  function stopRingToneLoop() {
    if (ringToneTimerRef.current !== null) {
      window.clearTimeout(ringToneTimerRef.current);
      ringToneTimerRef.current = null;
    }
  }

  function sendRealtimeEvent(payload: Record<string, unknown>) {
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(JSON.stringify(payload));
      return true;
    }

    return false;
  }

  function setMicMutedState(nextMuted: boolean) {
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setIsMicMuted(nextMuted);
  }

  function handleConnectionLost(message: string) {
    if (intentionalCloseRef.current) {
      return;
    }

    if (statusRef.current === "idle" || statusRef.current === "error") {
      return;
    }

    cleanupSession();
    setErrorMessage(message);
    setStatus("error");
  }

  function startInitialGreeting() {
    if (initialGreetingRequestedRef.current) {
      return;
    }

    initialGreetingRequestedRef.current = true;
    stopRingToneLoop();
    playPickupTone();

    window.setTimeout(() => {
      if (statusRef.current === "error" || statusRef.current === "idle") {
        return;
      }

      requestAssistantResponse({ source: "greeting" });
    }, PICKUP_TONE_DELAY_MS);
  }

  function trackMicrophoneLevel(localStream: MediaStream) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(localStream);
    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.84;
    source.connect(analyserNode);

    audioContextRef.current = audioContext;
    analyserNodeRef.current = analyserNode;
    analyserBufferRef.current = new Uint8Array(
      new ArrayBuffer(analyserNode.fftSize),
    );

    const monitor = () => {
      const analyser = analyserNodeRef.current;
      const buffer = analyserBufferRef.current;

      if (!analyser || !buffer) {
        return;
      }

      analyser.getByteTimeDomainData(buffer);
      let sumSquares = 0;

      for (const sample of buffer) {
        const normalizedSample = (sample - 128) / 128;
        sumSquares += normalizedSample * normalizedSample;
      }

      const rms = Math.sqrt(sumSquares / buffer.length);
      currentMicLevelRef.current = rms;

      if (speechIsActiveRef.current) {
        currentSpeechPeakLevelRef.current = Math.max(currentSpeechPeakLevelRef.current, rms);
      } else if (!activeResponseRef.current) {
        const nextNoiseFloor = micNoiseFloorRef.current * 0.92 + rms * 0.08;
        micNoiseFloorRef.current = Math.min(Math.max(nextNoiseFloor, 0.0025), 0.03);
      }

      analyserFrameRef.current = window.requestAnimationFrame(monitor);
    };

    void audioContext.resume().catch(() => {
      // Browser keeps the analyzer suspended until audio starts; the monitor still runs once resumed.
    });

    analyserFrameRef.current = window.requestAnimationFrame(monitor);
  }

  function clearPendingTurnResponse() {
    if (pendingResponseTimerRef.current !== null) {
      window.clearTimeout(pendingResponseTimerRef.current);
      pendingResponseTimerRef.current = null;
    }
  }

  function isLikelySpeechLevel(level = currentMicLevelRef.current) {
    const adaptiveThreshold = Math.max(MIN_SPEECH_LEVEL, micNoiseFloorRef.current * 2.2);
    return level >= adaptiveThreshold;
  }

  function createOrUpdateTurn(itemId: string) {
    const existingTurn = pendingTurnsRef.current.get(itemId);

    if (existingTurn) {
      return existingTurn;
    }

    const stoppedTurn =
      stoppedTurnsQueueRef.current.shift() ?? {
        epoch: latestSpeechEpochRef.current || 1,
        peakLevel: currentSpeechPeakLevelRef.current,
        stoppedAt: Date.now(),
      };
    const pendingTurn: PendingRealtimeTurn = {
      itemId,
      epoch: stoppedTurn.epoch,
      peakLevel: stoppedTurn.peakLevel,
      stoppedAt: stoppedTurn.stoppedAt,
    };

    pendingTurnsRef.current.set(itemId, pendingTurn);
    return pendingTurn;
  }

  function shouldIgnoreTranscript(
    transcriptText: string,
    turn: PendingRealtimeTurn,
    confidence: number | null,
  ) {
    const normalizedTranscript = normalizeTranscriptComparisonText(transcriptText);

    if (!normalizedTranscript) {
      return true;
    }

    if (FILLER_TRANSCRIPTS.has(normalizedTranscript)) {
      return true;
    }

    if (
      transcriptLooksLikeAssistantEcho(
        transcriptText,
        localTranscriptRef.current,
        lastAssistantSpeechAtRef.current,
      )
    ) {
      return true;
    }

    if (confidence !== null && confidence < MIN_TRANSCRIPT_PROBABILITY) {
      return true;
    }

    if (
      normalizedTranscript.length < MIN_TRANSCRIPT_CHARACTERS &&
      (confidence === null || confidence < MIN_SHORT_TRANSCRIPT_PROBABILITY) &&
      !isLikelySpeechLevel(turn.peakLevel)
    ) {
      return true;
    }

    return !isLikelySpeechLevel(turn.peakLevel) && confidence !== null && confidence < 0.7;
  }

  function trySendQueuedResponse(request: QueuedResponseRequest | null) {
    if (!request) {
      return;
    }

    if (activeResponseRef.current) {
      queuedResponseRequestRef.current = request;
      return;
    }

    if (request.source === "turn" && request.itemId) {
      const pendingTurn = pendingTurnsRef.current.get(request.itemId);

      if (
        !pendingTurn ||
        pendingTurn.ignored ||
        pendingTurn.responded ||
        pendingTurn.epoch !== latestSpeechEpochRef.current ||
        speechIsActiveRef.current
      ) {
        queuedResponseRequestRef.current = null;
        return;
      }
    }

    const sent = sendRealtimeEvent({ type: "response.create" });

    if (!sent) {
      queuedResponseRequestRef.current = request;
      return;
    }

    queuedResponseRequestRef.current = null;
    activeResponseRef.current = true;
    turnCooldownUntilRef.current = Date.now() + TURN_RESPONSE_COOLDOWN_MS;

    if (request.source === "turn" && request.itemId) {
      const pendingTurn = pendingTurnsRef.current.get(request.itemId);

      if (pendingTurn) {
        pendingTurn.responded = true;
        pendingTurn.scheduled = false;
      }
    }

    setStatus("responding");
  }

  function requestAssistantResponse(request: QueuedResponseRequest = { source: "tool" }) {
    trySendQueuedResponse(request);
  }

  function queueTurnResponse(itemId: string) {
    const pendingTurn = pendingTurnsRef.current.get(itemId);

    if (
      !pendingTurn ||
      pendingTurn.ignored ||
      pendingTurn.responded ||
      pendingTurn.epoch !== latestSpeechEpochRef.current ||
      speechIsActiveRef.current
    ) {
      return;
    }

    clearPendingTurnResponse();
    pendingTurn.scheduled = true;
    const continuationHoldDelay = pendingTurn.transcript
      ? getContinuationHoldDelay(pendingTurn.transcript)
      : 0;

    const waitUntil = Math.max(
      pendingTurn.stoppedAt + RESPONSE_DEBOUNCE_MS + continuationHoldDelay,
      turnCooldownUntilRef.current,
    );
    const delay = Math.max(0, waitUntil - Date.now());

    pendingResponseTimerRef.current = window.setTimeout(() => {
      pendingResponseTimerRef.current = null;
      const latestPendingTurn = pendingTurnsRef.current.get(itemId);

      if (
        !latestPendingTurn ||
        latestPendingTurn.ignored ||
        latestPendingTurn.responded ||
        latestPendingTurn.epoch !== latestSpeechEpochRef.current ||
        speechIsActiveRef.current
      ) {
        return;
      }

      latestPendingTurn.scheduled = false;
      requestAssistantResponse({ source: "turn", itemId });
    }, delay);
  }

  function interruptAssistantResponse() {
    clearPendingTurnResponse();
    queuedResponseRequestRef.current = null;

    if (!activeResponseRef.current) {
      return;
    }

    sendRealtimeEvent({ type: "response.cancel" });
    sendRealtimeEvent({ type: "output_audio_buffer.clear" });
    assistantEntryIdRef.current = null;
    setStatus("listening");
  }

  function queueFunctionCallOutput(callId: string, output: Record<string, unknown>) {
    const serializedOutput = JSON.stringify(output);

    if (
      activeResponseRef.current ||
      !sendRealtimeEvent({
        type: "conversation.item.create",
        item: {
          type: "function_call_output",
          call_id: callId,
          output: serializedOutput,
        },
      })
    ) {
      pendingToolOutputsRef.current = [
        ...pendingToolOutputsRef.current,
        { callId, output: serializedOutput },
      ];
      queuedResponseRequestRef.current = { source: "tool" };
      return;
    }

    requestAssistantResponse({ source: "tool" });
  }

  function flushPendingRealtimeActions() {
    if (activeResponseRef.current) {
      return;
    }

    if (pendingToolOutputsRef.current.length > 0) {
      const pendingOutputs = pendingToolOutputsRef.current;
      pendingToolOutputsRef.current = [];

      for (const pendingOutput of pendingOutputs) {
        const sent = sendRealtimeEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: pendingOutput.callId,
            output: pendingOutput.output,
          },
        });

        if (!sent) {
          pendingToolOutputsRef.current = [
            pendingOutput,
            ...pendingToolOutputsRef.current,
          ];
          queuedResponseRequestRef.current = { source: "tool" };
          return;
        }
      }

      requestAssistantResponse({ source: "tool" });
      return;
    }

    if (queuedResponseRequestRef.current) {
      trySendQueuedResponse(queuedResponseRequestRef.current);
    }
  }

  function appendAssistantDelta(delta: string, itemId?: string) {
    if (!delta) {
      return;
    }

    const nextId = itemId ?? assistantEntryIdRef.current ?? crypto.randomUUID();
    const signature = `${nextId}:${delta}`;
    const lastSignature = recentAssistantDeltaSignatureRef.current;

    if (
      lastSignature &&
      lastSignature.signature === signature &&
      Date.now() - lastSignature.at < 240
    ) {
      return;
    }

    recentAssistantDeltaSignatureRef.current = { signature, at: Date.now() };
    assistantEntryIdRef.current = nextId;
    lastAssistantSpeechAtRef.current = Date.now();

    setLocalTranscript((current) => {
      const existingIndex = current.findIndex((entry) => entry.id === nextId);

      if (existingIndex === -1) {
        return trimPersistedTranscript([
          ...current,
          { id: nextId, role: "assistant", text: delta },
        ]);
      }

      const next = [...current];
      next[existingIndex] = {
        ...next[existingIndex],
        text: `${next[existingIndex].text}${delta}`,
      };
      return trimPersistedTranscript(next);
    });
  }

  async function executeRealtimeTool(
    name: string,
    rawInput: unknown,
  ): Promise<Record<string, unknown>> {
    if (name === "remember_preferred_name") {
      const output = getRememberedPreferredNameResult(rawInput as RememberPreferredNameToolInput);
      const nextName = normalizePreferredName(output.preferredName);

      if (nextName) {
        setRememberedName(nextName);
        setSubmissionNotice(
          language === "urdu"
            ? `${nextName}، ہم نے آپ کا نام اسی براؤزر میں یاد رکھ لیا ہے۔`
            : `${nextName}, we have saved your name in this browser so the conversation can continue more naturally.`,
        );
      }

      return output;
    }

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
      toolName === "remember_preferred_name"
        ? language === "urdu"
          ? "ہم آپ کا نام محفوظ کر رہے ہیں..."
          : "We are saving your name..."
        : toolName === "book_session"
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
      queueFunctionCallOutput(callId, output);
    } catch (error) {
      queueFunctionCallOutput(callId, {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "The tool call failed unexpectedly.",
      });
    }
  }

  function handleRealtimeEvent(event: unknown) {
    if (!event || typeof event !== "object" || !("type" in event)) {
      return;
    }

    const payload = event as Record<string, unknown>;
    const type = typeof payload.type === "string" ? payload.type : "";

    if (type === "input_audio_buffer.speech_started") {
      latestSpeechEpochRef.current += 1;
      activeSpeechEpochRef.current = latestSpeechEpochRef.current;
      speechIsActiveRef.current = true;
      currentSpeechPeakLevelRef.current = currentMicLevelRef.current;
      clearPendingTurnResponse();
      queuedResponseRequestRef.current = null;

      const likelyEchoStart =
        Date.now() - lastAssistantSpeechAtRef.current < ECHO_GUARD_WINDOW_MS &&
        !isLikelySpeechLevel(currentMicLevelRef.current);

      if (activeResponseRef.current && !likelyEchoStart && isLikelySpeechLevel()) {
        interruptAssistantResponse();
      }

      setStatus("listening");
      return;
    }

    if (type === "input_audio_buffer.speech_stopped") {
      speechIsActiveRef.current = false;
      stoppedTurnsQueueRef.current.push({
        epoch: activeSpeechEpochRef.current || latestSpeechEpochRef.current || 1,
        peakLevel: currentSpeechPeakLevelRef.current,
        stoppedAt: Date.now(),
      });
      currentSpeechPeakLevelRef.current = 0;
      setStatus(activeResponseRef.current ? "responding" : "listening");
      return;
    }

    if (type === "input_audio_buffer.committed") {
      const itemId =
        typeof payload.item_id === "string"
          ? payload.item_id
          : typeof payload.previous_item_id === "string"
            ? payload.previous_item_id
            : "";

      if (itemId) {
        createOrUpdateTurn(itemId);
      }

      return;
    }

    if (type === "response.created") {
      activeResponseRef.current = true;
      setStatus("responding");
      return;
    }

    if (type === "response.done") {
      activeResponseRef.current = false;
      lastAssistantSpeechAtRef.current = Date.now();
      assistantEntryIdRef.current = null;
      setStatus("listening");
      setToolActivity(null);
      flushPendingRealtimeActions();
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
      const itemId =
        typeof payload.item_id === "string" ? payload.item_id : crypto.randomUUID();
      const transcriptText =
        typeof payload.transcript === "string" ? payload.transcript.trim() : "";
      const confidence = probabilityFromAverageLogprob(extractAverageLogprob(payload));
      const pendingTurn = createOrUpdateTurn(itemId);

      if (!transcriptText) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      if (pendingTurn.epoch !== latestSpeechEpochRef.current) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      if (shouldIgnoreTranscript(transcriptText, pendingTurn, confidence)) {
        pendingTurn.ignored = true;
        setStatus("listening");
        return;
      }

      pendingTurn.transcript = transcriptText;
      pendingTurn.confidence = confidence;

      setLocalTranscript((current) => {
        const existingIndex = current.findIndex((entry) => entry.id === itemId);

        if (existingIndex === -1) {
          const lastEntry = current[current.length - 1];

          if (lastEntry?.role === "user") {
            const mergedTranscript = `${lastEntry.text.trim()} ${transcriptText}`.trim();
            const next = [...current];
            next[next.length - 1] = {
              ...lastEntry,
              text: mergedTranscript,
            };
            return trimPersistedTranscript(next);
          }

          return trimPersistedTranscript([
            ...current,
            {
              id: itemId,
              role: "user",
              text: transcriptText,
            },
          ]);
        }

        const next = [...current];
        next[existingIndex] = {
          ...next[existingIndex],
          role: "user",
          text: transcriptText,
        };
        return trimPersistedTranscript(next);
      });

      if (!speechIsActiveRef.current) {
        queueTurnResponse(itemId);
        setStatus(activeResponseRef.current ? "responding" : "listening");
      }

      return;
    }

    if (type === "conversation.item.input_audio_transcription.failed") {
      const itemId =
        typeof payload.item_id === "string" ? payload.item_id : null;

      if (itemId) {
        const pendingTurn = createOrUpdateTurn(itemId);
        pendingTurn.ignored = true;
      }

      setStatus(activeResponseRef.current ? "responding" : "listening");
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
      const lowerError = error.toLowerCase();

      if (lowerError.includes("active response in progress")) {
        activeResponseRef.current = true;
        setStatus("responding");
        return;
      }

      if (
        lowerError.includes("no active response") ||
        lowerError.includes("nothing to cancel") ||
        lowerError.includes("buffer is empty")
      ) {
        return;
      }

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
    handledToolCallsRef.current.clear();
    intentionalCloseRef.current = false;
    initialGreetingRequestedRef.current = false;
    setCallConnectedAt(null);
    setCallDurationSeconds(0);
    setIsMicMuted(false);
    stopRingToneLoop();
    setStatus("requesting");

    try {
      const localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
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
        setCallConnectedAt(Date.now());
        setStatus("connected");
        startInitialGreeting();
      };

      dataChannel.onerror = () => {
        handleConnectionLost(
          language === "urdu"
            ? "کال غیر متوقع طور پر منقطع ہو گئی۔"
            : "The call disconnected unexpectedly.",
        );
      };

      dataChannel.onclose = () => {
        handleConnectionLost(
          language === "urdu"
            ? "کال منقطع ہو گئی۔ نئی کال شروع کر کے دوبارہ کوشش کریں۔"
            : "The call line closed unexpectedly. Please start a fresh call.",
        );
      };

      peerConnection.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onconnectionstatechange = () => {
        const connectionState = peerConnection.connectionState;

        if (connectionState === "failed" || connectionState === "disconnected") {
          handleConnectionLost(
            language === "urdu"
              ? "کال لائن برقرار نہیں رہ سکی۔ براہ کرم دوبارہ کوشش کریں۔"
              : "The call line could not stay connected. Please try again.",
          );
        }
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });
      trackMicrophoneLevel(localStream);
      setMicMutedState(false);

      setStatus("connecting");
      startRingToneLoop();

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

      const query = new URLSearchParams({
        focus: "general-support",
        language,
        mode,
        preferredName: rememberedName,
        resumeContext: buildVoiceResumeContext(localTranscript),
        voice: voiceId,
      });

      const realtimeResponse = await fetch(`/api/realtime/session?${query.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: localSdp,
      });

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
    setErrorMessage(null);
    setStatus("idle");
  }

  const selectedVoiceLabel =
    REALTIME_VOICE_OPTIONS.find((voice) => voice.id === voiceId)?.label ?? voiceId;
  const lastAssistantGuidance = useMemo(
    () => [...localTranscript].reverse().find((entry) => entry.role === "assistant") ?? null,
    [localTranscript],
  );
  const userTranscriptTexts = useMemo(
    () => localTranscript.filter((entry) => entry.role === "user").map((entry) => entry.text),
    [localTranscript],
  );
  const careSignal = useMemo(
    () => analyzeVoiceCareSignals(userTranscriptTexts),
    [userTranscriptTexts],
  );
  const callIsStarting = status === "requesting" || status === "connecting";
  const callIsLive =
    status === "connected" || status === "listening" || status === "responding";
  const starterPrompts =
    language === "urdu"
      ? [
          "مجھے craving ہو رہی ہے اور مجھے ابھی محفوظ اگلا قدم چاہیے۔",
          "rehab کے بعد warning signs بڑھ رہی ہیں، گھر میں ہمیں کیا کرنا چاہیے؟",
          "میں خاندان سے ہوں اور enabling کے بغیر مدد کرنا چاہتا ہوں۔",
        ]
      : [
          "I am having cravings and need a safe next step right now.",
          "Warning signs are showing up after rehab. What should we do at home?",
          "I am a family member and want to help without enabling.",
        ];
  const guidancePreview = lastAssistantGuidance?.text
    ? lastAssistantGuidance.text.length > 300
      ? `${lastAssistantGuidance.text.slice(0, 300).trimEnd()}...`
      : lastAssistantGuidance.text
    : "";

  return (
    <section className="mx-auto max-w-3xl space-y-4">
      <audio ref={audioRef} autoPlay />

      <section className="relative overflow-hidden rounded-[38px] border border-white/80 bg-white/94 px-5 py-6 shadow-[0_20px_70px_rgba(47,24,32,0.07)] backdrop-blur sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(101,19,40,0.06),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(255,248,250,0.92),_transparent_28%)]" />

        <div className="relative">
          <div className="mx-auto max-w-2xl text-center">
            <div className="section-kicker bg-white/85">
              {language === "urdu"
                ? "ولنگ ویز relapse prevention line"
                : "Willing Ways relapse prevention line"}
            </div>

            <h1
              className={`mt-5 text-[2.4rem] font-semibold leading-[1.05] text-slate-950 sm:text-[3.35rem] ${
                language === "urdu" ? "font-urdu" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu"
                ? "ایک پرسکون کال، فوری رہنمائی اور اگلا محفوظ قدم"
                : "A calm call, immediate guidance, and the next safe step"}
            </h1>

            <p
              className={`mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600 ${
                language === "urdu" ? "font-urdu" : ""
              }`}
              dir={language === "urdu" ? "rtl" : "ltr"}
            >
              {language === "urdu"
                ? "یہ اے آئی مریض اور خاندان دونوں کے لئے cravings، relapse warning signs، post-rehab follow-through اور family boundaries میں رہنمائی دیتی ہے۔"
                : "This AI helps patients and families with cravings, relapse warning signs, post-rehab follow-through, and family boundaries."}
            </p>
          </div>

          <div className="mx-auto mt-7 max-w-2xl rounded-[34px] border border-[#ead6dc] bg-[#fdf9fa] px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6 sm:py-6">
            <div className="flex items-center justify-between gap-3">
              <div
                className={`text-left ${language === "urdu" ? "font-urdu text-right" : ""}`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  {language === "urdu"
                    ? "ولنگ ویز اے آئی counselor"
                    : "Willing Ways AI Counselor"}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  {language === "urdu"
                    ? "professionally guided relapse prevention support"
                    : "Professionally guided relapse-prevention support"}
                </div>
              </div>

              {callIsLive ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ead6dc] bg-white px-3 py-2 text-sm font-semibold text-[#651328] shadow-sm">
                  <Clock3 className="h-4 w-4" />
                  {formatCallDuration(callDurationSeconds)}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              <div
                className={`voice-orb h-32 w-32 ${
                  callIsLive ? "voice-orb-live" : callIsStarting ? "voice-orb-ringing" : ""
                }`}
              >
                <Image
                  src={SITE_MEDIA.logo}
                  alt="Willing Ways"
                  width={110}
                  height={110}
                  className="h-16 w-auto object-contain"
                  unoptimized
                />
              </div>

              <div
                className={`voice-wave ${
                  callIsLive
                    ? "voice-wave-live"
                    : callIsStarting
                      ? "voice-wave-ringing"
                      : "voice-wave-idle"
                }`}
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className="voice-wave-bar"
                    style={{ animationDelay: `${index * 0.12}s` }}
                  />
                ))}
              </div>

              <div className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-[#8a4b5d]">
                {getStatusLabel(status, language)}
              </div>
              <div
                className={`mt-3 max-w-xl text-base leading-7 text-slate-600 ${
                  language === "urdu" ? "font-urdu" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {getStatusDescription(status, language)}
              </div>
            </div>

            {rememberedName ? (
              <div
                className={`mt-5 inline-flex items-center gap-2 rounded-full border border-[#ead6dc] bg-white px-4 py-2 text-sm font-semibold text-[#651328] shadow-sm ${
                  language === "urdu" ? "font-urdu" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <UserRound className="h-4 w-4" />
                {language === "urdu"
                  ? `ہم آپ کو ${rememberedName} کہہ کر مخاطب کریں گے`
                  : `We will address you as ${rememberedName}`}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                language === "urdu"
                  ? "اے آئی پہلے سلام اور نام سے آغاز کرے گی"
                  : "The AI greets and starts with your name",
                language === "urdu"
                  ? "اردو، انگریزی، پاکستانی پنجابی"
                  : "English, Urdu, Pakistani Punjabi",
                language === "urdu"
                  ? "cravings، family conflict، post-rehab support"
                  : "Cravings, family conflict, post-rehab support",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/90 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm"
                >
                  {item}
                </span>
              ))}
            </div>

            {status === "idle" || status === "error" ? (
              <Button onClick={startSession} className="mt-6 h-12 w-full text-base shadow-sm">
                <PhoneCall className="h-4 w-4" />
                {language === "urdu"
                  ? "relapse prevention line کو کال کریں"
                  : "Call the relapse prevention line"}
              </Button>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMicMutedState(!isMicMuted)}
                  className="h-12 border-[#d6c4ca] bg-white text-base shadow-sm"
                >
                  {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {language === "urdu"
                    ? isMicMuted
                      ? "مائیک آن کریں"
                      : "مائیک خاموش کریں"
                    : isMicMuted
                      ? "Unmute mic"
                      : "Mute mic"}
                </Button>
                <Button
                  variant="outline"
                  onClick={stopSession}
                  className="h-12 border-[#d6c4ca] bg-white text-base shadow-sm"
                >
                  <PhoneOff className="h-4 w-4" />
                  {language === "urdu" ? "کال ختم کریں" : "End the call"}
                </Button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowVoiceOptions((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#651328]"
              >
                <Volume2 className="h-4 w-4" />
                <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                  {language === "urdu"
                    ? `کال options (${selectedVoiceLabel})`
                    : `Call options (${selectedVoiceLabel})`}
                </span>
                {showVoiceOptions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              <Link href="/chat" className="site-inline-link">
                <MessageSquare className="h-4 w-4" />
                <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                  {language === "urdu" ? "اگر چاہیں تو لکھ کر بات کریں" : "Prefer typing? Open text chat"}
                </span>
              </Link>
            </div>

            {showVoiceOptions ? (
              <label className="mt-4 block space-y-2">
                <div
                  className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 ${
                    language === "urdu" ? "font-urdu justify-end normal-case" : ""
                  }`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <Volume2 className="h-4 w-4 text-primary" />
                  {language === "urdu"
                    ? `آواز منتخب کریں (${selectedVoiceLabel})`
                    : `Choose a voice (${selectedVoiceLabel})`}
                </div>
                <select
                  className="flex h-12 w-full rounded-2xl border border-white/90 bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-sm outline-none transition focus:border-primary/35 disabled:cursor-not-allowed disabled:opacity-60"
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
            ) : null}

            {toolActivity ? (
              <div
                className={`mt-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {toolActivity}
              </div>
            ) : null}

            {submissionNotice ? (
              <div
                className={`mt-4 flex items-start gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submissionNotice}</span>
              </div>
            ) : null}

            {lastAssistantGuidance ? (
              <div
                className={`mt-4 rounded-[22px] border border-[#ead6dc] bg-white px-4 py-4 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                  {language === "urdu" ? "آج کا اگلا قدم" : "Today's next step"}
                </div>
                <div className="mt-2 text-base leading-7 text-slate-800">{guidancePreview}</div>
              </div>
            ) : null}

            {careSignal && careSignal.severity !== "normal" ? (
              <div
                className={`mt-4 rounded-[20px] border px-4 py-3 text-sm leading-7 ${
                  careSignal.severity === "urgent"
                    ? "border-rose-200 bg-rose-50 text-rose-950"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                } ${language === "urdu" ? "font-urdu text-right" : ""}`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="h-4 w-4" />
                  {language === "urdu"
                    ? "اس گفتگو میں اہم care cues نظر آ رہے ہیں"
                    : "This conversation is showing important care cues"}
                </div>
                <div className="mt-2">
                  {careSignal.severity === "urgent"
                    ? language === "urdu"
                      ? "فوری خطرے کے اشارے موجود ہیں۔ 1122 یا 0300-7413639 کو ترجیح دیں۔"
                      : "Urgent-risk cues are present. Prioritize 1122 or 0300-7413639."
                    : language === "urdu"
                      ? "distress، privacy یا relapse cues موجود ہیں، اس لئے اگلا قدم احتیاط سے لیا جائے گا۔"
                      : "Distress, privacy, or relapse cues are present, so the next step should be handled carefully."}
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div
                className={`mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 ${
                  language === "urdu" ? "font-urdu text-right" : ""
                }`}
                dir={language === "urdu" ? "rtl" : "ltr"}
              >
                {errorMessage}
              </div>
            ) : null}

            <div className="mt-6 border-t border-[#ead6dc] pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                  className={`${language === "urdu" ? "font-urdu text-right" : ""}`}
                  dir={language === "urdu" ? "rtl" : "ltr"}
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a4b5d]">
                    {language === "urdu" ? "کال نوٹس" : "Call notes"}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {localTranscript.length > 0
                      ? language === "urdu"
                        ? "آپ کی پچھلی گفتگو اسی براؤزر میں محفوظ رہتی ہے تاکہ آپ اگلی بار وہیں سے بات جاری رکھ سکیں۔"
                        : "Your previous call notes stay in this browser so you can continue later."
                      : language === "urdu"
                        ? "اگر سمجھ نہ آئے کہ کہاں سے شروع کریں تو نیچے دیے گئے جملوں میں سے کسی ایک سے آغاز کریں۔"
                        : "If you are not sure how to begin, start with one of the prompts below."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotes((current) => !current)}
                  className="site-action-link justify-center self-start sm:self-auto"
                >
                  {showNotes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
                    {showNotes
                      ? language === "urdu"
                        ? "نوٹس بند کریں"
                        : "Hide notes"
                      : language === "urdu"
                        ? "نوٹس دیکھیں"
                        : "View notes"}
                  </span>
                </button>
              </div>

              {localTranscript.length === 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {starterPrompts.map((prompt) => (
                    <div
                      key={prompt}
                      className={`rounded-[22px] border border-white/90 bg-white px-4 py-4 text-sm leading-7 text-slate-600 shadow-sm ${
                        language === "urdu" ? "font-urdu text-right" : ""
                      }`}
                      dir={language === "urdu" ? "rtl" : "ltr"}
                    >
                      {prompt}
                    </div>
                  ))}
                </div>
              ) : showNotes ? (
                <div className="mt-4 grid gap-3">
                  {localTranscript.slice(-8).map((entry) => (
                    <div
                      key={entry.id}
                      className={`rounded-[22px] border px-4 py-4 ${
                        entry.role === "assistant"
                          ? "border-white/80 bg-white"
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
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
