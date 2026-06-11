-- ============================================================================
-- Tajweed.AI — Editable site settings (footer / contact / legal links)
-- Run AFTER 20260611_admin_system.sql (it needs is_admin()). Idempotent.
-- A tiny key/value table; the footer lives under key='footer' as one JSONB doc,
-- so new fields can be added later without a schema change.
-- ============================================================================

begin;

create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Public read (the footer renders for anonymous visitors too); admin-only writes.
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select using (true);

drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed the footer row with the values currently hardcoded in Footer.jsx.
insert into public.site_settings (key, value) values (
  'footer',
  jsonb_build_object(
    'description', 'منصة تعليمية ذكية لتحليل تلاوتك بدقة وتدريبك على إتقان أحكام التجويد خطوة بخطوة باستخدام الذكاء الاصطناعي.',
    'email',       'tajweed.ai0@gmail.com',
    'phone',       '+201055664001',
    'whatsapp',    'https://wa.me/201055664001',
    'facebook',    '',
    'instagram',   '',
    'tiktok',      '',
    'support',     '',
    'privacy_url',    '',
    'terms_url',      '',
    'disclaimer_url', ''
  )
)
on conflict (key) do nothing;

commit;
