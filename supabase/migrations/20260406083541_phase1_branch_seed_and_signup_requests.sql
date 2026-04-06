insert into public.branches (code, name, city, is_active)
values
  ('lahore', 'Lahore', 'Lahore', true),
  ('karachi-clifton', 'Karachi Clifton', 'Karachi', true),
  ('karachi-nazimabad', 'Karachi Nazimabad', 'Karachi', true),
  ('islamabad', 'Islamabad', 'Islamabad', true),
  ('remote', 'Remote / shared support', 'Remote', true)
on conflict (code) do update
set
  name = excluded.name,
  city = excluded.city,
  is_active = excluded.is_active,
  updated_at = now();

create or replace function public.handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_username text;
  resolved_language public.profile_language;
  requested_role public.app_role;
  requested_branch_id uuid;
  requested_branch_code text;
begin
  cleaned_username := nullif(
    lower(
      regexp_replace(
        coalesce(new.raw_user_meta_data ->> 'username', ''),
        '[^a-z0-9_]+',
        '',
        'g'
      )
    ),
    ''
  );

  resolved_language := case lower(coalesce(new.raw_user_meta_data ->> 'preferred_language', ''))
    when 'urdu' then 'urdu'
    when 'punjabi' then 'punjabi'
    when 'no_preference' then 'no_preference'
    else 'english'
  end;

  requested_branch_code := lower(trim(coalesce(new.raw_user_meta_data ->> 'requested_branch_code', '')));

  if lower(trim(coalesce(new.raw_user_meta_data ->> 'requested_role', ''))) in ('doctor', 'counselor', 'staff') then
    requested_role := lower(trim(new.raw_user_meta_data ->> 'requested_role'))::public.app_role;
  end if;

  if requested_branch_code <> '' then
    select id
    into requested_branch_id
    from public.branches
    where code = requested_branch_code
    limit 1;
  end if;

  insert into public.profiles (
    id,
    username,
    full_name,
    phone_e164,
    preferred_language
  )
  values (
    new.id,
    cleaned_username,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.phone, '')), ''),
    resolved_language
  )
  on conflict (id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    phone_e164 = coalesce(public.profiles.phone_e164, excluded.phone_e164),
    preferred_language = public.profiles.preferred_language,
    updated_at = now();

  if requested_role is not null then
    insert into public.user_roles (
      user_id,
      role,
      branch_id,
      status,
      assigned_by
    )
    values (
      new.id,
      requested_role,
      requested_branch_id,
      'pending'::public.membership_status,
      null
    )
    on conflict do nothing;
  end if;

  return new;
end;
$$;
