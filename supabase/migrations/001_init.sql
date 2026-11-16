-- AnimForge AI Studio — Supabase PostgreSQL Schema & Row-Level Security (RLS)

create extension if not exists "pgcrypto";

-- 1. User Profiles & Quotas
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  is_active boolean not null default true,
  monthly_token_limit bigint not null default 500000,
  monthly_render_limit int not null default 20,
  storage_limit_mb int not null default 2048,
  created_at timestamptz not null default now()
);

-- 2. Reference Videos & Extracted Quality Benchmarks (NOT fixed templates)
create table if not exists public.reference_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_path text not null,
  duration_seconds numeric,
  resolution text,
  fps numeric,
  style_benchmark jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'analyzing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

-- 3. User Asset Library (Voiceovers, BGM, SFX, Images, 3D Props)
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  asset_type text not null check (asset_type in ('voice', 'music', 'sfx', 'image', 'svg', 'font')),
  mime_type text not null,
  file_path text not null,
  size_bytes bigint not null default 0,
  duration_seconds numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4. Video Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  topic_or_script text not null default '',
  language text not null default 'bn' check (language in ('bn', 'en')),
  animation_mode text not null default '2d' check (animation_mode in ('2d', '3d', 'mixed', 'ai-assisted')),
  reference_mode text not null default 'combined' check (reference_mode in ('ref1', 'ref2', 'combined', 'custom')),
  reference_ids uuid[] not null default '{}',
  voice_asset_id uuid references public.assets(id) on delete set null,
  music_asset_id uuid references public.assets(id) on delete set null,
  transcript_segments jsonb not null default '[]'::jsonb,
  customization jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'storyboard_ready', 'code_ready', 'rendering', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Project Scenes (Scene-by-Scene Editor + Generated TSX Code)
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scene_order int not null,
  title text not null,
  narration_segment text not null default '',
  start_time numeric not null default 0,
  duration_seconds numeric not null default 4,
  animation_type text not null default '2d' check (animation_type in ('2d', '3d')),
  visual_plan jsonb not null default '{}'::jsonb,
  generated_code text not null default '',
  code_valid boolean not null default false,
  validation_errors jsonb not null default '[]'::jsonb,
  is_locked boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 6. Render Queue & Export History
create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'validating', 'bundling', 'rendering', 'mixing', 'completed', 'failed')),
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  resolution text not null default '1080p',
  aspect_ratio text not null default '16:9',
  output_path text,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- 7. AI API Usage & Token Consumption Logs
create table if not exists public.api_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  provider text not null check (provider in ('codecraft', 'gemini', 'stt')),
  model text not null,
  operation text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  status text not null default 'success' check (status in ('success', 'error', 'rate_limited')),
  error_message text,
  created_at timestamptz not null default now()
);

-- 8. Admin System Settings (Feature Flags & Provider Controls)
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value) values
  ('providers', '{"codecraft_enabled": true, "gemini_enabled": true, "stt_enabled": false}'::jsonb),
  ('features', '{"allow_3d_rendering": true, "allow_4k_export": false, "max_concurrent_renders": 2}'::jsonb)
on conflict (key) do nothing;

-- Enable Row-Level Security (Strict multi-user isolation)
alter table public.profiles enable row level security;
alter table public.reference_videos enable row level security;
alter table public.assets enable row level security;
alter table public.projects enable row level security;
alter table public.scenes enable row level security;
alter table public.render_jobs enable row level security;
alter table public.api_usage_logs enable row level security;

-- Policies: Users can only access their own records
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users manage own references" on public.reference_videos for all using (auth.uid() = user_id);
create policy "Users manage own assets" on public.assets for all using (auth.uid() = user_id);
create policy "Users manage own projects" on public.projects for all using (auth.uid() = user_id);
create policy "Users manage own scenes" on public.scenes for all using (auth.uid() = user_id);
create policy "Users manage own renders" on public.render_jobs for all using (auth.uid() = user_id);
create policy "Users view own usage" on public.api_usage_logs for select using (auth.uid() = user_id);
