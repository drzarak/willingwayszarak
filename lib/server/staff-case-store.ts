import { randomUUID } from "node:crypto";

import { getDatabasePool, isDatabaseConfigured } from "@/lib/server/database";
import {
  appendBlockChildren,
  getNotionBlockText,
  listAllBlockChildren,
  makeCalloutBlock,
  makeParagraphBlocks,
  makeToggleBlock,
  type NotionBlock,
} from "@/lib/server/notion";
import {
  buildStaffCaseSummary,
  summarizeStaffCases,
  type StaffCaseActionInput,
  type StaffCaseEvent,
  type StaffCaseRecord,
  type StaffCaseSnapshot,
} from "@/lib/staff-cases";

const STAFF_SYNC_ROOT_TITLE = "WW Staff case sync";
const STAFF_CASE_PREFIX = "WW_CASE:";
const STAFF_CASE_META_PREFIX = "WW_CASE_META";
const STAFF_CASE_EVENT_PREFIX = "WW_CASE_EVENT::";
const STAFF_CASE_EVENTS_TITLE = "Events";
const STAFF_CASE_SCHEMA_SYMBOL = Symbol.for("willing-ways-ai.staff-case-schema");

function getSchemaPromiseStore() {
  const globalObject = globalThis as typeof globalThis & {
    [STAFF_CASE_SCHEMA_SYMBOL]?: Promise<void>;
  };

  return globalObject;
}

async function ensureStaffCaseSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const globalObject = getSchemaPromiseStore();

  if (!globalObject[STAFF_CASE_SCHEMA_SYMBOL]) {
    globalObject[STAFF_CASE_SCHEMA_SYMBOL] = (async () => {
      const pool = getDatabasePool();
      await pool.query(`
        create table if not exists staff_cases (
          case_id text primary key,
          created_at timestamptz not null,
          updated_at timestamptz not null,
          status text not null,
          owner text not null,
          requester_name text not null,
          patient_name text not null,
          relation text not null,
          phone text not null,
          email text not null,
          branch_preference text not null,
          service_interest text not null,
          contact_method text not null,
          contact_language text not null,
          availability text not null,
          source text not null,
          consent_confirmed boolean not null,
          urgency text not null,
          queue_section_id text not null,
          queue_label text not null,
          lane_label text not null,
          recommended_program_id text not null,
          recommended_program_label text not null,
          callback_due_at timestamptz not null,
          next_contact_due_at timestamptz not null,
          note_summary text not null,
          team_summary text not null,
          counselor_brief text not null,
          presenting_problem text not null,
          history_context text not null,
          family_context text not null,
          expectations text not null,
          risk_flags jsonb not null default '[]'::jsonb,
          patient_follow_up jsonb not null default '[]'::jsonb,
          family_follow_up jsonb not null default '[]'::jsonb,
          family_follow_along jsonb not null default '[]'::jsonb,
          intervention_preparation jsonb not null default '[]'::jsonb,
          treatment_expectations jsonb not null default '[]'::jsonb,
          next_step_recommendation text not null,
          today_action text not null
        );
      `);
      await pool.query(`
        create table if not exists staff_case_events (
          event_id text primary key,
          case_id text not null references staff_cases(case_id) on delete cascade,
          created_at timestamptz not null,
          actor text not null,
          type text not null,
          status text,
          owner text,
          note text,
          next_contact_due_at timestamptz,
          outcome text
        );
      `);
      await pool.query(
        "create index if not exists idx_staff_cases_status on staff_cases(status);",
      );
      await pool.query(
        "create index if not exists idx_staff_cases_queue_section on staff_cases(queue_section_id);",
      );
      await pool.query(
        "create index if not exists idx_staff_cases_next_due on staff_cases(next_contact_due_at);",
      );
      await pool.query(
        "create index if not exists idx_staff_case_events_case_created on staff_case_events(case_id, created_at desc);",
      );
    })();
  }

  await globalObject[STAFF_CASE_SCHEMA_SYMBOL];
}

function normalizeRowToSnapshot(row: Record<string, unknown>): StaffCaseSnapshot {
  return {
    caseId: String(row.case_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    status: String(row.status) as StaffCaseSnapshot["status"],
    owner: String(row.owner ?? "Unassigned"),
    requesterName: String(row.requester_name ?? ""),
    patientName: String(row.patient_name ?? ""),
    relation: String(row.relation) as StaffCaseSnapshot["relation"],
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    branchPreference: String(row.branch_preference) as StaffCaseSnapshot["branchPreference"],
    serviceInterest: String(row.service_interest) as StaffCaseSnapshot["serviceInterest"],
    contactMethod: String(row.contact_method) as StaffCaseSnapshot["contactMethod"],
    contactLanguage: String(row.contact_language) as StaffCaseSnapshot["contactLanguage"],
    availability: String(row.availability) as StaffCaseSnapshot["availability"],
    source: String(row.source) as StaffCaseSnapshot["source"],
    consentConfirmed: row.consent_confirmed === true,
    urgency: String(row.urgency) as StaffCaseSnapshot["urgency"],
    queueSectionId: String(row.queue_section_id) as StaffCaseSnapshot["queueSectionId"],
    queueLabel: String(row.queue_label ?? ""),
    laneLabel: String(row.lane_label ?? ""),
    recommendedProgramId: String(
      row.recommended_program_id,
    ) as StaffCaseSnapshot["recommendedProgramId"],
    recommendedProgramLabel: String(row.recommended_program_label ?? ""),
    callbackDueAt: String(row.callback_due_at),
    nextContactDueAt: String(row.next_contact_due_at),
    noteSummary: String(row.note_summary ?? ""),
    teamSummary: String(row.team_summary ?? ""),
    counselorBrief: String(row.counselor_brief ?? ""),
    presentingProblem: String(row.presenting_problem ?? ""),
    historyContext: String(row.history_context ?? ""),
    familyContext: String(row.family_context ?? ""),
    expectations: String(row.expectations ?? ""),
    riskFlags: Array.isArray(row.risk_flags) ? (row.risk_flags as string[]) : [],
    patientFollowUp: Array.isArray(row.patient_follow_up) ? (row.patient_follow_up as string[]) : [],
    familyFollowUp: Array.isArray(row.family_follow_up) ? (row.family_follow_up as string[]) : [],
    familyFollowAlong: Array.isArray(row.family_follow_along)
      ? (row.family_follow_along as string[])
      : [],
    interventionPreparation: Array.isArray(row.intervention_preparation)
      ? (row.intervention_preparation as string[])
      : [],
    treatmentExpectations: Array.isArray(row.treatment_expectations)
      ? (row.treatment_expectations as string[])
      : [],
    nextStepRecommendation: String(row.next_step_recommendation ?? ""),
    todayAction: String(row.today_action ?? ""),
  };
}

function createChunkedMetaBlocks(snapshot: StaffCaseSnapshot) {
  const json = JSON.stringify(snapshot);
  const chunkSize = 1500;
  const total = Math.max(1, Math.ceil(json.length / chunkSize));

  return Array.from({ length: total }, (_, index) => {
    const chunk = json.slice(index * chunkSize, (index + 1) * chunkSize);
    return makeParagraphBlocks(`${STAFF_CASE_META_PREFIX}[${index + 1}/${total}]::${chunk}`)[0];
  });
}

function parseChunkedMeta(blocks: NotionBlock[]) {
  const matched = blocks
    .map((block) => getNotionBlockText(block))
    .filter((text) => text.startsWith(STAFF_CASE_META_PREFIX))
    .map((text) => {
      const match = text.match(/^WW_CASE_META\[(\d+)\/(\d+)\]::([\s\S]*)$/);
      if (!match) {
        return null;
      }

      return {
        index: Number(match[1]),
        chunk: match[3],
      };
    })
    .filter((item): item is { index: number; chunk: string } => item !== null)
    .sort((left, right) => left.index - right.index);

  if (matched.length === 0) {
    return null;
  }

  try {
    return JSON.parse(matched.map((item) => item.chunk).join("")) as StaffCaseSnapshot;
  } catch {
    return null;
  }
}

function createEventParagraph(event: StaffCaseEvent) {
  return makeParagraphBlocks(
    `${STAFF_CASE_EVENT_PREFIX}${JSON.stringify({
      ...event,
      note: event.note?.trim().slice(0, 600) || "",
      outcome: event.outcome?.trim().slice(0, 220) || "",
    })}`,
  )[0];
}

function parseEvents(blocks: NotionBlock[]) {
  return blocks
    .map((block) => getNotionBlockText(block))
    .filter((text) => text.startsWith(STAFF_CASE_EVENT_PREFIX))
    .map((text) => {
      try {
        return JSON.parse(text.slice(STAFF_CASE_EVENT_PREFIX.length)) as StaffCaseEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is StaffCaseEvent => event !== null)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

function applyEvent(snapshot: StaffCaseSnapshot, event: StaffCaseEvent) {
  const next = {
    ...snapshot,
    updatedAt: event.createdAt,
  };

  if (event.owner?.trim()) {
    next.owner = event.owner.trim();
  }

  if (event.status) {
    next.status = event.status;
  }

  if (event.nextContactDueAt) {
    next.nextContactDueAt = event.nextContactDueAt;
  }

  if (event.note?.trim()) {
    next.noteSummary = event.note.trim();
  }

  return next;
}

function reduceRecord(snapshot: StaffCaseSnapshot, events: StaffCaseEvent[]): StaffCaseRecord {
  const reducedSnapshot = [...events]
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
    .reduce(applyEvent, snapshot);

  return {
    snapshot: reducedSnapshot,
    events,
  };
}

async function ensureStaffSyncRoot(
  notionToken: string,
  notionPageId: string,
  pageChildren?: NotionBlock[],
) {
  const rootChildren = pageChildren ?? (await listAllBlockChildren(notionToken, notionPageId));
  const existingRoot = rootChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === STAFF_SYNC_ROOT_TITLE,
  );

  if (existingRoot) {
    return existingRoot.id;
  }

  const response = await appendBlockChildren(
    notionToken,
    notionPageId,
    [
      makeToggleBlock(
        STAFF_SYNC_ROOT_TITLE,
        [
          makeCalloutBlock(
            "Structured staff case records live here for the internal dashboard. Keep this section collapsed.",
            "gray_background",
            "🗄️",
          ),
        ],
        "gray_background",
      ),
    ],
    { type: "start" },
  );

  const createdId = response.results?.[0]?.id;

  if (!createdId) {
    throw new Error("The staff case sync store could not be created in Notion.");
  }

  return createdId;
}

async function appendNotionFallbackRecord(
  notionToken: string,
  notionPageId: string,
  snapshot: StaffCaseSnapshot,
) {
  const rootId = await ensureStaffSyncRoot(notionToken, notionPageId);
  const createdEvent = buildCreatedEvent(snapshot.caseId);

  await appendBlockChildren(
    notionToken,
    rootId,
    [
      makeToggleBlock(
        `${STAFF_CASE_PREFIX}${snapshot.caseId} · ${snapshot.requesterName}`.slice(0, 120),
        [
          ...createChunkedMetaBlocks(snapshot),
          makeToggleBlock(STAFF_CASE_EVENTS_TITLE, [createEventParagraph(createdEvent)]),
        ],
        "gray_background",
      ),
    ],
    { type: "start" },
  );
}

async function findNotionCaseBlock(
  notionToken: string,
  notionPageId: string,
  caseId: string,
) {
  const rootId = await ensureStaffSyncRoot(notionToken, notionPageId);
  const rootChildren = await listAllBlockChildren(notionToken, rootId);
  const caseBlock = rootChildren.find(
    (block) =>
      block.type === "toggle" &&
      getNotionBlockText(block).startsWith(`${STAFF_CASE_PREFIX}${caseId}`),
  );

  return {
    rootId,
    caseBlock,
  };
}

function buildCreatedEvent(caseId: string): StaffCaseEvent {
  return {
    caseId,
    createdAt: new Date().toISOString(),
    eventId: randomUUID(),
    actor: "system",
    type: "created",
    status: "new",
  };
}

function buildActionEvent(caseId: string, input: StaffCaseActionInput): StaffCaseEvent {
  return {
    eventId: randomUUID(),
    caseId,
    createdAt: new Date().toISOString(),
    actor: input.actor.trim().slice(0, 80) || "Staff team",
    type:
      input.type === "assign"
        ? "assigned"
        : input.type === "status"
          ? "status-changed"
          : input.type === "contact-attempt"
            ? "contact-attempted"
            : input.type === "schedule-follow-up"
              ? "follow-up-scheduled"
              : input.type === "close"
                ? "closed"
                : "note-added",
    owner: input.owner?.trim().slice(0, 80) || undefined,
    status: input.type === "close" ? "closed" : input.status,
    note: input.note?.trim().slice(0, 600) || undefined,
    nextContactDueAt: input.nextContactDueAt || undefined,
    outcome: input.outcome?.trim().slice(0, 220) || undefined,
  };
}

export function createStaffCaseId() {
  return `case_${randomUUID()}`;
}

export function isStructuredCaseStoreConfigured() {
  return isDatabaseConfigured();
}

export async function appendStaffCaseRecord(
  notionToken: string,
  notionPageId: string,
  snapshot: StaffCaseSnapshot,
) {
  if (isDatabaseConfigured()) {
    await ensureStaffCaseSchema();
    const pool = getDatabasePool();
    await pool.query(
      `
        insert into staff_cases (
          case_id, created_at, updated_at, status, owner, requester_name, patient_name, relation,
          phone, email, branch_preference, service_interest, contact_method, contact_language,
          availability, source, consent_confirmed, urgency, queue_section_id, queue_label,
          lane_label, recommended_program_id, recommended_program_label, callback_due_at,
          next_contact_due_at, note_summary, team_summary, counselor_brief, presenting_problem,
          history_context, family_context, expectations, risk_flags, patient_follow_up,
          family_follow_up, family_follow_along, intervention_preparation, treatment_expectations,
          next_step_recommendation, today_action
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,
          $9,$10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,
          $21,$22,$23,$24,
          $25,$26,$27,$28,$29,
          $30,$31,$32,$33::jsonb,$34::jsonb,
          $35::jsonb,$36::jsonb,$37::jsonb,$38::jsonb,
          $39,$40
        )
        on conflict (case_id) do nothing
      `,
      [
        snapshot.caseId,
        snapshot.createdAt,
        snapshot.updatedAt,
        snapshot.status,
        snapshot.owner,
        snapshot.requesterName,
        snapshot.patientName,
        snapshot.relation,
        snapshot.phone,
        snapshot.email,
        snapshot.branchPreference,
        snapshot.serviceInterest,
        snapshot.contactMethod,
        snapshot.contactLanguage,
        snapshot.availability,
        snapshot.source,
        snapshot.consentConfirmed,
        snapshot.urgency,
        snapshot.queueSectionId,
        snapshot.queueLabel,
        snapshot.laneLabel,
        snapshot.recommendedProgramId,
        snapshot.recommendedProgramLabel,
        snapshot.callbackDueAt,
        snapshot.nextContactDueAt,
        snapshot.noteSummary,
        snapshot.teamSummary,
        snapshot.counselorBrief,
        snapshot.presentingProblem,
        snapshot.historyContext,
        snapshot.familyContext,
        snapshot.expectations,
        JSON.stringify(snapshot.riskFlags),
        JSON.stringify(snapshot.patientFollowUp),
        JSON.stringify(snapshot.familyFollowUp),
        JSON.stringify(snapshot.familyFollowAlong),
        JSON.stringify(snapshot.interventionPreparation),
        JSON.stringify(snapshot.treatmentExpectations),
        snapshot.nextStepRecommendation,
        snapshot.todayAction,
      ],
    );
    await pool.query(
      `
        insert into staff_case_events (
          event_id, case_id, created_at, actor, type, status
        ) values ($1,$2,$3,$4,$5,$6)
        on conflict (event_id) do nothing
      `,
      [
        randomUUID(),
        snapshot.caseId,
        snapshot.createdAt,
        "system",
        "created",
        snapshot.status,
      ],
    );
    return;
  }

  await appendNotionFallbackRecord(notionToken, notionPageId, snapshot);
}

export async function listStaffCases(
  notionToken: string,
  notionPageId: string,
) {
  if (isDatabaseConfigured()) {
    await ensureStaffCaseSchema();
    const pool = getDatabasePool();
    const casesResult = await pool.query("select * from staff_cases order by updated_at desc");
    const eventsResult = await pool.query(
      "select * from staff_case_events order by created_at desc",
    );

    const eventsByCaseId = new Map<string, StaffCaseEvent[]>();

    for (const row of eventsResult.rows) {
      const caseId = String(row.case_id);
      const event: StaffCaseEvent = {
        eventId: String(row.event_id),
        caseId,
        createdAt: String(row.created_at),
        actor: String(row.actor),
        type: String(row.type) as StaffCaseEvent["type"],
        status: row.status ? (String(row.status) as StaffCaseEvent["status"]) : undefined,
        owner: row.owner ? String(row.owner) : undefined,
        note: row.note ? String(row.note) : undefined,
        nextContactDueAt: row.next_contact_due_at
          ? String(row.next_contact_due_at)
          : undefined,
        outcome: row.outcome ? String(row.outcome) : undefined,
      };
      const bucket = eventsByCaseId.get(caseId) ?? [];
      bucket.push(event);
      eventsByCaseId.set(caseId, bucket);
    }

    const cases = casesResult.rows
      .map((row) =>
        buildStaffCaseSummary({
          snapshot: normalizeRowToSnapshot(row),
          events: eventsByCaseId.get(String(row.case_id)) ?? [],
        }),
      )
      .sort((left, right) => {
        const overdueScore = Number(right.overdue) - Number(left.overdue);
        if (overdueScore !== 0) {
          return overdueScore;
        }

        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      });

    return {
      cases,
      legacyQueueOnly: false,
      summary: summarizeStaffCases(cases),
    };
  }

  const pageChildren = await listAllBlockChildren(notionToken, notionPageId);
  const hasLegacyQueue = pageChildren.some(
    (block) => block.type === "toggle" && getNotionBlockText(block) === "Open follow-up queue",
  );
  const root = pageChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === STAFF_SYNC_ROOT_TITLE,
  );

  if (!root) {
    return {
      cases: [],
      legacyQueueOnly: hasLegacyQueue,
      summary: summarizeStaffCases([]),
    };
  }

  const rootChildren = await listAllBlockChildren(notionToken, root.id);
  const caseBlocks = rootChildren.filter(
    (block) =>
      block.type === "toggle" && getNotionBlockText(block).startsWith(STAFF_CASE_PREFIX),
  );

  const records = await Promise.all(
    caseBlocks.map(async (caseBlock) => {
      const children = await listAllBlockChildren(notionToken, caseBlock.id);
      const snapshot = parseChunkedMeta(children);

      if (!snapshot) {
        return null;
      }

      const eventsToggle = children.find(
        (block) => block.type === "toggle" && getNotionBlockText(block) === STAFF_CASE_EVENTS_TITLE,
      );
      const events = eventsToggle
        ? parseEvents(await listAllBlockChildren(notionToken, eventsToggle.id))
        : [];

      return reduceRecord(snapshot, events);
    }),
  );

  const cases = records
    .filter((record): record is StaffCaseRecord => record !== null)
    .map(buildStaffCaseSummary)
    .sort((left, right) => {
      const overdueScore = Number(right.overdue) - Number(left.overdue);
      if (overdueScore !== 0) {
        return overdueScore;
      }

      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });

  return {
    cases,
    legacyQueueOnly: false,
    summary: summarizeStaffCases(cases),
  };
}

export async function appendStaffCaseEvent(
  notionToken: string,
  notionPageId: string,
  caseId: string,
  input: StaffCaseActionInput,
) {
  const event = buildActionEvent(caseId, input);

  if (isDatabaseConfigured()) {
    await ensureStaffCaseSchema();
    const pool = getDatabasePool();
    await pool.query("begin");

    try {
      await pool.query(
        `
          insert into staff_case_events (
            event_id, case_id, created_at, actor, type, status, owner, note, next_contact_due_at, outcome
          ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          event.eventId,
          event.caseId,
          event.createdAt,
          event.actor,
          event.type,
          event.status ?? null,
          event.owner ?? null,
          event.note ?? null,
          event.nextContactDueAt ?? null,
          event.outcome ?? null,
        ],
      );

      await pool.query(
        `
          update staff_cases
          set
            updated_at = $2,
            owner = coalesce($3, owner),
            status = coalesce($4, status),
            next_contact_due_at = coalesce($5, next_contact_due_at),
            note_summary = coalesce(nullif($6, ''), note_summary)
          where case_id = $1
        `,
        [
          caseId,
          event.createdAt,
          event.owner ?? null,
          event.status ?? null,
          event.nextContactDueAt ?? null,
          event.note ?? "",
        ],
      );

      await pool.query("commit");
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }

    return event;
  }

  const { caseBlock } = await findNotionCaseBlock(notionToken, notionPageId, caseId);

  if (!caseBlock) {
    throw new Error("The staff case could not be found.");
  }

  const caseChildren = await listAllBlockChildren(notionToken, caseBlock.id);
  let eventsToggle = caseChildren.find(
    (block) => block.type === "toggle" && getNotionBlockText(block) === STAFF_CASE_EVENTS_TITLE,
  );

  if (!eventsToggle) {
    const response = await appendBlockChildren(
      notionToken,
      caseBlock.id,
      [makeToggleBlock(STAFF_CASE_EVENTS_TITLE)],
    );
    const createdId = response.results?.[0]?.id;

    if (!createdId) {
      throw new Error("The staff case event stream could not be created.");
    }

    eventsToggle = {
      id: createdId,
      type: "toggle",
      toggle: { rich_text: [{ plain_text: STAFF_CASE_EVENTS_TITLE }] },
    };
  }

  await appendBlockChildren(
    notionToken,
    eventsToggle.id,
    [createEventParagraph(event)],
    { type: "start" },
  );

  return event;
}
