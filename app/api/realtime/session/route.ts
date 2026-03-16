import {
  DEFAULT_REALTIME_VOICE_ID,
  DEFAULT_VOICE_CALL_FOCUS_ID,
  normalizeVoiceCallFocusId,
  normalizeRealtimeVoiceId,
  type ChatLanguage,
  type ChatMode,
  type RealtimeVoiceId,
  type VoiceCallFocusId,
} from "@/lib/chat";
import {
  BOOK_SESSION_TOOL_PARAMETERS,
  CRISIS_REDIRECT_TOOL_PARAMETERS,
  ESCALATE_TO_HUMAN_TOOL_PARAMETERS,
  GET_CONTACT_TOOL_PARAMETERS,
  REMEMBER_PREFERRED_NAME_TOOL_PARAMETERS,
  SEND_RESOURCE_TOOL_PARAMETERS,
  normalizePreferredName,
} from "@/lib/support-tools";
import { composeSystemPrompt } from "@/lib/willing-ways-prompt";

export const maxDuration = 30;

const ALLOWED_MODES = new Set<ChatMode>(["adaptive", "patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);
const ALLOWED_FOCUSES = new Set<VoiceCallFocusId>([
  "general-support",
  "guided-intake",
  "family-coach",
  "crisis-triage",
  "founder-method",
  "private-intake",
]);
const ALLOWED_VOICES = new Set<RealtimeVoiceId>([
  "cedar",
  "marin",
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "sage",
  "shimmer",
  "verse",
]);
const PRIMARY_REALTIME_MODEL = "gpt-realtime-1.5";
const FALLBACK_REALTIME_MODEL = "gpt-realtime";

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
  sdp: string,
  session: string,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const formData = new FormData();
    formData.set("sdp", sdp);
    formData.set("session", session);

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

function shouldFallbackToDocumentedModel(status: number, body: string) {
  if (status < 400 || status >= 500) {
    return false;
  }

  const lowerBody = body.toLowerCase();

  return (
    lowerBody.includes(PRIMARY_REALTIME_MODEL.toLowerCase()) &&
    (lowerBody.includes("model") ||
      lowerBody.includes("unsupported") ||
      lowerBody.includes("not found") ||
      lowerBody.includes("does not exist") ||
      lowerBody.includes("invalid_value"))
  );
}

function buildRealtimeSession(
  mode: ChatMode,
  language: ChatLanguage,
  focus: VoiceCallFocusId,
  voice: RealtimeVoiceId,
  preferredName: string,
  resumeContext: string,
  model: string,
) {
  return JSON.stringify({
    type: "realtime",
    model,
    instructions: `${composeSystemPrompt(mode, language, {
      preferredName,
      resumeContext,
      surface: "voice",
      voiceFocus: focus,
    })}\n\nVoice behavior: keep each spoken answer concise, calm, and natural. For spoken input, interpret ambiguous words in Pakistan context first. If the caller is speaking Urdu or Pakistani Punjabi, answer in that same language rather than Hindi or Indian Punjabi. If the caller uses Punjabi cues such as 'tusi', 'assi', 'saadi', 'kiven', or 'ae', stay in Pakistani Punjabi instead of drifting into Urdu. Do not read raw URLs, route paths, markdown syntax, or slug text aloud. If the user wants Willing Ways to follow up, collect the minimum needed details naturally, confirm consent, then use the booking tool instead of sending them to another screen.`,
    tool_choice: "auto",
    tools: [
      {
        type: "function",
        name: "remember_preferred_name",
        description:
          "Use right after the caller confirms the name they want Willing Ways AI to use for them.",
        parameters: REMEMBER_PREFERRED_NAME_TOOL_PARAMETERS,
      },
      {
        type: "function",
        name: "book_session",
        description:
          "Use when the caller wants a session, callback, intervention planning, counseling, admission guidance, or human follow-up and you have the minimum details plus explicit consent to share them with the Willing Ways team.",
        parameters: BOOK_SESSION_TOOL_PARAMETERS,
      },
      {
        type: "function",
        name: "get_contact",
        description:
          "Use when the caller asks for helpline, branch, phone number, address, or city contact details.",
        parameters: GET_CONTACT_TOOL_PARAMETERS,
      },
      {
        type: "function",
        name: "crisis_redirect",
        description:
          "Use immediately for suicide, self-harm, overdose, violent relapse, or immediate psychiatric danger.",
        parameters: CRISIS_REDIRECT_TOOL_PARAMETERS,
      },
      {
        type: "function",
        name: "send_resource",
        description:
          "Use for short practical guidance on family conversations, intervention preparation, treatment expectations, calming steps, relapse next steps, or family follow-through.",
        parameters: SEND_RESOURCE_TOOL_PARAMETERS,
      },
      {
        type: "function",
        name: "escalate_to_human",
        description:
          "Use when the caller insists on a real team member now and a booking tool call is not yet possible.",
        parameters: ESCALATE_TO_HUMAN_TOOL_PARAMETERS,
      },
    ],
    audio: {
      input: {
        noise_reduction: {
          type: "near_field",
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice,
      },
    },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY on the server.", { status: 401 });
  }

  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "adaptive") as ChatMode;
  const language = (url.searchParams.get("language") ?? "english") as ChatLanguage;
  const focus = normalizeVoiceCallFocusId(
    url.searchParams.get("focus") ?? DEFAULT_VOICE_CALL_FOCUS_ID,
  );
  const voice = normalizeRealtimeVoiceId(url.searchParams.get("voice") ?? DEFAULT_REALTIME_VOICE_ID);
  const preferredName = normalizePreferredName(url.searchParams.get("preferredName"));
  const resumeContext = (url.searchParams.get("resumeContext") ?? "").slice(0, 900);

  if (!ALLOWED_MODES.has(mode)) {
    return new Response("Unsupported realtime mode selected.", { status: 400 });
  }

  if (!ALLOWED_LANGUAGES.has(language)) {
    return new Response("Unsupported realtime language selected.", { status: 400 });
  }

  if (!ALLOWED_FOCUSES.has(focus)) {
    return new Response("Unsupported realtime focus selected.", { status: 400 });
  }

  if (!ALLOWED_VOICES.has(voice)) {
    return new Response("Unsupported realtime voice selected.", { status: 400 });
  }

  const sdp = await request.text();

  if (!sdp.trim()) {
    return new Response("Missing SDP offer for realtime voice.", { status: 400 });
  }

  let response = await postRealtimeCall(
      apiKey,
      sdp,
      buildRealtimeSession(
        mode,
        language,
        focus,
        voice,
        preferredName,
        resumeContext,
        PRIMARY_REALTIME_MODEL,
      ),
    );

  if (!response.ok) {
    const primaryBody = await response.text();

    if (shouldFallbackToDocumentedModel(response.status, primaryBody)) {
        response = await postRealtimeCall(
          apiKey,
          sdp,
          buildRealtimeSession(
            mode,
            language,
            focus,
            voice,
            preferredName,
            resumeContext,
            FALLBACK_REALTIME_MODEL,
          ),
        );
    } else {
      const message = normalizeRealtimeError(response.status, primaryBody);
      return new Response(message, { status: response.status });
    }
  }

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
