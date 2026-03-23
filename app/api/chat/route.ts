import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  jsonSchema,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";

import { POST as submitBookingRequest } from "@/app/api/booking/route";
import { type ChatLanguage, type ChatMode, type ModelId } from "@/lib/chat";
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

interface ChatRequestBody {
  id?: string;
  language?: ChatLanguage;
  messageId?: string;
  messages?: UIMessage[];
  mode?: ChatMode;
  modelId?: ModelId;
  preferredName?: string;
  resumeContext?: string;
  trigger?: string;
}

function createChatTools(request: Request) {
  return {
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
        const response = await submitBookingRequest(
          new Request(new URL("/api/booking", request.url), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(bookingRequest),
          }),
        );

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
        "Use to send short practical relapse-prevention exercises and guidance such as HALT reset, urge surfing, trigger map, daily recovery structure, calming steps, family boundaries, treatment expectations, or lapse response.",
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
      system: composeSystemPrompt(body.mode, body.language, {
        preferredName: normalizePreferredName(body.preferredName),
        resumeContext: typeof body.resumeContext === "string" ? body.resumeContext : "",
        surface: "chat",
      }),
      messages: await convertToModelMessages(
        body.messages.map(
          (message) =>
            Object.fromEntries(
              Object.entries(message).filter(([key]) => key !== "id"),
            ) as Omit<UIMessage, "id">,
        ),
      ),
      toolChoice: "auto",
      tools: createChatTools(request),
      stopWhen: stepCountIs(6),
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
