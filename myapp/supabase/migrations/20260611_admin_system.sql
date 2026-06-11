-- ============================================================================
-- Tajweed.AI — Admin system (Supabase-native)
-- Run AFTER 20260611_progress_system.sql, ONCE, in the Supabase SQL editor.
-- Idempotent. It:
--   1. Adds is_admin() (SECURITY DEFINER — avoids RLS recursion on profiles).
--   2. Auto-creates a `profiles` row on signup (+ backfills existing users).
--   3. Grants admins RLS rights: read all users/progress, manage content.
--   4. Creates the `lesson-videos` Storage bucket + admin-only upload policies.
--   5. Bootstraps the first admin.
-- ============================================================================

begin;

-- ── 1. is_admin(): true if the caller's profile role is 'admin' ─────────────
-- SECURITY DEFINER so the lookup bypasses RLS (a profiles policy that calls
-- is_admin() would otherwise recurse).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ── 2. Auto-provision a profile on signup + backfill existing auth users ───
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, date_of_birth, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    case when new.raw_user_meta_data->>'dob' ~ '^\d{4}-\d{1,2}-\d{1,2}$'
         then (new.raw_user_meta_data->>'dob')::date else null end,
    'user',
    now(), now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any pre-existing auth users that lack one.
insert into public.profiles (id, email, name, date_of_birth, role, created_at, updated_at)
select u.id, u.email,
       coalesce(u.raw_user_meta_data->>'full_name', u.email),
       case when u.raw_user_meta_data->>'dob' ~ '^\d{4}-\d{1,2}-\d{1,2}$'
            then (u.raw_user_meta_data->>'dob')::date else null end,
       'user', now(), now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- ── 3. Admin RLS policies (added alongside the owner-only ones; Postgres ORs
--       multiple permissive policies, so owners keep self-access) ───────────
-- profiles: admins can read / update / delete any row (for the users table).
drop policy if exists profiles_admin_read   on public.profiles;
create policy profiles_admin_read   on public.profiles for select using (public.is_admin());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles for delete using (public.is_admin());

-- progress / sessions / mistakes: admins can read all (dashboard analytics) and
-- delete (used when removing a user).
do $$
declare t text;
begin
  foreach t in array array['progress','sessions','mistakes'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_read', t);
    execute format('create policy %I on public.%I for select using (public.is_admin())', t || '_admin_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_delete', t);
    execute format('create policy %I on public.%I for delete using (public.is_admin())', t || '_admin_delete', t);
  end loop;
end $$;

-- content tables: admins can insert / update / delete (public read already set).
do $$
declare t text;
begin
  foreach t in array array['lessons','quizzes','practical_tests'] loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- ── 4. Storage bucket for lesson videos ────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('lesson-videos', 'lesson-videos', true)
on conflict (id) do nothing;

drop policy if exists lesson_videos_public_read on storage.objects;
create policy lesson_videos_public_read on storage.objects
  for select using (bucket_id = 'lesson-videos');

drop policy if exists lesson_videos_admin_insert on storage.objects;
create policy lesson_videos_admin_insert on storage.objects
  for insert with check (bucket_id = 'lesson-videos' and public.is_admin());

drop policy if exists lesson_videos_admin_update on storage.objects;
create policy lesson_videos_admin_update on storage.objects
  for update using (bucket_id = 'lesson-videos' and public.is_admin());

drop policy if exists lesson_videos_admin_delete on storage.objects;
create policy lesson_videos_admin_delete on storage.objects
  for delete using (bucket_id = 'lesson-videos' and public.is_admin());

commit;

-- ── 5. Bootstrap the first admin (edit the email if needed) ────────────────
-- Must run after the user has signed up at least once (so a profile row exists).
update public.profiles set role = 'admin' where email = 'harb86646@gmail.com';

-- ============================================================================
-- NOTES
--  • "Delete user" from the admin UI removes the profile + all their progress
--    data. The underlying auth.users login is NOT removed (needs the service_role
--    key / an Edge Function). Add one later if hard-delete is required.
--  • Video size cap: set it on the bucket in Dashboard → Storage → lesson-videos
--    (e.g. 50 MB) if you want a server-enforced limit.
-- ============================================================================
