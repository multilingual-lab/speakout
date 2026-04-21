-- Supabase schema for SpeakOut progress tracking
-- Run this in your Supabase SQL Editor

-- Completions table (aggregated per user/session/mode)
create table if not exists completions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  progress_key text not null,
  language text not null,
  scenario_id text not null,
  session_id text not null,
  mode text not null,
  completions integer not null default 0,
  best_score real,
  last_score real,
  last_at timestamptz,
  unique(user_id, progress_key)
);

-- Row-level security
alter table completions enable row level security;

create policy "Users read own completions"
  on completions for select
  using (auth.uid() = user_id);

create policy "Users insert own completions"
  on completions for insert
  with check (auth.uid() = user_id);

create policy "Users update own completions"
  on completions for update
  using (auth.uid() = user_id);

-- Index for fast lookups
create index if not exists idx_completions_user on completions(user_id);
