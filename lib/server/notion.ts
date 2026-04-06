import { NOTION_API_VERSION } from "@/lib/booking";

const NOTION_API_BASE_URL = "https://api.notion.com/v1";

export interface NotionRichTextObject {
  plain_text?: string;
}

export interface NotionBlock {
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

export function makeTextContent(content: string) {
  return {
    type: "text" as const,
    text: {
      content,
    },
  };
}

export function makeParagraphBlocks(content: string) {
  const chunks = content.match(/[\s\S]{1,1800}/g) ?? [content];

  return chunks.map((chunk) => ({
    object: "block" as const,
    type: "paragraph" as const,
    paragraph: {
      rich_text: [makeTextContent(chunk)],
    },
  }));
}

export function makeBulletedItem(content: string) {
  return {
    object: "block" as const,
    type: "bulleted_list_item" as const,
    bulleted_list_item: {
      rich_text: [makeTextContent(content)],
    },
  };
}

export function makeHeadingBlock(type: "heading_2" | "heading_3", content: string) {
  return {
    object: "block" as const,
    type,
    [type]: {
      rich_text: [makeTextContent(content)],
    },
  };
}

export function makeCalloutBlock(
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

export function makeToggleBlock(
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

export function getNotionBlockText(block: NotionBlock) {
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

export async function notionRequest<T>(
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
    let message = "The request could not be completed in Notion.";

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

export async function listAllBlockChildren(notionToken: string, blockId: string) {
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

export async function appendBlockChildren(
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
