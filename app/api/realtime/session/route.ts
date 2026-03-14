import {
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
} from "@/lib/chat";
import { composeSystemPrompt } from "@/lib/willing-ways-prompt";

export const maxDuration = 30;

const ALLOWED_MODES = new Set<ChatMode>(["patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);
const ALLOWED_VOICES = new Set<RealtimeVoiceId>([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
]);

function normalizeRealtimeError(status: number, body: string) {
  const trimmedBody = body.trim();
  const lowerBody = trimmedBody.toLowerCase();

  if (trimmedBody.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmedBody) as {
        error?: { message?: string };
      };

      if (parsed.error?.message) {
        return normalizeRealtimeError(status, parsed.error.message);
      }
    } catch {
      // Fall through to string handling.
    }
  }

  if (lowerBody.includes("api version mismatch") || lowerBody.includes("api_version_mismatch")) {
    return "Realtime voice is temporarily unavailable because the session was started with mismatched Realtime API versions. Please try again after the app refreshes the voice session.";
  }

  if (trimmedBody.startsWith("<!DOCTYPE html") || trimmedBody.startsWith("<html")) {
    if (status >= 500) {
      return "OpenAI Realtime voice timed out while starting the call. Please try again in a moment.";
    }

    return "Realtime voice could not be started right now.";
  }

  if (!trimmedBody) {
    return "Realtime voice could not be started right now.";
  }

  return trimmedBody;
}

async function postRealtimeCall(
  apiKey: string,
  formData: FormData,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (response.ok || ![502, 503, 504].includes(response.status) || attempt === 1) {
      return response;
    }

    lastResponse = response;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  return (
    lastResponse ??
    new Response("Realtime voice could not be started right now.", { status: 502 })
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY on the server.", { status: 401 });
  }

  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "patient") as ChatMode;
  const language = (url.searchParams.get("language") ?? "english") as ChatLanguage;
  const voice = (url.searchParams.get("voice") ?? "alloy") as RealtimeVoiceId;

  if (!ALLOWED_MODES.has(mode)) {
    return new Response("Unsupported realtime mode selected.", { status: 400 });
  }

  if (!ALLOWED_LANGUAGES.has(language)) {
    return new Response("Unsupported realtime language selected.", { status: 400 });
  }

  if (!ALLOWED_VOICES.has(voice)) {
    return new Response("Unsupported realtime voice selected.", { status: 400 });
  }

  const sdp = await request.text();

  if (!sdp.trim()) {
    return new Response("Missing SDP offer for realtime voice.", { status: 400 });
  }

  const formData = new FormData();
  formData.set("sdp", sdp);
  formData.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: "gpt-realtime",
      instructions: `${composeSystemPrompt(mode, language)}\n\nVoice behavior: keep each spoken answer concise, calm, and natural. For spoken input, interpret ambiguous words in Pakistan context first. If the caller is speaking Urdu or Pakistani Punjabi, answer in that same language rather than Hindi or Indian Punjabi. If the caller uses Punjabi cues such as 'tusi', 'assi', 'saadi', 'kiven', or 'ae', stay in Pakistani Punjabi instead of drifting into Urdu. Do not read raw URLs, route paths, markdown syntax, or slug text aloud.`,
      audio: {
        input: {
          turn_detection: {
            type: "server_vad",
          },
        },
        output: {
          voice,
        },
      },
    }),
  );

  const response = await postRealtimeCall(apiKey, formData);

  if (!response.ok) {
    const message = normalizeRealtimeError(response.status, await response.text());
    return new Response(message, { status: response.status });
  }

  const answerSdp = await response.text();

  return new Response(answerSdp, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/sdp",
    },
    status: 200,
  });
}
