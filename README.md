# Willing Ways AI – Voice Clinical Support Layer

Pakistan’s leading addiction treatment & mental health AI assistant, powered by the deployment’s secure server-side OpenAI key.

Built as an official digital extension of https://www.willingways.org/  
Helps patients, families, doctors, and counselors with a voice-first relapse-prevention workflow and doctor-ready brief capture.

## Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/drzarak/drzarakmind)

## How to Use
1. Open the live app.
2. Tap the center call control to start the AI voice support line.
3. Let the AI greet first, then speak naturally in Urdu, English, Punjabi, or mixed language.
4. Staff can use `/staff` for case follow-up, `/staff/email` for team email alias requests, and `/staff/admin` for the Dr. Sadaqat admin summary after role approval.

## Features
- Realtime OpenAI voice calling with clinical turn-taking, relapse-prevention framing, and family guidance.
- Default voice prompt grounded in Willing Ways content, relapse-prevention practice, family coaching, Covey 7 Habits, 4DX execution discipline, AA-compatible recovery structure, and WHO PIR-style rehabilitation thinking.
- Patient and family support with escalation for suicide, overdose, violent relapse, or immediate psychiatric risk.
- Staff case capture for doctor-ready summaries, risk flags, follow-up needs, and status tracking.
- Dr. Sadaqat admin summary for load, service mix, branch mix, program mix, risk queue, and AI cost visibility.
- Team email center where staff can request `@willingways.uk` aliases and admins can approve, reject, or mark routing as configured.
- Supabase authentication with role-based staff/admin access.
- PostgreSQL/Neon-backed staff case store.
- Server-side `OPENAI_API_KEY` support for Vercel deployments.
- Public contact links for Willing Ways clinical support and Dr Zarak Khan platform support.
- English / Urdu toggle and local privacy controls.
- Mobile-friendly, clean voice-first interface.

## Admin Access
There is no hardcoded admin password in the codebase. Staff access uses Supabase Auth when available and a Neon-backed backup staff directory for launch resilience.

For a one-command production bootstrap from the Vercel-pulled env file:

```bash
ADMIN_PASSWORD="replace-with-secure-password" npm run admin:bootstrap -- --email justzarak@gmail.com --name "Dr Zarak Khan"
```

The bootstrap command:

1. Creates or updates the founder admin account in Neon `staff_accounts`.
2. Verifies the password hash before reporting success.
3. Creates the operational Neon tables used by staff cases and email aliases.
4. Attempts the Supabase Auth + `founder_admin` setup when the Supabase project is reachable.

Never commit passwords, `.env.production.local`, or Supabase service-role keys.

If Supabase must be repaired manually, give Dr. Sadaqat admin access like this:

1. Create or invite Dr. Sadaqat as a Supabase Auth user from the Supabase dashboard or the Auth Admin API.
2. Confirm the user email if required by Supabase.
3. Grant an active `founder_admin` role in `public.user_roles`.

```sql
do $$
declare
  target_user_id uuid;
begin
  select id
  into target_user_id
  from auth.users
  where lower(email) = lower('justzarak@gmail.com')
  order by created_at desc
  limit 1;

  if target_user_id is null then
    raise exception 'Supabase Auth user justzarak@gmail.com does not exist. Invite/create the user first.';
  end if;

  insert into public.user_roles (user_id, role, status, branch_id, assigned_by)
  values (
    target_user_id,
    'founder_admin'::public.app_role,
    'active'::public.membership_status,
    null,
    null
  )
  on conflict do nothing;

  update public.user_roles
  set status = 'active'::public.membership_status,
      assigned_by = null
  where user_id = target_user_id
    and role = 'founder_admin'::public.app_role
    and branch_id is null;
end $$;
```

The app maps `founder_admin` and `branch_admin` to the admin portal experience.

## Team Email Center

The app includes an internal request and approval workflow for `@willingways.uk` aliases.
Cloudflare Email Routing can forward incoming mail to verified destination inboxes, but it is not a full hosted mailbox product with IMAP/SMTP staff login. For real staff inboxes, connect Google Workspace, Microsoft 365, Zoho, or another mailbox provider after admin approval.

## Required Production Environment

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` if your Supabase project still uses the older anon key name
- `SUPABASE_SERVICE_ROLE_KEY`
- `STAFF_DASHBOARD_SESSION_SECRET`
- `DATABASE_URL`
- `NEON_DATABASE_URL` as an accepted fallback if `DATABASE_URL` is not present
- Optional legacy sync: `NOTION_TOKEN`, `NOTION_BOOKING_PARENT_PAGE_ID`

Built with love by Dr Zarak Khan for Willing Ways Lahore, Karachi & Islamabad.
