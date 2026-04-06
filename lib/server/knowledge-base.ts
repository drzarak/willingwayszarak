import "server-only";

import { sitePages } from "@/lib/site-data";

export interface KnowledgeHit {
  path: string;
  title: string;
  sourceUrl: string;
  section: string;
  description: string;
  snippet: string;
  score: number;
}

const TOKEN_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "been",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "need",
  "only",
  "that",
  "than",
  "them",
  "they",
  "this",
  "what",
  "when",
  "will",
  "with",
  "your",
  "میں",
  "اور",
  "کیا",
  "کی",
  "کے",
]);

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function markdownToPlainText(markdown: string) {
  return normalizeWhitespace(
    markdown
      .replace(/!\[[^\]]*]\(([^)]+)\)/g, " ")
      .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1")
      .replace(/[`*_>#-]+/g, " ")
      .replace(/\|/g, " ")
      .replace(/\n+/g, " "),
  );
}

function tokenize(value: string) {
  return [...new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06ff\s-]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 2 && !TOKEN_STOP_WORDS.has(token)),
  )];
}

const KNOWLEDGE_DOCUMENTS = sitePages.map((page) => {
  const plainText = markdownToPlainText(page.markdown).slice(0, 12_000);

  return {
    ...page,
    plainText,
    titleLower: page.title.toLowerCase(),
    descriptionLower: page.description.toLowerCase(),
    headingsLower: page.headings.map((heading) => heading.toLowerCase()),
  };
});

function scoreDocument(
  queryTokens: string[],
  document: (typeof KNOWLEDGE_DOCUMENTS)[number],
) {
  let score = 0;

  for (const token of queryTokens) {
    if (document.titleLower.includes(token)) {
      score += 7;
    }

    if (document.descriptionLower.includes(token)) {
      score += 4;
    }

    if (document.headingsLower.some((heading) => heading.includes(token))) {
      score += 3;
    }

    const plainTextMatches = document.plainText.toLowerCase().split(token).length - 1;
    score += Math.min(plainTextMatches, 6);
  }

  return score;
}

function createSnippet(plainText: string, queryTokens: string[]) {
  const lowered = plainText.toLowerCase();
  const anchorToken = queryTokens.find((token) => lowered.includes(token));

  if (!anchorToken) {
    return `${plainText.slice(0, 240).trim()}...`;
  }

  const anchorIndex = lowered.indexOf(anchorToken);
  const start = Math.max(0, anchorIndex - 110);
  const end = Math.min(plainText.length, anchorIndex + 190);
  const snippet = plainText.slice(start, end).trim();

  return `${start > 0 ? "..." : ""}${snippet}${end < plainText.length ? "..." : ""}`;
}

export function searchKnowledgeBase(query: string, limit = 4): KnowledgeHit[] {
  const normalizedQuery = normalizeWhitespace(query);

  if (normalizedQuery.length < 4) {
    return [];
  }

  const queryTokens = tokenize(normalizedQuery);

  if (queryTokens.length === 0) {
    return [];
  }

  return KNOWLEDGE_DOCUMENTS
    .map((document) => ({
      document,
      score: scoreDocument(queryTokens, document),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ document, score }) => ({
      path: document.path,
      title: document.title,
      sourceUrl: document.sourceUrl,
      section: document.section,
      description: document.description,
      snippet: createSnippet(document.plainText, queryTokens),
      score,
    }));
}

export function buildKnowledgeContext(query: string, limit = 4) {
  const hits = searchKnowledgeBase(query, limit);

  if (hits.length === 0) {
    return {
      hits,
      context: "",
    };
  }

  return {
    hits,
    context: hits
      .map(
        (hit, index) =>
          `${index + 1}. ${hit.title}\nSection: ${hit.section}\nPath: ${hit.path}\nSource URL: ${hit.sourceUrl}\nSummary: ${hit.description}\nExcerpt: ${hit.snippet}`,
      )
      .join("\n\n"),
  };
}
