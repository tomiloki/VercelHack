create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  coach_tone text not null default 'collaborative',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null,
  default_duration_minutes integer check (default_duration_minutes is null or default_duration_minutes > 0),
  default_points integer not null check (default_points > 0),
  kind text not null check (kind in ('positive', 'reward_support')),
  icon text,
  is_system boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_activities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  activity_template_id uuid references public.activity_templates (id) on delete set null,
  name text not null,
  description text,
  category text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  points integer not null check (points > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  category text not null,
  cost_points integer not null check (cost_points > 0),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  plan_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  agent_summary text,
  created_from text not null default 'on_demand' check (created_from in ('on_demand', 'check_in_adjustment', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_plan_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  daily_plan_id uuid not null references public.daily_plans (id) on delete cascade,
  user_activity_id uuid references public.user_activities (id) on delete set null,
  title text not null,
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  points integer not null check (points > 0),
  position integer not null check (position > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped', 'replaced')),
  rationale text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  daily_plan_id uuid references public.daily_plans (id) on delete set null,
  source text not null default 'web' check (source in ('web', 'telegram', 'whatsapp', 'other')),
  message text not null,
  energy_level integer check (energy_level between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  intent text not null default 'other' check (intent in ('progress', 'fatigue', 'replan', 'reward_request', 'reflection', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  daily_plan_item_id uuid references public.daily_plan_items (id) on delete set null,
  user_activity_id uuid references public.user_activities (id) on delete set null,
  source text not null default 'web' check (source in ('web', 'telegram', 'whatsapp', 'other')),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  points_awarded integer not null check (points_awarded >= 0),
  note text,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('earn', 'redeem', 'adjustment')),
  points integer not null check (points > 0),
  reason text not null,
  completion_id uuid references public.completions (id) on delete set null,
  reward_id uuid references public.rewards (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_threads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  channel text not null check (channel in ('web', 'telegram', 'whatsapp', 'slack', 'other')),
  external_thread_id text not null,
  external_user_id text,
  state jsonb not null default '{}'::jsonb,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel, external_thread_id)
);

create unique index if not exists daily_plans_one_active_per_day_idx
  on public.daily_plans (profile_id, plan_date)
  where status = 'active';

create unique index if not exists daily_plan_items_position_idx
  on public.daily_plan_items (daily_plan_id, position);

create index if not exists goals_profile_id_idx on public.goals (profile_id);
create index if not exists user_activities_profile_id_idx on public.user_activities (profile_id);
create index if not exists rewards_profile_id_idx on public.rewards (profile_id);
create index if not exists daily_plans_profile_id_idx on public.daily_plans (profile_id);
create index if not exists daily_plan_items_profile_id_idx on public.daily_plan_items (profile_id);
create index if not exists check_ins_profile_id_idx on public.check_ins (profile_id);
create index if not exists completions_profile_id_idx on public.completions (profile_id);
create index if not exists wallet_transactions_profile_id_idx on public.wallet_transactions (profile_id);
create index if not exists conversation_threads_profile_id_idx on public.conversation_threads (profile_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_goals_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

create trigger set_activity_templates_updated_at
before update on public.activity_templates
for each row
execute function public.set_updated_at();

create trigger set_user_activities_updated_at
before update on public.user_activities
for each row
execute function public.set_updated_at();

create trigger set_rewards_updated_at
before update on public.rewards
for each row
execute function public.set_updated_at();

create trigger set_daily_plans_updated_at
before update on public.daily_plans
for each row
execute function public.set_updated_at();

create trigger set_daily_plan_items_updated_at
before update on public.daily_plan_items
for each row
execute function public.set_updated_at();

create trigger set_check_ins_updated_at
before update on public.check_ins
for each row
execute function public.set_updated_at();

create trigger set_completions_updated_at
before update on public.completions
for each row
execute function public.set_updated_at();

create trigger set_wallet_transactions_updated_at
before update on public.wallet_transactions
for each row
execute function public.set_updated_at();

create trigger set_conversation_threads_updated_at
before update on public.conversation_threads
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.activity_templates enable row level security;
alter table public.user_activities enable row level security;
alter table public.rewards enable row level security;
alter table public.daily_plans enable row level security;
alter table public.daily_plan_items enable row level security;
alter table public.check_ins enable row level security;
alter table public.completions enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.conversation_threads enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "profiles_delete_own"
  on public.profiles
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "activity_templates_select_authenticated"
  on public.activity_templates
  for select
  to authenticated
  using (true);

create policy "goals_select_own"
  on public.goals
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = goals.profile_id
      and p.user_id = auth.uid()
  ));

create policy "goals_insert_own"
  on public.goals
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = goals.profile_id
      and p.user_id = auth.uid()
  ));

create policy "goals_update_own"
  on public.goals
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = goals.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = goals.profile_id
      and p.user_id = auth.uid()
  ));

create policy "goals_delete_own"
  on public.goals
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = goals.profile_id
      and p.user_id = auth.uid()
  ));

create policy "user_activities_select_own"
  on public.user_activities
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = user_activities.profile_id
      and p.user_id = auth.uid()
  ));

create policy "user_activities_insert_own"
  on public.user_activities
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = user_activities.profile_id
      and p.user_id = auth.uid()
  ));

create policy "user_activities_update_own"
  on public.user_activities
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = user_activities.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = user_activities.profile_id
      and p.user_id = auth.uid()
  ));

create policy "user_activities_delete_own"
  on public.user_activities
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = user_activities.profile_id
      and p.user_id = auth.uid()
  ));

create policy "rewards_select_own"
  on public.rewards
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = rewards.profile_id
      and p.user_id = auth.uid()
  ));

create policy "rewards_insert_own"
  on public.rewards
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = rewards.profile_id
      and p.user_id = auth.uid()
  ));

create policy "rewards_update_own"
  on public.rewards
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = rewards.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = rewards.profile_id
      and p.user_id = auth.uid()
  ));

create policy "rewards_delete_own"
  on public.rewards
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = rewards.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plans_select_own"
  on public.daily_plans
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plans.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plans_insert_own"
  on public.daily_plans
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = daily_plans.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plans_update_own"
  on public.daily_plans
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plans.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = daily_plans.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plans_delete_own"
  on public.daily_plans
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plans.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plan_items_select_own"
  on public.daily_plan_items
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plan_items.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plan_items_insert_own"
  on public.daily_plan_items
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = daily_plan_items.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plan_items_update_own"
  on public.daily_plan_items
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plan_items.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = daily_plan_items.profile_id
      and p.user_id = auth.uid()
  ));

create policy "daily_plan_items_delete_own"
  on public.daily_plan_items
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = daily_plan_items.profile_id
      and p.user_id = auth.uid()
  ));

create policy "check_ins_select_own"
  on public.check_ins
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = check_ins.profile_id
      and p.user_id = auth.uid()
  ));

create policy "check_ins_insert_own"
  on public.check_ins
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = check_ins.profile_id
      and p.user_id = auth.uid()
  ));

create policy "check_ins_update_own"
  on public.check_ins
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = check_ins.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = check_ins.profile_id
      and p.user_id = auth.uid()
  ));

create policy "check_ins_delete_own"
  on public.check_ins
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = check_ins.profile_id
      and p.user_id = auth.uid()
  ));

create policy "completions_select_own"
  on public.completions
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = completions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "completions_insert_own"
  on public.completions
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = completions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "completions_update_own"
  on public.completions
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = completions.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = completions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "completions_delete_own"
  on public.completions
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = completions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "wallet_transactions_select_own"
  on public.wallet_transactions
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = wallet_transactions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "wallet_transactions_insert_own"
  on public.wallet_transactions
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = wallet_transactions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "wallet_transactions_update_own"
  on public.wallet_transactions
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = wallet_transactions.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = wallet_transactions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "wallet_transactions_delete_own"
  on public.wallet_transactions
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = wallet_transactions.profile_id
      and p.user_id = auth.uid()
  ));

create policy "conversation_threads_select_own"
  on public.conversation_threads
  for select
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = conversation_threads.profile_id
      and p.user_id = auth.uid()
  ));

create policy "conversation_threads_insert_own"
  on public.conversation_threads
  for insert
  to authenticated
  with check (exists (
    select 1
    from public.profiles p
    where p.id = conversation_threads.profile_id
      and p.user_id = auth.uid()
  ));

create policy "conversation_threads_update_own"
  on public.conversation_threads
  for update
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = conversation_threads.profile_id
      and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.profiles p
    where p.id = conversation_threads.profile_id
      and p.user_id = auth.uid()
  ));

create policy "conversation_threads_delete_own"
  on public.conversation_threads
  for delete
  to authenticated
  using (exists (
    select 1
    from public.profiles p
    where p.id = conversation_threads.profile_id
      and p.user_id = auth.uid()
  ));
