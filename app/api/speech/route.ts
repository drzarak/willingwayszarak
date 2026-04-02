import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";

export const maxDuration = 30;

const TTS_RATE_LIMIT = {
  limit: 24,
  windowMs: 5 * 60 * 1000,
};

interface SpeechRequestBody {
  audience?: "patient" | "family" | "staff" | "classroom";
  language?: "english" | "urdu";
  text?: string;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 2400);
}

function buildSpeechInstructions(
  language: SpeechRequestBody["language"],
  audience: SpeechRequestBody["audience"],
) {
  const audienceDirection =
    audience === "family"
      ? "Speak like a warm family coach helping someone carry stress without shame."
      : audience === "staff"
        ? "Speak like a calm senior psychologist teaching staff with clarity and steady authority."
        : audience === "classroom"
          ? "Speak like an emotionally intelligent teacher in an auditorium: clear, slightly slower, and easy to follow on speakers."
          : "Speak like a calm psychologist helping a patient feel grounded and safe.";

  const languageDirection =
    language === "urdu"
      ? "If the text is in Urdu or Pakistani Punjabi, pronounce it with Pakistan-context pronunciation and natural pauses."
      : "If the text contains Urdu, Roman Urdu, or Pakistani Punjabi, preserve the Pakistan-context pronunciation as naturally as possible.";

  return [
    "You are reading aloud a response from Dr Sadaqat GPT for Willing Ways Pakistan.",
    audienceDirection,
    languageDirection,
    "Keep the tone warm, steady, shame-sensitive, and emotionally present.",
    "Do not sound theatrical, robotic, or overly excited.",
    "Use a gentle, reassuring cadence with clean pronunciation and small natural pauses.",
  ].join(" ");
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const rateLimitResult = checkRateLimit(request, "speech", TTS_RATE_LIMIT);
  const headers = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return new Response(
      "Too many read-aloud requests are coming from this connection right now. Please wait a moment and try again.",
      {
        status: 429,
        headers,
      },
    );
  }

  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY on the server.", {
      status: 503,
      headers,
    });
  }

  let body: SpeechRequestBody;

  try {
    body = (await request.json()) as SpeechRequestBody;
  } catch {
    return new Response("Invalid speech request payload.", {
      status: 400,
      headers,
    });
  }

  const text = normalizeText(body.text);

  if (text.length < 2) {
    return new Response("Please include text to read aloud.", {
      status: 400,
      headers,
    });
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: text,
      instructions: buildSpeechInstructions(body.language, body.audience),
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const message = (await response.text()).trim() || "The read-aloud audio could not be created right now.";

    return new Response(message, {
      status: response.status,
      headers,
    });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      ...headers,
      "Cache-Control": "private, max-age=3600",
      "Content-Type": response.headers.get("content-type") ?? "audio/mpeg",
      "X-AI-Voice-Disclosure": "This audio uses an AI-generated voice.",
    },
  });
}
