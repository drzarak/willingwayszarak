"use client";

import { AlertTriangle, LoaderCircle, Mic, Radio, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { type ChatLanguage, type ChatMode } from "@/lib/chat";

import { Button } from "@/components/ui/button";

type VoiceStatus = "idle" | "requesting" | "connecting" | "connected" | "listening" | "responding" | "error";

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

export function RealtimeVoicePanel({
  enabled,
  language,
  mode,
}: RealtimeVoicePanelProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const assistantEntryIdRef = useRef<string | null>(null);

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
        typeof payload.error === "object" && payload.error && "message" in payload.error
          ? String((payload.error as { message?: string }).message ?? "Realtime voice failed.")
          : "Realtime voice failed.";

      setErrorMessage(error);
      setStatus("error");
    }
  }

  async function startSession() {
    if (!enabled) {
      setErrorMessage("Realtime voice is not available until the server OpenAI key is configured.");
      setStatus("error");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("This browser does not support microphone access.");
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setTranscript([]);
    setStatus("requesting");

    try {
      const tokenResponse = await fetch("/api/realtime/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ language, mode }),
      });

      if (!tokenResponse.ok) {
        throw new Error(await tokenResponse.text());
      }

      const tokenPayload = (await tokenResponse.json()) as { clientSecret?: string };

      if (!tokenPayload.clientSecret) {
        throw new Error("Realtime client secret was not returned by the server.");
      }

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
        setErrorMessage("The realtime data channel closed unexpectedly.");
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

      const realtimeResponse = await fetch("https://api.openai.com/v1/realtime?model=gpt-realtime", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenPayload.clientSecret}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

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
      setErrorMessage(error instanceof Error ? error.message : "Realtime voice could not start.");
      setStatus("error");
    }
  }

  function stopSession() {
    cleanupSession();
    setStatus("idle");
  }

  const statusLabel =
    status === "requesting"
      ? language === "urdu"
        ? "آوازی سیشن تیار کیا جا رہا ہے"
        : "Requesting a voice session"
      : status === "connecting"
        ? language === "urdu"
          ? "مائیکروفون اور آڈیو connect ہو رہے ہیں"
          : "Connecting microphone and audio"
        : status === "listening"
          ? language === "urdu"
            ? "ہم سن رہے ہیں"
            : "Listening"
          : status === "responding"
            ? language === "urdu"
              ? "اے آئی جواب دے رہی ہے"
              : "Assistant is responding"
            : status === "connected"
              ? language === "urdu"
                ? "آوازی سیشن تیار ہے، بولنا شروع کریں"
                : "Voice session ready, start speaking"
              : status === "error"
                ? language === "urdu"
                  ? "آوازی سیشن میں مسئلہ آیا"
                  : "Voice session hit an error"
                : language === "urdu"
                  ? "لائیو آواز بند ہے"
                  : "Realtime voice is idle";

  return (
    <div className="rounded-[28px] border border-[#ead6dc] bg-white/95 p-5 shadow-card backdrop-blur-xl">
      <audio ref={audioRef} autoPlay />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-[#ead6dc] bg-[#fff4f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Radio className="mr-2 h-3.5 w-3.5" />
            {language === "urdu" ? "لائیو آواز" : "Realtime voice"}
          </div>
          <div className="text-2xl font-semibold text-[#3b1725]">
            <span className={language === "urdu" ? "font-urdu" : ""} dir={language === "urdu" ? "rtl" : "ltr"}>
              {language === "urdu"
                ? "اب آپ بول کر بھی ولنگ ویز اے آئی سے بات کر سکتے ہیں"
                : "You can now talk to Willing Ways AI with live voice."}
            </span>
          </div>
          <p
            className={`max-w-2xl text-base leading-8 text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            {language === "urdu"
              ? "یہ سہولت سرور پر محفوظ OpenAI key استعمال کرتی ہے۔ ڈاکٹر موڈ اور اردو موڈ دونوں یہاں بھی کام کرتے ہیں۔"
              : "This uses the deployment’s server-side OpenAI key. Doctor mode and Urdu mode both carry through into the voice session."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:min-w-[240px]">
          {status === "idle" || status === "error" ? (
            <Button onClick={startSession}>
              <Mic className="h-4 w-4" />
              {language === "urdu" ? "آواز شروع کریں" : "Start voice"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={stopSession}>
              <Square className="h-4 w-4" />
              {language === "urdu" ? "آواز بند کریں" : "Stop voice"}
            </Button>
          )}

          <div
            className={`rounded-[22px] border border-[#ead6dc] bg-[#fff8fa] px-4 py-4 text-sm text-[#5a3743] ${
              language === "urdu" ? "font-urdu text-right" : ""
            }`}
            dir={language === "urdu" ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2 font-semibold text-[#3b1725]">
              {status === "requesting" || status === "connecting" ? (
                <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              ) : status === "error" ? (
                <AlertTriangle className="h-4 w-4 text-primary" />
              ) : (
                <Radio className="h-4 w-4 text-primary" />
              )}
              {statusLabel}
            </div>
          </div>
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
