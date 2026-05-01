import { randomUUID } from "node:crypto";

import { getDatabasePool, isDatabaseConfigured } from "@/lib/server/database";

const EMAIL_ALIAS_SCHEMA_SYMBOL = Symbol.for("willing-ways-ai.email-alias-schema");
const EMAIL_DOMAIN = "willingways.uk";

export type EmailAliasStatus = "pending" | "approved" | "configured" | "rejected";

export interface EmailAliasRequest {
  requestId: string;
  createdAt: string;
  updatedAt: string;
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  desiredLocalPart: string;
  aliasEmail: string;
  forwardingEmail: string;
  reason: string;
  status: EmailAliasStatus;
  decidedByUserId: string;
  decidedAt: string | null;
  adminNote: string;
  cloudflareStatus: string;
}

interface CreateEmailAliasRequestInput {
  requesterUserId: string;
  requesterName: string;
  requesterEmail: string;
  desiredLocalPart: string;
  forwardingEmail: string;
  reason: string;
}

interface ResolveEmailAliasRequestInput {
  requestId: string;
  decidedByUserId: string;
  status: EmailAliasStatus;
  adminNote?: string;
}

function getSchemaPromiseStore() {
  const globalObject = globalThis as typeof globalThis & {
    [EMAIL_ALIAS_SCHEMA_SYMBOL]?: Promise<void>;
  };

  return globalObject;
}

export function isEmailAliasStoreConfigured() {
  return isDatabaseConfigured();
}

async function ensureEmailAliasSchema() {
  if (!isDatabaseConfigured()) {
    return;
  }

  const globalObject = getSchemaPromiseStore();

  if (!globalObject[EMAIL_ALIAS_SCHEMA_SYMBOL]) {
    globalObject[EMAIL_ALIAS_SCHEMA_SYMBOL] = (async () => {
      const pool = getDatabasePool();
      await pool.query(`
        create table if not exists email_alias_requests (
          request_id text primary key,
          created_at timestamptz not null,
          updated_at timestamptz not null,
          requester_user_id text not null,
          requester_name text not null,
          requester_email text not null,
          desired_local_part text not null,
          alias_email text not null,
          forwarding_email text not null,
          reason text not null,
          status text not null,
          decided_by_user_id text not null default '',
          decided_at timestamptz,
          admin_note text not null default '',
          cloudflare_status text not null default 'not_configured'
        );
      `);
      await pool.query(`
        create table if not exists email_aliases (
          alias_email text primary key,
          local_part text not null,
          forwarding_email text not null,
          owner_user_id text not null,
          request_id text not null references email_alias_requests(request_id) on delete cascade,
          status text not null,
          created_at timestamptz not null,
          updated_at timestamptz not null
        );
      `);
      await pool.query(
        "create unique index if not exists idx_email_alias_requests_local_active on email_alias_requests (desired_local_part) where status in ('pending', 'approved', 'configured');",
      );
      await pool.query(
        "create index if not exists idx_email_alias_requests_requester on email_alias_requests (requester_user_id, created_at desc);",
      );
      await pool.query(
        "create index if not exists idx_email_alias_requests_status_created on email_alias_requests (status, created_at desc);",
      );
    })();
  }

  await globalObject[EMAIL_ALIAS_SCHEMA_SYMBOL];
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase().slice(0, 180);
}

export function normalizeEmailLocalPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .replace(/[._-]{2,}/g, "-")
    .slice(0, 48);
}

function mapRow(row: Record<string, unknown>): EmailAliasRequest {
  return {
    requestId: String(row.request_id ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
    requesterUserId: String(row.requester_user_id ?? ""),
    requesterName: String(row.requester_name ?? ""),
    requesterEmail: String(row.requester_email ?? ""),
    desiredLocalPart: String(row.desired_local_part ?? ""),
    aliasEmail: String(row.alias_email ?? ""),
    forwardingEmail: String(row.forwarding_email ?? ""),
    reason: String(row.reason ?? ""),
    status: String(row.status ?? "pending") as EmailAliasStatus,
    decidedByUserId: String(row.decided_by_user_id ?? ""),
    decidedAt: row.decided_at ? String(row.decided_at) : null,
    adminNote: String(row.admin_note ?? ""),
    cloudflareStatus: String(row.cloudflare_status ?? "not_configured"),
  };
}

export async function createEmailAliasRequest(input: CreateEmailAliasRequestInput) {
  await ensureEmailAliasSchema();

  if (!isDatabaseConfigured()) {
    throw new Error("Email alias requests need the PostgreSQL database to be configured.");
  }

  const localPart = normalizeEmailLocalPart(input.desiredLocalPart);
  const forwardingEmail = normalizeEmail(input.forwardingEmail);

  if (!localPart || localPart.length < 3) {
    throw new Error("Choose an alias with at least 3 letters or numbers.");
  }

  if (!/^[a-z0-9][a-z0-9._-]{1,46}[a-z0-9]$/.test(localPart)) {
    throw new Error("Use only letters, numbers, dots, dashes, or underscores for the alias.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forwardingEmail)) {
    throw new Error("Enter a valid forwarding email address.");
  }

  const now = new Date().toISOString();
  const requestId = randomUUID();
  const aliasEmail = `${localPart}@${EMAIL_DOMAIN}`;
  const pool = getDatabasePool();

  try {
    const result = await pool.query(
      `
        insert into email_alias_requests (
          request_id,
          created_at,
          updated_at,
          requester_user_id,
          requester_name,
          requester_email,
          desired_local_part,
          alias_email,
          forwarding_email,
          reason,
          status
        )
        values ($1, $2, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
        returning *
      `,
      [
        requestId,
        now,
        input.requesterUserId.trim(),
        input.requesterName.trim().slice(0, 160),
        normalizeEmail(input.requesterEmail),
        localPart,
        aliasEmail,
        forwardingEmail,
        input.reason.trim().slice(0, 1000),
      ],
    );

    return mapRow(result.rows[0]);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw new Error(`${aliasEmail} is already requested or assigned.`);
    }

    throw error;
  }
}

export async function listEmailAliasRequests(status?: EmailAliasStatus | "all") {
  await ensureEmailAliasSchema();

  if (!isDatabaseConfigured()) {
    return [] as EmailAliasRequest[];
  }

  const pool = getDatabasePool();
  const params: string[] = [];
  const statusClause =
    status && status !== "all"
      ? (params.push(status), "where status = $1")
      : "";
  const result = await pool.query(
    `
      select *
      from email_alias_requests
      ${statusClause}
      order by
        case status
          when 'pending' then 1
          when 'approved' then 2
          when 'configured' then 3
          else 4
        end,
        created_at desc
      limit 120
    `,
    params,
  );

  return result.rows.map(mapRow);
}

export async function listEmailAliasRequestsForUser(userId: string) {
  await ensureEmailAliasSchema();

  if (!isDatabaseConfigured()) {
    return [] as EmailAliasRequest[];
  }

  const pool = getDatabasePool();
  const result = await pool.query(
    `
      select *
      from email_alias_requests
      where requester_user_id = $1
      order by created_at desc
      limit 20
    `,
    [userId.trim()],
  );

  return result.rows.map(mapRow);
}

export async function resolveEmailAliasRequest(input: ResolveEmailAliasRequestInput) {
  await ensureEmailAliasSchema();

  if (!isDatabaseConfigured()) {
    throw new Error("Email alias requests need the PostgreSQL database to be configured.");
  }

  if (!input.requestId.trim() || !input.decidedByUserId.trim()) {
    throw new Error("A request id and admin identity are required.");
  }

  const status = input.status;
  if (!["approved", "configured", "rejected"].includes(status)) {
    throw new Error("Invalid email alias decision.");
  }

  const now = new Date().toISOString();
  const pool = getDatabasePool();
  const result = await pool.query(
    `
      update email_alias_requests
      set
        status = $2,
        updated_at = $3,
        decided_at = $3,
        decided_by_user_id = $4,
        admin_note = $5,
        cloudflare_status = case
          when $2 = 'configured' then 'configured_in_cloudflare'
          when $2 = 'approved' then 'awaiting_cloudflare_route'
          when $2 = 'rejected' then 'rejected'
          else cloudflare_status
        end
      where request_id = $1
      returning *
    `,
    [
      input.requestId.trim(),
      status,
      now,
      input.decidedByUserId.trim(),
      input.adminNote?.trim().slice(0, 1000) || "",
    ],
  );

  if (result.rows.length === 0) {
    throw new Error("Email alias request not found.");
  }

  const row = mapRow(result.rows[0]);

  if (status === "approved" || status === "configured") {
    await pool.query(
      `
        insert into email_aliases (
          alias_email,
          local_part,
          forwarding_email,
          owner_user_id,
          request_id,
          status,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $7)
        on conflict (alias_email) do update
        set
          forwarding_email = excluded.forwarding_email,
          owner_user_id = excluded.owner_user_id,
          request_id = excluded.request_id,
          status = excluded.status,
          updated_at = excluded.updated_at
      `,
      [
        row.aliasEmail,
        row.desiredLocalPart,
        row.forwardingEmail,
        row.requesterUserId,
        row.requestId,
        status,
        now,
      ],
    );
  } else if (status === "rejected") {
    await pool.query("delete from email_aliases where request_id = $1", [row.requestId]);
  }

  return row;
}
