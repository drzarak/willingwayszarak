import { randomUUID } from "node:crypto";

import { getDatabasePool, isDatabaseConfigured } from "@/lib/server/database";
import {
  appendBlockChildren,
  getNotionBlockText,
  listAllBlockChildren,
  makeBulletedItem,
  makeCalloutBlock,
  makeHeadingBlock,
  makeParagraphBlocks,
  makeToggleBlock,
} from "@/lib/server/notion";

const USAGE_ANALYTICS_SCHEMA_SYMBOL = Symbol.for("willing-ways-ai.usage-analytics-schema");
const DAILY_DIGEST_ROOT_TITLE = "Daily usage digests";
const DAILY_DIGEST_TARGET = "notion-daily-usage";
const PAKISTAN_TIME_ZONE = "Asia/Karachi";

export type UsageEventType =
  | "chat-completion"
  | "intake-draft"
  | "speech-generation"
  | "realtime-session-start"
  | "realtime-transcription"
  | "realtime-response"
  | "booking-submission";

export interface UsageEventInput {
  eventType: UsageEventType;
  route: string;
  surface?: string;
  requestId?: string;
  sessionId?: string;
  userRole?: string;
  model?: string;
  durationMs?: number;
  estimatedCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
  inputTextTokens?: number;
  outputTextTokens?: number;
  inputAudioTokens?: number;
  outputAudioTokens?: number;
  metadata?: Record<string, unknown>;
}

export interface NormalizedUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens: number;
  reasoningTokens: number;
  inputTextTokens: number;
  outputTextTokens: number;
  inputAudioTokens: number;
  outputAudioTokens: number;
}

export interface DailyUsageSummary {
  date: string;
  totalEvents: number;
  chatCompletions: number;
  intakeDrafts: number;
  speechGenerations: number;
  realtimeSessions: number;
  realtimeTranscriptions: number;
  realtimeResponses: number;
  bookingSubmissions: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}

export interface OpsDashboardOverview {
  today: DailyUsageSummary;
  daily: DailyUsageSummary[];
  queue: {
    openCases: number;
    newCasesToday: number;
    overdueOpenCases: number;
    urgentOpenCases: number;
    unassignedOpenCases: number;
    activeFollowUpCases: number;
  };
  notionDigest: {
    configured: boolean;
    lastSyncedAt: string | null;
    lastSyncedDate: string | null;
  };
}

export interface DailyDigestSyncResult {
  ok: boolean;
  alreadySynced: boolean;
  date: string;
  summary: DailyUsageSummary;
  syncedAt: string | null;
  skippedReason?: string;
}

interface UsagePricingProfile {
  inputPerMillion?: number;
  cachedInputPerMillion?: number;
  outputPerMillion?: number;
  inputTextPerMillion?: number;
  outputTextPerMillion?: number;
  inputAudioPerMillion?: number;
  outputAudioPerMillion?: number;
}

const MODEL_PRICING: Record<string, UsagePricingProfile> = {
  "gpt-4o-mini": {
    inputPerMillion: 0.15,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 0.6,
  },
  "gpt-4o": {
    inputPerMillion: 2.5,
    cachedInputPerMillion: 1.25,
    outputPerMillion: 10,
  },
  "gpt-4-turbo": {
    inputPerMillion: 10,
    outputPerMillion: 30,
  },
  "gpt-4o-mini-transcribe": {
    inputAudioPerMillion: 1.25,
    outputPerMillion: 5,
  },
  "gpt-4o-mini-tts": {
    inputPerMillion: 0.6,
    outputAudioPerMillion: 12,
  },
  "gpt-realtime-1.5": {
    inputTextPerMillion: 4,
    cachedInputPerMillion: 0.4,
    outputTextPerMillion: 16,
    inputAudioPerMillion: 32,
    outputAudioPerMillion: 64,
  },
  "gpt-realtime": {
    inputTextPerMillion: 4,
    cachedInputPerMillion: 0.4,
    outputTextPerMillion: 16,
    inputAudioPerMillion: 32,
    outputAudioPerMillion: 64,
  },
};

function getSchemaPromiseStore() {
  const globalObject = globalThis as typeof globalThis & {
    [USAGE_ANALYTICS_SCHEMA_SYMBOL]?: Promise<void>;
  };

  return globalObject;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toNormalizedText(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function readNestedNumber(record: Record<string, unknown> | null, path: string[]) {
  let cursor: unknown = record;

  for (const segment of path) {
    if (!cursor || typeof cursor !== "object") {
      return 0;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return toFiniteNumber(cursor);
}

function normalizeMetadata(value: Record<string, unknown> | undefined) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatUsd(value: number) {
  return Number.isFinite(value) ? `$${value.toFixed(4)}` : "$0.0000";
}

function getPakistanDateKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAKISTAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function getPakistanDayBounds(dateKey: string) {
  return {
    startIso: `${dateKey}T00:00:00+05:00`,
    endIso: `${dateKey}T23:59:59.999+05:00`,
  };
}

function listDateKeys(count: number, endDateKey = getPakistanDateKey()) {
  const keys: string[] = [];
  const endDate = new Date(`${endDateKey}T00:00:00+05:00`);

  for (let index = count - 1; index >= 0; index -= 1) {
    const nextDate = new Date(endDate);
    nextDate.setUTCDate(endDate.getUTCDate() - index);
    keys.push(getPakistanDateKey(nextDate));
  }

  return keys;
}

function normalizeModelName(model: string | undefined) {
  return toNormalizedText(model?.toLowerCase(), 80);
}

function normalizeUsageTokenDetails(raw: unknown): NormalizedUsage {
  const record = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;

  return {
    inputTokens: toFiniteNumber(record?.inputTokens ?? record?.input_tokens),
    outputTokens: toFiniteNumber(record?.outputTokens ?? record?.output_tokens),
    totalTokens: toFiniteNumber(record?.totalTokens ?? record?.total_tokens),
    cachedInputTokens: toFiniteNumber(
      record?.cachedInputTokens ??
        record?.cached_input_tokens ??
        readNestedNumber(record, ["input_token_details", "cached_tokens"]) ??
        readNestedNumber(record, ["inputTokenDetails", "cachedTokens"]),
    ),
    reasoningTokens: toFiniteNumber(
      record?.reasoningTokens ??
        record?.reasoning_tokens ??
        readNestedNumber(record, ["output_token_details", "reasoning_tokens"]) ??
        readNestedNumber(record, ["outputTokenDetails", "reasoningTokens"]),
    ),
    inputTextTokens: toFiniteNumber(
      record?.inputTextTokens ??
        record?.input_text_tokens ??
        readNestedNumber(record, ["input_token_details", "text_tokens"]) ??
        readNestedNumber(record, ["inputTokenDetails", "textTokens"]),
    ),
    outputTextTokens: toFiniteNumber(
      record?.outputTextTokens ??
        record?.output_text_tokens ??
        readNestedNumber(record, ["output_token_details", "text_tokens"]) ??
        readNestedNumber(record, ["outputTokenDetails", "textTokens"]),
    ),
    inputAudioTokens: toFiniteNumber(
      record?.inputAudioTokens ??
        record?.input_audio_tokens ??
        readNestedNumber(record, ["input_token_details", "audio_tokens"]) ??
        readNestedNumber(record, ["inputTokenDetails", "audioTokens"]),
    ),
    outputAudioTokens: toFiniteNumber(
      record?.outputAudioTokens ??
        record?.output_audio_tokens ??
        readNestedNumber(record, ["output_token_details", "audio_tokens"]) ??
        readNestedNumber(record, ["outputTokenDetails", "audioTokens"]),
    ),
  };
}

function estimateUsageCostUsd(model: string, usage: NormalizedUsage) {
  const pricing = MODEL_PRICING[normalizeModelName(model)];

  if (!pricing) {
    return 0;
  }

  const hasDetailedSplit =
    usage.inputTextTokens > 0 ||
    usage.outputTextTokens > 0 ||
    usage.inputAudioTokens > 0 ||
    usage.outputAudioTokens > 0;

  if (hasDetailedSplit) {
    const textInputTokens =
      usage.inputTextTokens ||
      Math.max(usage.inputTokens - usage.cachedInputTokens, 0);
    const textOutputTokens = usage.outputTextTokens || usage.outputTokens;
    const cachedTokens = usage.cachedInputTokens;
    const audioInputTokens = usage.inputAudioTokens;
    const audioOutputTokens = usage.outputAudioTokens;

    return roundUsd(
      (textInputTokens * (pricing.inputTextPerMillion ?? pricing.inputPerMillion ?? 0) +
        textOutputTokens * (pricing.outputTextPerMillion ?? pricing.outputPerMillion ?? 0) +
        audioInputTokens * (pricing.inputAudioPerMillion ?? 0) +
        audioOutputTokens * (pricing.outputAudioPerMillion ?? 0) +
        cachedTokens * (pricing.cachedInputPerMillion ?? 0)) /
        1_000_000,
    );
  }

  const nonCachedInputTokens = Math.max(usage.inputTokens - usage.cachedInputTokens, 0);

  return roundUsd(
    (nonCachedInputTokens * (pricing.inputPerMillion ?? pricing.inputTextPerMillion ?? 0) +
      usage.cachedInputTokens * (pricing.cachedInputPerMillion ?? 0) +
      usage.outputTokens * (pricing.outputPerMillion ?? pricing.outputTextPerMillion ?? 0)) /
      1_000_000,
  );
}

export function estimateSpeechGenerationMetrics(text: string) {
  const normalizedText = text.replace(/\s+/g, " ").trim();
  const wordCount = normalizedText ? normalizedText.split(" ").length : 0;
  const estimatedDurationMinutes = Math.max(wordCount / 145, 0.05);
  const estimatedDurationSeconds = Math.round(estimatedDurationMinutes * 60);
  const estimatedInputTokens = Math.ceil(normalizedText.length / 4);
  const estimatedCostUsd = roundUsd(estimatedDurationMinutes * 0.015);

  return {
    estimatedCostUsd,
    estimatedDurationSeconds,
    estimatedInputTokens,
  };
}

async function ensureUsageAnalyticsSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const globalObject = getSchemaPromiseStore();

  if (!globalObject[USAGE_ANALYTICS_SCHEMA_SYMBOL]) {
    globalObject[USAGE_ANALYTICS_SCHEMA_SYMBOL] = (async () => {
      const pool = getDatabasePool();
      await pool.query(`
        create table if not exists usage_events (
          event_id text primary key,
          created_at timestamptz not null,
          event_type text not null,
          route text not null,
          surface text not null default '',
          request_id text not null default '',
          session_id text not null default '',
          user_role text not null default '',
          model text not null default '',
          duration_ms integer,
          input_tokens integer not null default 0,
          output_tokens integer not null default 0,
          total_tokens integer not null default 0,
          cached_input_tokens integer not null default 0,
          reasoning_tokens integer not null default 0,
          input_text_tokens integer not null default 0,
          output_text_tokens integer not null default 0,
          input_audio_tokens integer not null default 0,
          output_audio_tokens integer not null default 0,
          estimated_cost_usd numeric(12, 6) not null default 0,
          metadata jsonb not null default '{}'::jsonb
        );
      `);
      await pool.query(`
        create table if not exists ops_digest_syncs (
          digest_date date not null,
          target text not null,
          synced_at timestamptz not null,
          summary jsonb not null default '{}'::jsonb,
          primary key (digest_date, target)
        );
      `);
      await pool.query(
        "create index if not exists idx_usage_events_created_at on usage_events(created_at desc);",
      );
      await pool.query(
        "create index if not exists idx_usage_events_type_created on usage_events(event_type, created_at desc);",
      );
    })();
  }

  await globalObject[USAGE_ANALYTICS_SCHEMA_SYMBOL];
}

export function isUsageAnalyticsConfigured() {
  return isDatabaseConfigured();
}

export async function logUsageEvent(input: UsageEventInput) {
  if (!isDatabaseConfigured()) {
    return false;
  }

  await ensureUsageAnalyticsSchema();

  const normalizedUsage: NormalizedUsage = {
    inputTokens: Math.max(0, Math.round(input.inputTokens ?? 0)),
    outputTokens: Math.max(0, Math.round(input.outputTokens ?? 0)),
    totalTokens: Math.max(0, Math.round(input.totalTokens ?? 0)),
    cachedInputTokens: Math.max(0, Math.round(input.cachedInputTokens ?? 0)),
    reasoningTokens: Math.max(0, Math.round(input.reasoningTokens ?? 0)),
    inputTextTokens: Math.max(0, Math.round(input.inputTextTokens ?? 0)),
    outputTextTokens: Math.max(0, Math.round(input.outputTextTokens ?? 0)),
    inputAudioTokens: Math.max(0, Math.round(input.inputAudioTokens ?? 0)),
    outputAudioTokens: Math.max(0, Math.round(input.outputAudioTokens ?? 0)),
  };

  const estimatedCostUsd = roundUsd(
    input.estimatedCostUsd ??
      estimateUsageCostUsd(input.model ?? "", normalizedUsage),
  );
  const pool = getDatabasePool();

  await pool.query(
    `
      insert into usage_events (
        event_id, created_at, event_type, route, surface, request_id, session_id, user_role, model,
        duration_ms, input_tokens, output_tokens, total_tokens, cached_input_tokens,
        reasoning_tokens, input_text_tokens, output_text_tokens, input_audio_tokens,
        output_audio_tokens, estimated_cost_usd, metadata
      ) values (
        $1, now(), $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19, $20::jsonb
      )
    `,
    [
      randomUUID(),
      input.eventType,
      toNormalizedText(input.route, 120) || "/",
      toNormalizedText(input.surface, 80),
      toNormalizedText(input.requestId, 120),
      toNormalizedText(input.sessionId, 120),
      toNormalizedText(input.userRole, 80),
      normalizeModelName(input.model),
      Number.isFinite(input.durationMs) ? Math.round(input.durationMs ?? 0) : null,
      normalizedUsage.inputTokens,
      normalizedUsage.outputTokens,
      normalizedUsage.totalTokens ||
        normalizedUsage.inputTokens + normalizedUsage.outputTokens,
      normalizedUsage.cachedInputTokens,
      normalizedUsage.reasoningTokens,
      normalizedUsage.inputTextTokens,
      normalizedUsage.outputTextTokens,
      normalizedUsage.inputAudioTokens,
      normalizedUsage.outputAudioTokens,
      estimatedCostUsd,
      JSON.stringify(normalizeMetadata(input.metadata)),
    ],
  );

  return true;
}

export async function logUsageEventFromUnknown(input: {
  eventType: UsageEventType;
  route: string;
  surface?: string;
  requestId?: string;
  sessionId?: string;
  userRole?: string;
  model?: string;
  durationMs?: number;
  usage?: unknown;
  estimatedCostUsd?: number;
  metadata?: Record<string, unknown>;
}) {
  const normalizedUsage = normalizeUsageTokenDetails(input.usage);

  return logUsageEvent({
    ...input,
    inputTokens: normalizedUsage.inputTokens,
    outputTokens: normalizedUsage.outputTokens,
    totalTokens: normalizedUsage.totalTokens,
    cachedInputTokens: normalizedUsage.cachedInputTokens,
    reasoningTokens: normalizedUsage.reasoningTokens,
    inputTextTokens: normalizedUsage.inputTextTokens,
    outputTextTokens: normalizedUsage.outputTextTokens,
    inputAudioTokens: normalizedUsage.inputAudioTokens,
    outputAudioTokens: normalizedUsage.outputAudioTokens,
  });
}

function createEmptyDailySummary(date: string): DailyUsageSummary {
  return {
    date,
    totalEvents: 0,
    chatCompletions: 0,
    intakeDrafts: 0,
    speechGenerations: 0,
    realtimeSessions: 0,
    realtimeTranscriptions: 0,
    realtimeResponses: 0,
    bookingSubmissions: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  };
}

export async function getDailyUsageSummaries(days = 7) {
  const dateKeys = listDateKeys(days);

  if (!isDatabaseConfigured()) {
    return dateKeys.map((date) => createEmptyDailySummary(date));
  }

  await ensureUsageAnalyticsSchema();
  const pool = getDatabasePool();
  const { startIso } = getPakistanDayBounds(dateKeys[0] ?? getPakistanDateKey());
  const latestEndBounds = getPakistanDayBounds(dateKeys[dateKeys.length - 1] ?? getPakistanDateKey());
  const result = await pool.query(
    `
      select
        to_char(timezone($3, created_at)::date, 'YYYY-MM-DD') as day_key,
        count(*)::int as total_events,
        count(*) filter (where event_type = 'chat-completion')::int as chat_completions,
        count(*) filter (where event_type = 'intake-draft')::int as intake_drafts,
        count(*) filter (where event_type = 'speech-generation')::int as speech_generations,
        count(*) filter (where event_type = 'realtime-session-start')::int as realtime_sessions,
        count(*) filter (where event_type = 'realtime-transcription')::int as realtime_transcriptions,
        count(*) filter (where event_type = 'realtime-response')::int as realtime_responses,
        count(*) filter (where event_type = 'booking-submission')::int as booking_submissions,
        coalesce(sum(input_tokens), 0)::int as input_tokens,
        coalesce(sum(output_tokens), 0)::int as output_tokens,
        coalesce(sum(total_tokens), 0)::int as total_tokens,
        coalesce(sum(estimated_cost_usd), 0)::numeric as estimated_cost_usd
      from usage_events
      where created_at >= $1::timestamptz and created_at <= $2::timestamptz
      group by 1
      order by 1 asc
    `,
    [startIso, latestEndBounds.endIso, PAKISTAN_TIME_ZONE],
  );

  const summariesByDate = new Map<string, DailyUsageSummary>();

  for (const row of result.rows) {
    summariesByDate.set(String(row.day_key), {
      date: String(row.day_key),
      totalEvents: toFiniteNumber(row.total_events),
      chatCompletions: toFiniteNumber(row.chat_completions),
      intakeDrafts: toFiniteNumber(row.intake_drafts),
      speechGenerations: toFiniteNumber(row.speech_generations),
      realtimeSessions: toFiniteNumber(row.realtime_sessions),
      realtimeTranscriptions: toFiniteNumber(row.realtime_transcriptions),
      realtimeResponses: toFiniteNumber(row.realtime_responses),
      bookingSubmissions: toFiniteNumber(row.booking_submissions),
      inputTokens: toFiniteNumber(row.input_tokens),
      outputTokens: toFiniteNumber(row.output_tokens),
      totalTokens: toFiniteNumber(row.total_tokens),
      estimatedCostUsd: roundUsd(toFiniteNumber(row.estimated_cost_usd)),
    });
  }

  return dateKeys.map((date) => summariesByDate.get(date) ?? createEmptyDailySummary(date));
}

async function getQueueSummaryForToday() {
  if (!isDatabaseConfigured()) {
    return {
      openCases: 0,
      newCasesToday: 0,
      overdueOpenCases: 0,
      urgentOpenCases: 0,
      unassignedOpenCases: 0,
      activeFollowUpCases: 0,
    };
  }

  const pool = getDatabasePool();
  const todayBounds = getPakistanDayBounds(getPakistanDateKey());
  const result = await pool.query(
    `
      select
        count(*) filter (where status <> 'closed')::int as open_cases,
        count(*) filter (
          where created_at >= $1::timestamptz and created_at <= $2::timestamptz
        )::int as new_cases_today,
        count(*) filter (
          where status <> 'closed' and next_contact_due_at < now()
        )::int as overdue_open_cases,
        count(*) filter (
          where status <> 'closed' and urgency = 'urgent'
        )::int as urgent_open_cases,
        count(*) filter (
          where status <> 'closed' and owner = 'Unassigned'
        )::int as unassigned_open_cases,
        count(*) filter (
          where status in ('scheduled', 'active-follow-up')
        )::int as active_follow_up_cases
      from staff_cases
    `,
    [todayBounds.startIso, todayBounds.endIso],
  );

  const row = result.rows[0] ?? {};

  return {
    openCases: toFiniteNumber(row.open_cases),
    newCasesToday: toFiniteNumber(row.new_cases_today),
    overdueOpenCases: toFiniteNumber(row.overdue_open_cases),
    urgentOpenCases: toFiniteNumber(row.urgent_open_cases),
    unassignedOpenCases: toFiniteNumber(row.unassigned_open_cases),
    activeFollowUpCases: toFiniteNumber(row.active_follow_up_cases),
  };
}

async function getLatestDigestSync() {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      lastSyncedAt: null,
      lastSyncedDate: null,
    };
  }

  await ensureUsageAnalyticsSchema();
  const pool = getDatabasePool();
  const result = await pool.query(
    `
      select digest_date, synced_at
      from ops_digest_syncs
      where target = $1
      order by digest_date desc
      limit 1
    `,
    [DAILY_DIGEST_TARGET],
  );

  const row = result.rows[0];

  return {
    configured: false,
    lastSyncedAt: row?.synced_at ? String(row.synced_at) : null,
    lastSyncedDate: row?.digest_date ? String(row.digest_date) : null,
  };
}

export async function getOpsDashboardOverview(days = 7): Promise<OpsDashboardOverview> {
  const [daily, queue, digestSync] = await Promise.all([
    getDailyUsageSummaries(days),
    getQueueSummaryForToday(),
    getLatestDigestSync(),
  ]);

  const today = daily[daily.length - 1] ?? createEmptyDailySummary(getPakistanDateKey());

  return {
    today,
    daily,
    queue,
    notionDigest: {
      configured: isNotionDailyDigestConfigured(),
      lastSyncedAt: digestSync.lastSyncedAt,
      lastSyncedDate: digestSync.lastSyncedDate,
    },
  };
}

export function isNotionDailyDigestConfigured() {
  return Boolean(
    process.env.NOTION_TOKEN?.trim() && process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim(),
  );
}

async function ensureDailyDigestRoot(notionToken: string, notionPageId: string) {
  const pageChildren = await listAllBlockChildren(notionToken, notionPageId);
  const existing = pageChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === DAILY_DIGEST_ROOT_TITLE,
  );

  if (existing) {
    return existing.id;
  }

  const response = await appendBlockChildren(notionToken, notionPageId, [
    makeToggleBlock(DAILY_DIGEST_ROOT_TITLE),
  ]);
  const createdId = response.results?.[0]?.id;

  if (!createdId) {
    throw new Error("The daily usage digest section could not be created in Notion.");
  }

  return createdId;
}

function createDailyDigestBlocks(summary: DailyUsageSummary, queue: OpsDashboardOverview["queue"]) {
  return [
    makeCalloutBlock(
      `AI usage summary for ${summary.date}. Estimated OpenAI cost: ${formatUsd(summary.estimatedCostUsd)}.`,
      "blue_background",
      "📊",
    ),
    makeHeadingBlock("heading_3", "Daily AI activity"),
    makeBulletedItem(`Chat completions: ${summary.chatCompletions}`),
    makeBulletedItem(`Voice sessions started: ${summary.realtimeSessions}`),
    makeBulletedItem(`Voice transcription events logged: ${summary.realtimeTranscriptions}`),
    makeBulletedItem(`Voice responses completed: ${summary.realtimeResponses}`),
    makeBulletedItem(`Intake drafts prepared: ${summary.intakeDrafts}`),
    makeBulletedItem(`Read-aloud generations: ${summary.speechGenerations}`),
    makeBulletedItem(`Booking or handoff submissions: ${summary.bookingSubmissions}`),
    makeBulletedItem(`Total model events logged: ${summary.totalEvents}`),
    makeBulletedItem(`Input tokens: ${summary.inputTokens}`),
    makeBulletedItem(`Output tokens: ${summary.outputTokens}`),
    makeBulletedItem(`Total tokens: ${summary.totalTokens}`),
    makeHeadingBlock("heading_3", "Current follow-up desk"),
    makeBulletedItem(`Open cases: ${queue.openCases}`),
    makeBulletedItem(`New cases today: ${queue.newCasesToday}`),
    makeBulletedItem(`Overdue open cases: ${queue.overdueOpenCases}`),
    makeBulletedItem(`Urgent open cases: ${queue.urgentOpenCases}`),
    makeBulletedItem(`Unassigned open cases: ${queue.unassignedOpenCases}`),
    makeBulletedItem(`Active follow-up cases: ${queue.activeFollowUpCases}`),
    ...makeParagraphBlocks(
      "This digest is informational only. Operations continue from the live staff dashboard and database queue even if Notion is unavailable.",
    ),
  ];
}

export async function syncDailyUsageDigestToNotion(dateKey = getPakistanDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))): Promise<DailyDigestSyncResult> {
  const notionToken = process.env.NOTION_TOKEN?.trim();
  const notionPageId = process.env.NOTION_BOOKING_PARENT_PAGE_ID?.trim();

  if (!notionToken || !notionPageId) {
    return {
      ok: false,
      alreadySynced: false,
      date: dateKey,
      summary: createEmptyDailySummary(dateKey),
      syncedAt: null,
      skippedReason: "Notion daily digest is not configured.",
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      alreadySynced: false,
      date: dateKey,
      summary: createEmptyDailySummary(dateKey),
      syncedAt: null,
      skippedReason: "Database analytics are not configured.",
    };
  }

  await ensureUsageAnalyticsSchema();
  const pool = getDatabasePool();
  const existing = await pool.query(
    `
      select synced_at
      from ops_digest_syncs
      where digest_date = $1::date and target = $2
      limit 1
    `,
    [dateKey, DAILY_DIGEST_TARGET],
  );

  const [dailySummaries, queue] = await Promise.all([
    getDailyUsageSummaries(7),
    getQueueSummaryForToday(),
  ]);
  const summary = dailySummaries.find((item) => item.date === dateKey) ?? createEmptyDailySummary(dateKey);

  if ((existing.rowCount ?? 0) > 0) {
    return {
      ok: true,
      alreadySynced: true,
      date: dateKey,
      summary,
      syncedAt: String(existing.rows[0]?.synced_at ?? ""),
    };
  }

  const rootId = await ensureDailyDigestRoot(notionToken, notionPageId);
  const rootChildren = await listAllBlockChildren(notionToken, rootId);
  const digestTitle = `${dateKey} · site usage and OpenAI cost`;
  const alreadyExistsInNotion = rootChildren.some(
    (block) => block.type === "toggle" && getNotionBlockText(block) === digestTitle,
  );

  if (!alreadyExistsInNotion) {
    await appendBlockChildren(notionToken, rootId, [
      makeToggleBlock(digestTitle, createDailyDigestBlocks(summary, queue), "blue_background"),
    ], { type: "start" });
  }

  const syncedAt = new Date().toISOString();

  await pool.query(
    `
      insert into ops_digest_syncs (digest_date, target, synced_at, summary)
      values ($1::date, $2, $3::timestamptz, $4::jsonb)
      on conflict (digest_date, target)
      do update set synced_at = excluded.synced_at, summary = excluded.summary
    `,
    [dateKey, DAILY_DIGEST_TARGET, syncedAt, JSON.stringify({ summary, queue })],
  );

  return {
    ok: true,
    alreadySynced: false,
    date: dateKey,
    summary,
    syncedAt,
  };
}
