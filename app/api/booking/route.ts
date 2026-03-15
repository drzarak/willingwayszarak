import {
  BOOKING_AVAILABILITY_OPTIONS,
  BOOKING_BRANCH_OPTIONS,
  BOOKING_CONTACT_METHOD_OPTIONS,
  BOOKING_LANGUAGE_OPTIONS,
  BOOKING_MAX_LENGTHS,
  BOOKING_RELATION_OPTIONS,
  BOOKING_SERVICE_OPTIONS,
  NOTION_API_VERSION,
  getBookingOptionLabel,
  type BookingRequestPayload,
} from "@/lib/booking";

export const maxDuration = 30;

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

function makeToggleBlock(
  content: string,
  children: Array<Record<string, unknown>> = [],
) {
  return {
    object: "block" as const,
    type: "toggle" as const,
    toggle: {
      rich_text: [makeTextContent(content)],
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
) {
  return notionRequest<{ results?: NotionBlock[] }>(
    notionToken,
    `/blocks/${blockId}/children`,
    {
      method: "PATCH",
      bodyJson: {
        children,
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

  return makeToggleBlock(
    `${timeLabel} - ${payload.requesterName} - ${serviceLabel}`.slice(0, 180),
    [
      {
        object: "block" as const,
        type: "paragraph" as const,
        paragraph: {
          rich_text: [makeTextContent(`Submitted from drzarak.org on ${timestampLabel}.`)],
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
      {
        object: "block" as const,
        type: "heading_3" as const,
        heading_3: {
          rich_text: [makeTextContent("Summary")],
        },
      },
      ...makeParagraphBlocks(payload.notes),
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

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status });
}

function validatePayload(raw: Partial<BookingRequestPayload>) {
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

  return payload;
}

export async function POST(request: Request) {
  const notionToken = process.env.NOTION_TOKEN?.trim();
  const notionParentPageId = process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim();

  if (!notionToken || !notionParentPageId) {
    return jsonError(
      "Booking requests are not configured on the server yet. Please call 0300-7413639 for immediate help.",
      503,
    );
  }

  let rawBody: Partial<BookingRequestPayload>;

  try {
    rawBody = (await request.json()) as Partial<BookingRequestPayload>;
  } catch {
    return jsonError("Invalid request payload.", 400);
  }

  let payload: ReturnType<typeof validatePayload>;

  try {
    payload = validatePayload(rawBody);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Please review the booking form and try again.",
      400,
    );
  }

  try {
    await appendBookingRequestToNotionPage(notionToken, notionParentPageId, payload);

    return Response.json({
      ok: true,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "The booking request could not be sent right now. Please call 0300-7413639 if the matter is urgent.",
      502,
    );
  }
}
