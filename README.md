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
4. Staff can use `/staff` for case follow-up and `/staff/admin` for the Dr. Sadaqat admin summary after role approval.

## Features
- Realtime OpenAI voice calling with clinical turn-taking, relapse-prevention framing, and family guidance.
- Default voice prompt grounded in Willing Ways content, relapse-prevention practice, family coaching, Covey 7 Habits, 4DX execution discipline, AA-compatible recovery structure, and WHO PIR-style rehabilitation thinking.
- Patient and family support with escalation for suicide, overdose, violent relapse, or immediate psychiatric risk.
- Staff case capture for doctor-ready summaries, risk flags, follow-up needs, and status tracking.
- Dr. Sadaqat admin summary for load, service mix, branch mix, program mix, risk queue, and AI cost visibility.
- Supabase authentication with role-based staff/admin access.
- PostgreSQL/Neon-backed staff case store.
- Server-side `OPENAI_API_KEY` support for Vercel deployments.
- Public contact links for Willing Ways clinical support and Dr Zarak Khan platform support.
- English / Urdu toggle and local privacy controls.
- Mobile-friendly, clean voice-first interface.

## Admin Access
There is no static admin username/password in the codebase. Admin access is deliberately role-based through Supabase Auth.

To give Dr. Sadaqat admin access:

1. Create or invite Dr. Sadaqat as a Supabase Auth user.
2. Confirm the user email if required by Supabase.
3. Grant an active `founder_admin` role in `public.user_roles`.

```sql
insert into public.user_roles (user_id, role, status, branch_id, assigned_by)
values ('SUPABASE_USER_UUID', 'founder_admin'::public.app_role, 'active'::public.membership_status, null, null)
on conflict (user_id, role, branch_id) do update
set status = 'active'::public.membership_status;
```

The app maps `founder_admin` and `branch_admin` to the admin portal experience.

## Required Production Environment

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STAFF_DASHBOARD_SESSION_SECRET`
- `DATABASE_URL`
- Optional legacy sync: `NOTION_TOKEN`, `NOTION_BOOKING_PARENT_PAGE_ID`

Built with love by Dr Zarak Khan for Willing Ways Lahore, Karachi & Islamabad.
