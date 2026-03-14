import { type ChatLanguage, type ChatMode } from "@/lib/chat";
import { composeSystemPrompt } from "@/lib/willing-ways-prompt";

export const maxDuration = 30;

const ALLOWED_MODES = new Set<ChatMode>(["patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);

interface RealtimeSessionRequest {
  language?: ChatLanguage;
  mode?: ChatMode;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY on the server.", { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as RealtimeSessionRequest;
  const mode = body.mode ?? "patient";
  const language = body.language ?? "english";

  if (!ALLOWED_MODES.has(mode)) {
    return new Response("Unsupported realtime mode selected.", { status: 400 });
  }

  if (!ALLOWED_LANGUAGES.has(language)) {
    return new Response("Unsupported realtime language selected.", { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime",
        instructions: `${composeSystemPrompt(mode, language)}\n\nFor voice sessions, respond clearly, briefly, and in a calm spoken style.`,
        audio: {
          input: {
            turn_detection: {
              type: "server_vad",
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    return new Response(message || "Realtime session could not be created.", {
      status: response.status,
    });
  }

  const payload = (await response.json()) as {
    session?: unknown;
    value?: string;
  };

  if (!payload.value) {
    return new Response("Realtime client secret was missing from the OpenAI response.", {
      status: 502,
    });
  }

  return Response.json({
    clientSecret: payload.value,
    session: payload.session ?? null,
  });
}
