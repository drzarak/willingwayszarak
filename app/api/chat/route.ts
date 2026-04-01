import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateText,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";

import {
  analyzeVoiceCareSignals,
  getMessageText,
  type ChatLanguage,
  type ChatMode,
  type ModelId,
} from "@/lib/chat";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";
import { composeSystemPrompt } from "@/lib/willing-ways-prompt";
import {
  BOOK_SESSION_TOOL_PARAMETERS,
  CRISIS_REDIRECT_TOOL_PARAMETERS,
  ESCALATE_TO_HUMAN_TOOL_PARAMETERS,
  GET_CONTACT_TOOL_PARAMETERS,
  REMEMBER_PREFERRED_NAME_TOOL_PARAMETERS,
  SEND_RESOURCE_TOOL_PARAMETERS,
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

export const maxDuration = 30;

const ALLOWED_MODELS = new Set<ModelId>(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]);
const ALLOWED_MODES = new Set<ChatMode>(["adaptive", "patient", "doctor"]);
const ALLOWED_LANGUAGES = new Set<ChatLanguage>(["english", "urdu"]);
const CHAT_RATE_LIMIT = {
  limit: 18,
  windowMs: 5 * 60 * 1000,
};

interface ChatRequestBody {
  id?: string;
  language?: ChatLanguage;
  messageId?: string;
  messages?: UIMessage[];
  mode?: ChatMode;
  modelId?: ModelId;
  preferredName?: string;
  responseMode?: "json" | "stream";
  resumeContext?: string;
  trigger?: string;
}

function createAssistantTextMessage(text: string): UIMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts: [
      {
        type: "text",
        text,
        state: "done",
      },
    ],
  };
}

function createAssistantJsonMessage(
  text: string,
  toolResults: ReadonlyArray<{
    type?: string;
    toolCallId?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
  } | undefined>,
  language: ChatLanguage,
): UIMessage {
  const normalizedText = text.trim();
  const parts: UIMessage["parts"] = normalizedText
    ? [
        {
          type: "text",
          text: normalizedText,
          state: "done",
        } as UIMessage["parts"][number],
      ]
    : [];

  for (const result of toolResults) {
    if (
      result?.type !== "tool-result" ||
      typeof result.toolName !== "string" ||
      typeof result.toolCallId !== "string"
    ) {
      continue;
    }

    parts.push({
      type: `tool-${result.toolName}`,
      toolCallId: result.toolCallId,
      state: "output-available",
      input: result.input,
      output: result.output,
    } as UIMessage["parts"][number]);
  }

  if (parts.length === 0) {
    parts.push({
      type: "text",
      text:
        language === "urdu"
          ? "میں نے آپ کے لئے اگلا مفید قدم تیار کر دیا ہے۔"
          : "I have prepared the next useful step for you.",
      state: "done",
    } as UIMessage["parts"][number]);
  }

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    parts,
  };
}

function extractPreferredNameFromToolResults(
  toolResults: ReadonlyArray<{
    toolName?: string;
    output?: unknown;
  } | undefined>,
) {
  for (const result of toolResults) {
    if (
      result?.toolName === "remember_preferred_name" &&
      typeof (result.output as { preferredName?: unknown } | undefined)?.preferredName === "string"
    ) {
      const preferredName = (
        result.output as { preferredName: string }
      ).preferredName.trim();

      if (preferredName) {
        return preferredName;
      }
    }
  }

  return "";
}

function getDeterministicCrisisText(language: ChatLanguage) {
  return language === "urdu"
    ? "مجھے ابھی آپ کی فوری حفاظت کی فکر ہے۔ اگر اوورڈوز، خودکشی، خود کو نقصان، یا تشدد کا خطرہ ہے تو ابھی 1122 یا نزدیک ترین ایمرجنسی سے رابطہ کریں۔ ولنگ ویز کے لئے 0300-7413639 پر بھی فوراً کال کریں۔ جیسے ہی فوری حفاظتی قدم اٹھا لیا جائے، ہم اگلے مرحلے میں مدد کریں گے۔"
    : "I am really concerned about immediate safety right now. If there is overdose, suicide risk, self-harm risk, or violence risk, contact 1122 or the nearest emergency room now. Please also call Willing Ways immediately on 0300-7413639. As soon as that immediate safety step has been taken, we can help with the next step.";
}

function createChatTools(request: Request, bookingConfigured: boolean) {
  return {
    ...(bookingConfigured
      ? {
          book_session: tool({
            description:
              "Use when the user wants a session, callback, intervention planning, counseling, admission guidance, or human follow-up and you have the minimum details plus explicit consent to share them with the Willing Ways team.",
            inputSchema: jsonSchema<BookSessionToolInput>(BOOK_SESSION_TOOL_PARAMETERS),
            execute: async (input: BookSessionToolInput) => {
              if (!input.consentConfirmed) {
                return {
                  ok: false,
                  needsConsent: true,
                  message:
                    "Explicit permission to note this request for the Willing Ways team is still required before booking.",
                };
              }

              const bookingRequest = buildBookingPayloadFromToolInput(input);
              const response = await fetch(new URL("/api/booking", request.url), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(bookingRequest),
              });

              const data = (await response.json().catch(() => null)) as
                | { error?: string; ok?: boolean }
                | null;

              if (!response.ok) {
                return {
                  ok: false,
                  message:
                    data?.error ??
                    "The request could not be noted right now. Ask the user to call 0300-7413639 if it is urgent.",
                };
              }

              return {
                ok: true,
                status: "noted",
                message:
                  "The request has been noted for the Willing Ways team. They should follow up within about 24 hours on the provided contact route.",
                helpline: "0300-7413639",
              };
            },
          }),
        }
      : {}),
    get_contact: tool({
      description:
        "Use when the user asks for a phone number, branch contact, city, address, or general helpline information.",
      inputSchema: jsonSchema<ContactToolInput>(GET_CONTACT_TOOL_PARAMETERS),
      execute: async (input: ContactToolInput) => getContactResult(input),
    }),
    crisis_redirect: tool({
      description:
        "Use immediately for suicide, self-harm, overdose, violent relapse, or immediate psychiatric danger.",
      inputSchema: jsonSchema<CrisisRedirectToolInput>(CRISIS_REDIRECT_TOOL_PARAMETERS),
      execute: async (input: CrisisRedirectToolInput) => getCrisisRedirectResult(input),
    }),
    remember_preferred_name: tool({
      description:
        "Use right after the user confirms the name they want Willing Ways AI to use for them in this conversation.",
      inputSchema: jsonSchema<RememberPreferredNameToolInput>(
        REMEMBER_PREFERRED_NAME_TOOL_PARAMETERS,
      ),
      execute: async (input: RememberPreferredNameToolInput) =>
        getRememberedPreferredNameResult(input),
    }),
    send_resource: tool({
      description:
        "Use to send short practical relapse-prevention exercises and family coaching guidance such as HALT reset, urge surfing, trigger map, daily recovery structure, calming steps, family boundaries, treatment expectations, intervention preparation, conversation rehearsal, or lapse response.",
      inputSchema: jsonSchema<SendResourceToolInput>(SEND_RESOURCE_TOOL_PARAMETERS),
      execute: async (input: SendResourceToolInput) => getSupportResourceResult(input),
    }),
    escalate_to_human: tool({
      description:
        "Use when the user insists on a real counselor or team member right now and a booking tool call is not yet possible.",
      inputSchema: jsonSchema<EscalateToHumanToolInput>(ESCALATE_TO_HUMAN_TOOL_PARAMETERS),
      execute: async (input: EscalateToHumanToolInput) => getHumanEscalationResult(input),
    }),
  };
}

function createDeterministicCrisisResponse(
  language: ChatLanguage,
  messages: UIMessage[],
  matchedCues: string[],
  headers: HeadersInit,
) {
  const crisisPlan = getCrisisRedirectResult({
    reason: matchedCues.length > 0 ? matchedCues.join(", ") : "Immediate safety concern",
  });

  const text = getDeterministicCrisisText(language);

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: ({ writer }) => {
      const textId = crypto.randomUUID();

      writer.write({ type: "start" });
      writer.write({
        type: "data-crisis-plan",
        data: crisisPlan,
        transient: true,
      });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({
    headers,
    stream,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const bookingConfigured = Boolean(
    process.env.NOTION_TOKEN?.trim() &&
      process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim(),
  );
  const rateLimitResult = checkRateLimit(request, "chat", CHAT_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return new Response(
      "Too many requests are coming from this connection right now. Please wait a moment and try again.",
      {
        status: 429,
        headers: responseHeaders,
      },
    );
  }

  if (!apiKey) {
    return new Response("Willing Ways AI is not configured on the server yet.", {
      status: 401,
      headers: responseHeaders,
    });
  }

  if (!body.modelId || !ALLOWED_MODELS.has(body.modelId)) {
    return new Response("Unsupported model selected.", {
      status: 400,
      headers: responseHeaders,
    });
  }

  if (!body.mode || !ALLOWED_MODES.has(body.mode)) {
    return new Response("Unsupported chat mode selected.", {
      status: 400,
      headers: responseHeaders,
    });
  }

  if (!body.language || !ALLOWED_LANGUAGES.has(body.language)) {
    return new Response("Unsupported chat language selected.", {
      status: 400,
      headers: responseHeaders,
    });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response("Please include at least one message.", {
      status: 400,
      headers: responseHeaders,
    });
  }

  const recentUserTexts = body.messages
    .filter((message) => message.role === "user")
    .slice(-4)
    .map((message) => getMessageText(message))
    .filter(Boolean);
  const careSignal = analyzeVoiceCareSignals(recentUserTexts);

  if (careSignal?.severity === "urgent") {
    if (body.responseMode === "json") {
      return Response.json(
        {
          crisisPlan: getCrisisRedirectResult({
            reason: careSignal.matchedCues.length > 0
              ? careSignal.matchedCues.join(", ")
              : "Immediate safety concern",
          }),
          message: createAssistantTextMessage(getDeterministicCrisisText(body.language)),
          preferredName: "",
        },
        {
          headers: responseHeaders,
        },
      );
    }

    return createDeterministicCrisisResponse(
      body.language,
      body.messages,
      careSignal.matchedCues,
      responseHeaders,
    );
  }

  try {
    const openai = createOpenAI({ apiKey });
    const preparedMessages = await convertToModelMessages(
      body.messages.map(
        (message) =>
          Object.fromEntries(
            Object.entries(message).filter(([key]) => key !== "id"),
          ) as Omit<UIMessage, "id">,
      ),
    );
    const modelConfig = {
      model: openai.chat(body.modelId),
      system: composeSystemPrompt(body.mode, body.language, {
        preferredName: normalizePreferredName(body.preferredName),
        resumeContext: typeof body.resumeContext === "string" ? body.resumeContext : "",
        surface: "chat",
      }),
      messages: preparedMessages,
      toolChoice: "auto" as const,
      tools: createChatTools(request, bookingConfigured),
      stopWhen: stepCountIs(6),
    };

    if (body.responseMode === "json") {
      const result = await generateText(modelConfig);

      return Response.json(
        {
          message: createAssistantJsonMessage(
            result.text,
            result.toolResults,
            body.language,
          ),
          preferredName: extractPreferredNameFromToolResults(result.toolResults),
        },
        {
          headers: responseHeaders,
        },
      );
    }

    const result = streamText(modelConfig);

    return result.toUIMessageStreamResponse({
      headers: responseHeaders,
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

    return new Response(message, {
      status: 500,
      headers: responseHeaders,
    });
  }
}
