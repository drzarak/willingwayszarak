import { createOpenAI } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { type ChatLanguage, type ChatMode, type ModelId } from "@/lib/chat";
import { composeSystemPrompt } from "@/lib/willing-ways-prompt";

export const maxDuration = 30;

const ALLOWED_MODELS = new Set<ModelId>(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]);
const ALLOWED_MODES = new Set<ChatMode>(["patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);

interface ChatRequestBody {
  id?: string;
  language?: ChatLanguage;
  messageId?: string;
  messages?: UIMessage[];
  mode?: ChatMode;
  modelId?: ModelId;
  trigger?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return new Response("Willing Ways AI is not configured on the server yet.", {
      status: 401,
    });
  }

  if (!body.modelId || !ALLOWED_MODELS.has(body.modelId)) {
    return new Response("Unsupported model selected.", { status: 400 });
  }

  if (!body.mode || !ALLOWED_MODES.has(body.mode)) {
    return new Response("Unsupported chat mode selected.", { status: 400 });
  }

  if (!body.language || !ALLOWED_LANGUAGES.has(body.language)) {
    return new Response("Unsupported chat language selected.", { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Please include at least one message.", { status: 400 });
  }

  try {
    const openai = createOpenAI({ apiKey });
    const result = streamText({
      model: openai.chat(body.modelId),
      system: composeSystemPrompt(body.mode, body.language),
      messages: await convertToModelMessages(
        body.messages.map((message) => {
          const { id, ...messageWithoutId } = message;
          if (id) {
            return messageWithoutId;
          }
          return messageWithoutId;
        }),
      ),
    });

    return result.toUIMessageStreamResponse({
      onError: (error) => {
        const message = error instanceof Error ? error.message.toLowerCase() : "";

        if (
          message.includes("api key") ||
          message.includes("401") ||
          message.includes("unauthorized")
        ) {
          return "The server-side OpenAI configuration was rejected. Please update the deployment environment and try again.";
        }

        return "Willing Ways AI could not respond right now. Please try again in a moment.";
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The request could not be completed.";

    return new Response(message, { status: 500 });
  }
}
