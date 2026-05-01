import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import { getDatabasePool, isDatabaseConfigured } from "@/lib/server/database";
import type { StaffRole } from "@/lib/server/staff-auth-adapter";

const scryptAsync = promisify(scrypt);
const PASSWORD_KEY_LENGTH = 64;
const STAFF_ACCOUNTS_READY_SYMBOL = Symbol.for("willing-ways-ai.staff-accounts-ready");
const STAFF_ROLES = new Set<StaffRole>(["admin", "doctor", "counselor", "staff"]);

type StaffAccountStoreGlobal = typeof globalThis & {
  [STAFF_ACCOUNTS_READY_SYMBOL]?: Promise<void>;
};

interface StaffAccountRow {
  user_id: string;
  email: string;
  display_name: string;
  role: string;
  password_hash: string;
  password_salt: string;
  status: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isStaffRole(value: string): value is StaffRole {
  return STAFF_ROLES.has(value as StaffRole);
}

function makeStaffUserId(email: string) {
  const digest = createHash("sha256").update(normalizeEmail(email)).digest("hex");
  return `neon_staff_${digest.slice(0, 24)}`;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;

  return {
    hash: key.toString("hex"),
    salt,
  };
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  if (!salt || !expectedHash) {
    return false;
  }

  try {
    const key = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
    const expected = Buffer.from(expectedHash, "hex");

    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

async function createStaffAccountsTable() {
  const pool = getDatabasePool();

  await pool.query(`
    create table if not exists staff_accounts (
      user_id text primary key,
      email text not null unique,
      display_name text not null,
      role text not null,
      password_hash text not null,
      password_salt text not null,
      status text not null default 'active',
      created_at timestamptz not null,
      updated_at timestamptz not null,
      last_login_at timestamptz
    );
  `);
  await pool.query(
    "create index if not exists idx_staff_accounts_email_status on staff_accounts (lower(email), status);",
  );
  await pool.query(
    "create index if not exists idx_staff_accounts_role_status on staff_accounts (role, status);",
  );
}

async function ensureStaffAccountsTable() {
  const globalObject = globalThis as StaffAccountStoreGlobal;

  if (!globalObject[STAFF_ACCOUNTS_READY_SYMBOL]) {
    globalObject[STAFF_ACCOUNTS_READY_SYMBOL] = createStaffAccountsTable();
  }

  return globalObject[STAFF_ACCOUNTS_READY_SYMBOL];
}

export function isStaffAccountStoreConfigured() {
  return isDatabaseConfigured();
}

export async function upsertStaffAccount({
  displayName,
  email,
  password,
  role,
}: {
  displayName: string;
  email: string;
  password: string;
  role: StaffRole;
}) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = displayName.trim() || normalizedEmail;

  if (!normalizedEmail) {
    throw new Error("Staff account email is required.");
  }

  if (password.trim().length < 8) {
    throw new Error("Staff account password must be at least 8 characters.");
  }

  if (!isStaffRole(role)) {
    throw new Error("Staff account role is not allowed.");
  }

  await ensureStaffAccountsTable();

  const pool = getDatabasePool();
  const now = new Date().toISOString();
  const { hash, salt } = await hashPassword(password);
  const userId = makeStaffUserId(normalizedEmail);

  const result = await pool.query<Pick<StaffAccountRow, "user_id" | "email" | "display_name" | "role" | "status">>(
    `
      insert into staff_accounts (
        user_id,
        email,
        display_name,
        role,
        password_hash,
        password_salt,
        status,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, 'active', $7, $7)
      on conflict (email) do update set
        user_id = excluded.user_id,
        display_name = excluded.display_name,
        role = excluded.role,
        password_hash = excluded.password_hash,
        password_salt = excluded.password_salt,
        status = 'active',
        updated_at = excluded.updated_at
      returning user_id, email, display_name, role, status;
    `,
    [userId, normalizedEmail, normalizedName, role, hash, salt, now],
  );

  return result.rows[0];
}

export async function signInStaffWithNeon(email: string, password: string) {
  if (!isStaffAccountStoreConfigured()) {
    return {
      ok: false as const,
      status: 503,
      error: "The staff account database is not configured.",
    };
  }

  await ensureStaffAccountsTable();

  const normalizedEmail = normalizeEmail(email);
  const pool = getDatabasePool();
  const result = await pool.query<StaffAccountRow>(
    `
      select user_id, email, display_name, role, password_hash, password_salt, status
      from staff_accounts
      where lower(email) = lower($1)
      limit 1;
    `,
    [normalizedEmail],
  );

  const account = result.rows[0];

  if (!account || account.status !== "active") {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid staff email or password.",
    };
  }

  if (!isStaffRole(account.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "This staff account does not have an allowed dashboard role.",
    };
  }

  const passwordMatches = await verifyPassword(
    password,
    account.password_salt,
    account.password_hash,
  );

  if (!passwordMatches) {
    return {
      ok: false as const,
      status: 401,
      error: "Invalid staff email or password.",
    };
  }

  await pool.query("update staff_accounts set last_login_at = now() where user_id = $1;", [
    account.user_id,
  ]);

  return {
    ok: true as const,
    userId: account.user_id,
    email: account.email,
    role: account.role,
    displayName: account.display_name || account.email,
  };
}
