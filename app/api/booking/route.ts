import {
  AI_INTAKE_URGENCY_OPTIONS,
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_MAX_LENGTHS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  NOTION_API_VERSION,
  getBookingOptionLabel,
  type AiIntakePayload,
  type BookingRequestPayload,
  type BookingSourceId,
} from "@/lib/booking";
import { checkRateLimit, rateLimitHeaders } from "@/lib/server/request-guard";

export const maxDuration = 30;
const BOOKING_RATE_LIMIT = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

const RELATION_IDS: Set<string> = new Set(BOOKING_RELATION_OPTIONS.map((option) => option.id));
const BRANCH_IDS: Set<string> = new Set(BOOKING_BRANCH_OPTIONS.map((option) => option.id));
const SERVICE_IDS: Set<string> = new Set(BOOKING_SERVICE_OPTIONS.map((option) => option.id));
const CONTACT_METHOD_IDS: Set<string> = new Set(
  BOOKING_CONTACT_METHOD_OPTIONS.map((option) => option.id),
);
const LANGUAGE_IDS: Set<string> = new Set(BOOKING_LANGUAGE_OPTIONS.map((option) => option.id));
const AVAILABILITY_IDS: Set<string> = new Set(
  BOOKING_AVAILABILITY_OPTIONS.map((option) => option.id),
);
const AI_INTAKE_URGENCY_IDS: Set<string> = new Set(
  AI_INTAKE_URGENCY_OPTIONS.map((option) => option.id),
);
const BOOKING_SOURCE_IDS: Set<string> = new Set(["form", "ai-guided-intake"]);

function trimSingleLine(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function trimMultiline(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function trimItems(value: unknown, maxItems = 5, maxLength = 220) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => trimSingleLine(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function makeTextContent(content: string) {
  return {
    type: "text" as const,
    text: {
      content,
    },
  };
}

function makeParagraphBlocks(content: string) {
  const chunks = content.match(/[\s\S]{1,1800}/g) ?? [content];

  return chunks.map((chunk) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [makeTextContent(chunk)],
    },
  }));
}

function makeBulletedItem(content: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [makeTextContent(content)],
    },
  };
}

function makeHeadingBlock(
  type: "heading_2" | "heading_3",
  content: string,
) {
  return {
    object: "block" as const,
    type,
    [type]: {
      rich_text: [makeTextContent(content)],
    },
  };
}

function makeCalloutBlock(
  content: string,
  color:
    | "default"
    | "gray_background"
    | "brown_background"
    | "orange_background"
    | "yellow_background"
    | "green_background"
    | "blue_background"
    | "purple_background"
    | "pink_background"
    | "red_background",
  emoji: string,
) {
  return {
    object: "block" as const,
    type: "callout" as const,
    callout: {
      rich_text: [makeTextContent(content)],
      icon: {
        type: "emoji" as const,
        emoji,
      },
      color,
    },
  };
}

function makeToggleBlock(
  content: string,
  children: Array<Record<string, unknown>> = [],
  color:
    | "default"
    | "gray_background"
    | "brown_background"
    | "orange_background"
    | "yellow_background"
    | "green_background"
    | "blue_background"
    | "purple_background"
    | "pink_background"
    | "red_background" = "default",
) {
  return {
    object: "block" as const,
    type: "toggle" as const,
    toggle: {
      rich_text: [makeTextContent(content)],
      color,
      children,
    },
  };
}

const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const PAKISTAN_TIME_ZONE = "Asia/Karachi";

interface NotionRichTextObject {
  plain_text?: string;
}

interface NotionBlock {
  id: string;
  type: string;
  in_trash?: boolean;
  toggle?: { rich_text?: NotionRichTextObject[] };
  paragraph?: { rich_text?: NotionRichTextObject[] };
  heading_1?: { rich_text?: NotionRichTextObject[] };
  heading_2?: { rich_text?: NotionRichTextObject[] };
  heading_3?: { rich_text?: NotionRichTextObject[] };
}

interface NotionListResponse {
  results?: NotionBlock[];
  has_more?: boolean;
  next_cursor?: string | null;
  message?: string;
}

function getNotionBlockText(block: NotionBlock) {
  if (block.type === "toggle") {
    return block.toggle?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (block.type === "paragraph") {
    return block.paragraph?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (block.type === "heading_1") {
    return block.heading_1?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (block.type === "heading_2") {
    return block.heading_2?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  if (block.type === "heading_3") {
    return block.heading_3?.rich_text?.map((item) => item.plain_text ?? "").join("").trim() ?? "";
  }

  return "";
}

async function notionRequest<T>(
  notionToken: string,
  path: string,
  init?: RequestInit & { bodyJson?: unknown },
): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Notion-Version": NOTION_API_VERSION,
      ...(init?.bodyJson ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    body:
      init?.bodyJson !== undefined
        ? JSON.stringify(init.bodyJson)
        : init?.body,
  });

  const responseText = await response.text();

  if (!response.ok) {
    let message = "The request could not be saved in Notion.";

    try {
      const parsed = JSON.parse(responseText) as { message?: string };
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      if (responseText.trim()) {
        message = responseText;
      }
    }

    throw new Error(message);
  }

  if (!responseText.trim()) {
    return {} as T;
  }

  return JSON.parse(responseText) as T;
}

async function listAllBlockChildren(notionToken: string, blockId: string) {
  const results: NotionBlock[] = [];
  let nextCursor: string | null | undefined;

  do {
    const searchParams = new URLSearchParams({
      page_size: "100",
    });

    if (nextCursor) {
      searchParams.set("start_cursor", nextCursor);
    }

    const response = await notionRequest<NotionListResponse>(
      notionToken,
      `/blocks/${blockId}/children?${searchParams.toString()}`,
    );

    results.push(...(response.results ?? []));
    nextCursor = response.has_more ? response.next_cursor : null;
  } while (nextCursor);

  return results.filter((block) => !block.in_trash);
}

async function appendBlockChildren(
  notionToken: string,
  blockId: string,
  children: Array<Record<string, unknown>>,
  position?: { type: "start" | "after"; after?: string },
) {
  return notionRequest<{ results?: NotionBlock[] }>(
    notionToken,
    `/blocks/${blockId}/children`,
    {
      method: "PATCH",
      bodyJson: {
        children,
        ...(position?.type === "after" && position.after
          ? { after: position.after }
          : {}),
        ...(position?.type === "start"
          ? { position: { type: "start" as const } }
          : {}),
      },
    },
  );
}

function getBookingTimeParts() {
  const now = new Date();

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: PAKISTAN_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(now);

  const dayLabel = new Intl.DateTimeFormat("en-US", {
    timeZone: PAKISTAN_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  const timeLabel = new Intl.DateTimeFormat("en-PK", {
    timeZone: PAKISTAN_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now);

  return {
    dayLabel,
    monthLabel,
    timestampLabel: `${dayLabel}, ${timeLabel} PKT`,
    timeLabel,
  };
}

function getUrgencyLabel(urgency: AiIntakePayload["urgency"]) {
  return (
    AI_INTAKE_URGENCY_OPTIONS.find((option) => option.id === urgency)?.english ?? urgency
  );
}

function getSubmissionUrgency(payload: ReturnType<typeof validatePayload>): AiIntakePayload["urgency"] {
  if (payload.aiIntake?.urgency) {
    return payload.aiIntake.urgency;
  }

  if (
    payload.serviceInterest === "family-intervention" ||
    payload.serviceInterest === "follow-up"
  ) {
    return "priority";
  }

  return "routine";
}

function getSubmissionSourceLabel(source: BookingSourceId) {
  return source === "ai-guided-intake" ? "AI-guided intake" : "Website form";
}

function getFollowUpQueueColor(
  urgency: AiIntakePayload["urgency"],
): "green_background" | "yellow_background" | "red_background" {
  if (urgency === "urgent") {
    return "red_background";
  }

  if (urgency === "priority") {
    return "yellow_background";
  }

  return "green_background";
}

function getFollowUpQueueEmoji(urgency: AiIntakePayload["urgency"]) {
  if (urgency === "urgent") {
    return "🚨";
  }

  if (urgency === "priority") {
    return "📞";
  }

  return "🗂️";
}

function createFollowUpQueueEntry(
  payload: ReturnType<typeof validatePayload>,
  timeParts: ReturnType<typeof getBookingTimeParts>,
) {
  const urgency = getSubmissionUrgency(payload);
  const branchLabel = getBookingOptionLabel(
    BOOKING_BRANCH_OPTIONS,
    payload.branchPreference,
  );
  const serviceLabel = getBookingOptionLabel(
    BOOKING_SERVICE_OPTIONS,
    payload.serviceInterest,
  );
  const contactMethodLabel = getBookingOptionLabel(
    BOOKING_CONTACT_METHOD_OPTIONS,
    payload.contactMethod,
  );
  const sourceLabel = getSubmissionSourceLabel(payload.source);
  const urgencyLabel = getUrgencyLabel(urgency).toUpperCase();

  const children: Array<Record<string, unknown>> = [
    makeCalloutBlock(
      `New ${sourceLabel} submission. Call ${payload.phone} via ${contactMethodLabel}. Best contact time: ${getBookingOptionLabel(
        BOOKING_AVAILABILITY_OPTIONS,
        payload.availability,
      )}.`,
      getFollowUpQueueColor(urgency),
      getFollowUpQueueEmoji(urgency),
    ),
    makeBulletedItem(`Requester: ${payload.requesterName}`),
    makeBulletedItem(`Patient: ${payload.patientName || "Not provided"}`),
    makeBulletedItem(`Service: ${serviceLabel}`),
    makeBulletedItem(`Branch: ${branchLabel}`),
    makeBulletedItem(`Urgency: ${getUrgencyLabel(urgency)}`),
  ];

  if (payload.aiIntake?.nextStepRecommendation) {
    children.push(makeBulletedItem(`Recommended next step: ${payload.aiIntake.nextStepRecommendation}`));
  }

  children.push(...makeParagraphBlocks(payload.notes));

  return makeToggleBlock(
    `[${urgencyLabel}] ${timeParts.timestampLabel} - ${payload.requesterName} - ${serviceLabel}`.slice(
      0,
      180,
    ),
    children,
    getFollowUpQueueColor(urgency),
  );
}

async function ensureFollowUpQueueBlock(
  notionToken: string,
  notionPageId: string,
  pageChildren: NotionBlock[],
) {
  const existingQueue = pageChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === "Open follow-up queue",
  );

  if (existingQueue) {
    return existingQueue.id;
  }

  const response = await appendBlockChildren(
    notionToken,
    notionPageId,
    [
      makeToggleBlock(
        "Open follow-up queue",
        [
          makeCalloutBlock(
            "Newest submissions are inserted at the top of this queue. Move or archive items here once the team has followed up.",
            "yellow_background",
            "📌",
          ),
        ],
        "yellow_background",
      ),
    ],
    { type: "start" },
  );

  const createdId = response.results?.[0]?.id;

  if (!createdId) {
    throw new Error("The follow-up queue could not be created in Notion.");
  }

  return createdId;
}

function createRequestLogBlock(
  payload: ReturnType<typeof validatePayload>,
  timeParts: ReturnType<typeof getBookingTimeParts>,
) {
  const requesterLabel = getBookingOptionLabel(BOOKING_RELATION_OPTIONS, payload.relation);
  const branchLabel = getBookingOptionLabel(
    BOOKING_BRANCH_OPTIONS,
    payload.branchPreference,
  );
  const serviceLabel = getBookingOptionLabel(
    BOOKING_SERVICE_OPTIONS,
    payload.serviceInterest,
  );
  const contactMethodLabel = getBookingOptionLabel(
    BOOKING_CONTACT_METHOD_OPTIONS,
    payload.contactMethod,
  );
  const languageLabel = getBookingOptionLabel(
    BOOKING_LANGUAGE_OPTIONS,
    payload.contactLanguage,
  );
  const availabilityLabel = getBookingOptionLabel(
    BOOKING_AVAILABILITY_OPTIONS,
    payload.availability,
  );
  const { timeLabel, timestampLabel } = timeParts;
  const sourceLabel = getSubmissionSourceLabel(payload.source);
  const urgency = getSubmissionUrgency(payload);
  const aiSections: Array<Record<string, unknown>> = [];

  if (payload.aiIntake) {
    aiSections.push(
      makeHeadingBlock("heading_3", "AI handoff summary"),
      ...makeParagraphBlocks(payload.aiIntake.teamSummary),
    );

    if (payload.aiIntake.presentingProblem) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Presenting problem"),
        ...makeParagraphBlocks(payload.aiIntake.presentingProblem),
      );
    }

    if (payload.aiIntake.historyContext) {
      aiSections.push(
        makeHeadingBlock("heading_3", "History and context"),
        ...makeParagraphBlocks(payload.aiIntake.historyContext),
      );
    }

    if (payload.aiIntake.familyContext) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Family context"),
        ...makeParagraphBlocks(payload.aiIntake.familyContext),
      );
    }

    if (payload.aiIntake.expectations) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Expectations"),
        ...makeParagraphBlocks(payload.aiIntake.expectations),
      );
    }

    if (payload.aiIntake.nextStepRecommendation) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Recommended next step"),
        ...makeParagraphBlocks(payload.aiIntake.nextStepRecommendation),
      );
    }

    if (payload.aiIntake.interventionPreparation.length > 0) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Preparation before intervention or first contact"),
        ...payload.aiIntake.interventionPreparation.map((item) => makeBulletedItem(item)),
      );
    }

    if (payload.aiIntake.treatmentExpectations.length > 0) {
      aiSections.push(
        makeHeadingBlock("heading_3", "What to expect from treatment"),
        ...payload.aiIntake.treatmentExpectations.map((item) => makeBulletedItem(item)),
      );
    }

    if (payload.aiIntake.familyFollowAlong.length > 0) {
      aiSections.push(
        makeHeadingBlock("heading_3", "How family can follow along"),
        ...payload.aiIntake.familyFollowAlong.map((item) => makeBulletedItem(item)),
      );
    }

    if (payload.aiIntake.missingInformation.length > 0) {
      aiSections.push(
        makeHeadingBlock("heading_3", "Still missing or to reconfirm"),
        ...payload.aiIntake.missingInformation.map((item) => makeBulletedItem(item)),
      );
    }
  }

  return makeToggleBlock(
    `${timeLabel} - ${payload.requesterName} - ${serviceLabel}`.slice(0, 180),
    [
      {
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: {
          rich_text: [
            makeTextContent(
              `Submitted from willingways.uk on ${timestampLabel}. Source: ${sourceLabel}.`,
            ),
          ],
        },
      },
      makeBulletedItem(`Requester name: ${payload.requesterName}`),
      makeBulletedItem(`Patient name: ${payload.patientName || "Not provided"}`),
      makeBulletedItem(`Requester type: ${requesterLabel}`),
      makeBulletedItem(`Phone: ${payload.phone}`),
      makeBulletedItem(`Email: ${payload.email || "Not provided"}`),
      makeBulletedItem(`Preferred branch: ${branchLabel}`),
      makeBulletedItem(`Service needed: ${serviceLabel}`),
      makeBulletedItem(`Preferred contact method: ${contactMethodLabel}`),
      makeBulletedItem(`Preferred language: ${languageLabel}`),
      makeBulletedItem(`Best time to contact: ${availabilityLabel}`),
      makeBulletedItem(`Urgency: ${getUrgencyLabel(urgency)}`),
      makeHeadingBlock("heading_3", "Summary"),
      ...makeParagraphBlocks(payload.notes),
      ...aiSections,
    ],
  );
}

async function appendBookingRequestToNotionPage(
  notionToken: string,
  notionPageId: string,
  payload: ReturnType<typeof validatePayload>,
) {
  const timeParts = getBookingTimeParts();
  const { monthLabel, dayLabel } = timeParts;
  const requestBlock = createRequestLogBlock(payload, timeParts);
  const pageChildren = await listAllBlockChildren(notionToken, notionPageId);
  const followUpQueueId = await ensureFollowUpQueueBlock(
    notionToken,
    notionPageId,
    pageChildren,
  );

  await appendBlockChildren(
    notionToken,
    followUpQueueId,
    [createFollowUpQueueEntry(payload, timeParts)],
    { type: "start" },
  );

  const monthBlock = pageChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === monthLabel,
  );

  if (!monthBlock) {
    const monthResponse = await appendBlockChildren(notionToken, notionPageId, [
      makeToggleBlock(monthLabel),
    ]);
    const createdMonthId = monthResponse.results?.[0]?.id;

    if (!createdMonthId) {
      throw new Error("The booking month group could not be created in Notion.");
    }

    const dayResponse = await appendBlockChildren(notionToken, createdMonthId, [
      makeToggleBlock(dayLabel),
    ]);
    const createdDayId = dayResponse.results?.[0]?.id;

    if (!createdDayId) {
      throw new Error("The booking day group could not be created in Notion.");
    }

    await appendBlockChildren(notionToken, createdDayId, [requestBlock]);
    return;
  }

  const monthChildren = await listAllBlockChildren(notionToken, monthBlock.id);
  const dayBlock = monthChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === dayLabel,
  );

  if (!dayBlock) {
    const dayResponse = await appendBlockChildren(notionToken, monthBlock.id, [
      makeToggleBlock(dayLabel),
    ]);
    const createdDayId = dayResponse.results?.[0]?.id;

    if (!createdDayId) {
      throw new Error("The booking day group could not be created in Notion.");
    }

    await appendBlockChildren(notionToken, createdDayId, [requestBlock]);
    return;
  }

  await appendBlockChildren(notionToken, dayBlock.id, [requestBlock]);
}

function jsonError(error: string, status: number, headers?: HeadersInit) {
  return Response.json({ error }, { status, headers });
}

function validatePayload(raw: Partial<BookingRequestPayload>) {
  const source = trimSingleLine(raw.source, 40);
  const aiIntakeRaw = raw.aiIntake as Partial<AiIntakePayload> | undefined;
  const payload = {
    requesterName: trimSingleLine(raw.requesterName, BOOKING_MAX_LENGTHS.requesterName),
    patientName: trimSingleLine(raw.patientName, BOOKING_MAX_LENGTHS.patientName),
    relation: trimSingleLine(raw.relation, 40),
    phone: trimSingleLine(raw.phone, BOOKING_MAX_LENGTHS.phone),
    email: trimSingleLine(raw.email, BOOKING_MAX_LENGTHS.email),
    branchPreference: trimSingleLine(raw.branchPreference, 80),
    serviceInterest: trimSingleLine(raw.serviceInterest, 80),
    contactMethod: trimSingleLine(raw.contactMethod, 80),
    contactLanguage: trimSingleLine(raw.contactLanguage, 80),
    availability: trimSingleLine(raw.availability, 80),
    notes: trimMultiline(raw.notes, BOOKING_MAX_LENGTHS.notes),
    consent: raw.consent === true,
    source: BOOKING_SOURCE_IDS.has(source) ? (source as BookingSourceId) : "form",
    aiIntake:
      aiIntakeRaw && typeof aiIntakeRaw === "object"
        ? {
            urgency: AI_INTAKE_URGENCY_IDS.has(trimSingleLine(aiIntakeRaw.urgency, 20))
              ? (trimSingleLine(aiIntakeRaw.urgency, 20) as AiIntakePayload["urgency"])
              : "routine",
            detectedLanguage:
              trimSingleLine(aiIntakeRaw.detectedLanguage, 20) === "urdu" ||
              trimSingleLine(aiIntakeRaw.detectedLanguage, 20) === "punjabi" ||
              trimSingleLine(aiIntakeRaw.detectedLanguage, 20) === "mixed"
                ? (trimSingleLine(
                    aiIntakeRaw.detectedLanguage,
                    20,
                  ) as AiIntakePayload["detectedLanguage"])
                : "english",
            presentingProblem: trimMultiline(aiIntakeRaw.presentingProblem, 500),
            historyContext: trimMultiline(aiIntakeRaw.historyContext, 700),
            familyContext: trimMultiline(aiIntakeRaw.familyContext, 600),
            expectations: trimMultiline(aiIntakeRaw.expectations, 500),
            teamSummary: trimMultiline(aiIntakeRaw.teamSummary, 1100),
            nextStepRecommendation: trimMultiline(aiIntakeRaw.nextStepRecommendation, 500),
            interventionPreparation: trimItems(aiIntakeRaw.interventionPreparation, 5, 220),
            treatmentExpectations: trimItems(aiIntakeRaw.treatmentExpectations, 5, 220),
            familyFollowAlong: trimItems(aiIntakeRaw.familyFollowAlong, 5, 220),
            missingInformation: trimItems(aiIntakeRaw.missingInformation, 6, 220),
          }
        : undefined,
    website: trimSingleLine(raw.website, 120),
  };

  if (payload.website) {
    throw new Error("Spam check failed.");
  }

  if (payload.requesterName.length < 2) {
    throw new Error("Please enter the requester name.");
  }

  if (payload.phone.length < 7) {
    throw new Error("Please enter a valid phone number.");
  }

  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("Please enter a valid email address.");
  }

  if (!RELATION_IDS.has(payload.relation)) {
    throw new Error("Please choose who is making the request.");
  }

  if (!BRANCH_IDS.has(payload.branchPreference)) {
    throw new Error("Please choose a valid branch option.");
  }

  if (!SERVICE_IDS.has(payload.serviceInterest)) {
    throw new Error("Please choose the service needed.");
  }

  if (!CONTACT_METHOD_IDS.has(payload.contactMethod)) {
    throw new Error("Please choose a contact method.");
  }

  if (!LANGUAGE_IDS.has(payload.contactLanguage)) {
    throw new Error("Please choose a preferred language.");
  }

  if (!AVAILABILITY_IDS.has(payload.availability)) {
    throw new Error("Please choose availability.");
  }

  if (payload.notes.length < 10) {
    throw new Error("Please add a short summary of the request.");
  }

  if (!payload.consent) {
    throw new Error("Please confirm consent before sending the request.");
  }

  if (payload.source === "ai-guided-intake" && !payload.aiIntake) {
    throw new Error("The AI intake handoff could not be prepared. Please try again.");
  }

  return payload;
}

export async function POST(request: Request) {
  const notionToken = process.env.NOTION_TOKEN?.trim();
  const notionParentPageId = process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim();
  const rateLimitResult = checkRateLimit(request, "booking", BOOKING_RATE_LIMIT);
  const responseHeaders = rateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return jsonError(
      "Too many booking requests are coming from this connection right now. Please wait a moment and try again.",
      429,
      responseHeaders,
    );
  }

  if (!notionToken || !notionParentPageId) {
    return Response.json(
      {
        error:
          "Booking requests are not configured on the server yet. Please call 0300-7413639 for immediate help.",
      },
      {
        status: 503,
        headers: responseHeaders,
      },
    );
  }

  let rawBody: Partial<BookingRequestPayload>;

  try {
    rawBody = (await request.json()) as Partial<BookingRequestPayload>;
  } catch {
    return Response.json(
      { error: "Invalid request payload." },
      { status: 400, headers: responseHeaders },
    );
  }

  let payload: ReturnType<typeof validatePayload>;

  try {
    payload = validatePayload(rawBody);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Please review the booking form and try again.",
      },
      {
        status: 400,
        headers: responseHeaders,
      },
    );
  }

  try {
    await appendBookingRequestToNotionPage(notionToken, notionParentPageId, payload);

    return Response.json(
      {
        ok: true,
      },
      { headers: responseHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The booking request could not be sent right now. Please call 0300-7413639 if the matter is urgent.",
      },
      {
        status: 502,
        headers: responseHeaders,
      },
    );
  }
}
