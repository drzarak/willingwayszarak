#!/usr/bin/env node
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import fs from "node:fs";
import process from "node:process";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const { Pool } = pg;
const scryptAsync = promisify(scryptCallback);
const PASSWORD_KEY_LENGTH = 64;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const contents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getArg(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length).trim();
  }

  const index = process.argv.indexOf(`--${name}`);

  if (index >= 0) {
    return process.argv[index + 1]?.trim() || "";
  }

  return "";
}

function required(value, label) {
  if (!value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function optional(value) {
  return value?.trim() || "";
}

function makeNeonStaffUserId(email) {
  const digest = createHash("sha256").update(normalizeEmail(email)).digest("hex");
  return `neon_staff_${digest.slice(0, 24)}`;
}

async function hashStaffPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);

  return {
    hash: key.toString("hex"),
    salt,
  };
}

async function verifyStaffPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) {
    return false;
  }

  const key = await scryptAsync(password, salt, PASSWORD_KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");

  return key.length === expected.length && timingSafeEqual(key, expected);
}

function buildSupabaseAdminClient(supabaseUrl, serviceRoleKey) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserByEmail(adminClient, email) {
  const normalizedEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const matchedUser = users.find(
      (user) => normalizeEmail(user.email || "") === normalizedEmail,
    );

    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < 200) {
      return null;
    }
  }

  return null;
}

async function createOrUpdateAdminUser({ adminClient, email, password, fullName }) {
  const existingUser = await findUserByEmail(adminClient, email);
  const userMetadata = {
    full_name: fullName,
    name: fullName,
    preferred_language: "english",
  };

  if (!existingUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error) {
      throw error;
    }

    return {
      user: data.user,
      action: "created",
    };
  }

  const { data, error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...(existingUser.user_metadata || {}),
      ...userMetadata,
    },
  });

  if (error) {
    throw error;
  }

  return {
    user: data.user,
    action: "updated",
  };
}

async function ensureProfile(adminClient, userId, fullName) {
  const { error } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userId,
        full_name: fullName,
        preferred_language: "english",
      },
      { onConflict: "id" },
    );

  if (error) {
    throw error;
  }
}

async function ensureFounderRole(adminClient, userId) {
  const { data: existingRows, error: lookupError } = await adminClient
    .from("user_roles")
    .select("id,status")
    .eq("user_id", userId)
    .eq("role", "founder_admin")
    .is("branch_id", null);

  if (lookupError) {
    throw lookupError;
  }

  if (Array.isArray(existingRows) && existingRows.length > 0) {
    const roleIds = existingRows.map((row) => row.id).filter(Boolean);
    const { error } = await adminClient
      .from("user_roles")
      .update({ status: "active" })
      .in("id", roleIds);

    if (error) {
      throw error;
    }

    return "updated";
  }

  const { error } = await adminClient.from("user_roles").insert({
    user_id: userId,
    role: "founder_admin",
    status: "active",
    branch_id: null,
    assigned_by: null,
  });

  if (error) {
    throw error;
  }

  return "created";
}

async function verifyStaffLogin({ supabaseUrl, publishableKey, email, password }) {
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Password login verification failed with status ${response.status}.`);
  }

  const payload = JSON.parse(responseText);
  const userId = payload?.user?.id;
  const accessToken = payload?.access_token;

  if (!userId || !accessToken) {
    throw new Error("Supabase login verification did not return a usable session.");
  }

  const query = new URLSearchParams({
    select: "role,branch_id,status",
    user_id: `eq.${userId}`,
    status: "eq.active",
  });
  const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/user_roles?${query}`, {
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const rolesText = await rolesResponse.text();

  if (!rolesResponse.ok) {
    throw new Error(`Role verification failed with status ${rolesResponse.status}.`);
  }

  const roles = JSON.parse(rolesText);
  const hasFounderAdmin = Array.isArray(roles)
    && roles.some((row) => row.role === "founder_admin" && row.status === "active");

  if (!hasFounderAdmin) {
    throw new Error("Login works, but founder_admin role was not visible through app RLS.");
  }

  return {
    userId,
    roles: roles.map((row) => row.role),
  };
}

async function verifyNeonDatabase(databaseUrl, { email, password, fullName }) {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await pool.query("select 1");
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

    const { hash, salt } = await hashStaffPassword(password);
    const userId = makeNeonStaffUserId(email);
    const now = new Date().toISOString();
    const adminAccount = await pool.query(
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
        values ($1, $2, $3, 'admin', $4, $5, 'active', $6, $6)
        on conflict (email) do update set
          user_id = excluded.user_id,
          display_name = excluded.display_name,
          role = 'admin',
          password_hash = excluded.password_hash,
          password_salt = excluded.password_salt,
          status = 'active',
          updated_at = excluded.updated_at
        returning user_id, email, display_name, role, status, password_hash, password_salt;
      `,
      [userId, email, fullName, hash, salt, now],
    );
    const adminRow = adminAccount.rows[0];
    const adminLoginVerified = await verifyStaffPassword(
      password,
      adminRow.password_salt,
      adminRow.password_hash,
    );

    if (!adminLoginVerified) {
      throw new Error("Neon admin password verification failed after bootstrap.");
    }

    const result = await pool.query(`
      select
        current_database() as database_name,
        current_user as user_name,
        to_regclass('public.staff_cases') as staff_cases_table,
        to_regclass('public.email_alias_requests') as email_alias_requests_table,
        to_regclass('public.staff_accounts') as staff_accounts_table
    `);

    return {
      ...result.rows[0],
      adminAccount: {
        userId: adminRow.user_id,
        email: adminRow.email,
        displayName: adminRow.display_name,
        role: adminRow.role,
        status: adminRow.status,
        passwordVerified: adminLoginVerified,
      },
    };
  } finally {
    await pool.end();
  }
}

async function runSupabaseBootstrapQuietly(callback) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const [firstArg] = args;

    if (firstArg instanceof TypeError && firstArg.message === "fetch failed") {
      return;
    }

    originalConsoleError(...args);
  };

  try {
    return await callback();
  } finally {
    console.error = originalConsoleError;
  }
}

async function main() {
  loadEnvFile(getArg("env-file") || ".env.production.local");

  const email = normalizeEmail(
    getArg("email") || process.env.ADMIN_EMAIL || "justzarak@gmail.com",
  );
  const password = required(
    getArg("password") || process.env.ADMIN_PASSWORD || "",
    "Admin password",
  );
  const fullName = required(
    getArg("name") || process.env.ADMIN_FULL_NAME || "Dr Zarak Khan",
    "Admin full name",
  );
  const supabaseUrl = optional(
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
  ).replace(/\/+$/, "");
  const publishableKey = optional(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  );
  const serviceRoleKey = optional(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "",
  );
  const databaseUrl = required(
    process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || "",
    "DATABASE_URL or NEON_DATABASE_URL",
  );

  const neonVerification = await verifyNeonDatabase(databaseUrl, {
    email,
    password,
    fullName,
  });
  let supabaseVerification = {
    ok: false,
    configured: Boolean(supabaseUrl && publishableKey && serviceRoleKey),
    error: "Supabase Auth env vars are not fully configured.",
  };

  if (supabaseVerification.configured) {
    try {
      supabaseVerification = await runSupabaseBootstrapQuietly(async () => {
        const adminClient = buildSupabaseAdminClient(supabaseUrl, serviceRoleKey);
        const { user, action } = await createOrUpdateAdminUser({
          adminClient,
          email,
          password,
          fullName,
        });

        if (!user?.id) {
          throw new Error("Supabase did not return an admin user id.");
        }

        await ensureProfile(adminClient, user.id, fullName);
        const roleAction = await ensureFounderRole(adminClient, user.id);
        const loginVerification = await verifyStaffLogin({
          supabaseUrl,
          publishableKey,
          email,
          password,
        });

        return {
          ok: true,
          configured: true,
          userId: loginVerification.userId,
          authUser: action,
          founderAdminRole: roleAction,
          visibleRoles: loginVerification.roles,
        };
      });
    } catch (error) {
      supabaseVerification = {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        adminAccess: {
          loginPath: "/login",
          role: "admin",
          neonPasswordVerified: neonVerification.adminAccount.passwordVerified,
        },
        supabase: supabaseVerification,
        neon: {
          database: neonVerification.database_name,
          user: neonVerification.user_name,
          staffCasesTable: neonVerification.staff_cases_table || null,
          emailAliasRequestsTable:
            neonVerification.email_alias_requests_table || null,
          staffAccountsTable: neonVerification.staff_accounts_table || null,
          adminAccount: {
            userId: neonVerification.adminAccount.userId,
            email: neonVerification.adminAccount.email,
            displayName: neonVerification.adminAccount.displayName,
            role: neonVerification.adminAccount.role,
            status: neonVerification.adminAccount.status,
          },
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
