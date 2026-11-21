alter table public.writeups
  add column if not exists difficulty text,
  add column if not exists featured boolean not null default false,
  add column if not exists read_time_minutes integer,
  add column if not exists external_references text[] not null default '{}',
  add column if not exists related_writeup_slugs text[] not null default '{}';

alter table public.certifications
  add column if not exists status text not null default 'planned',
  add column if not exists description text,
  add column if not exists related_skills text[] not null default '{}',
  add column if not exists related_projects text[] not null default '{}';

alter table public.certifications
  drop constraint if exists certifications_status_check;

alter table public.certifications
  add constraint certifications_status_check
  check (status in ('earned','pursuing','planned','completed_training','in_progress'));

create table if not exists public.learning_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text,
  category text,
  status text not null default 'not_started'
    check (status in ('not_started','planned','in_progress','completed','earned')),
  start_date date,
  target_date date,
  completed_date date,
  progress integer not null default 0 check (progress between 0 and 100),
  notes text,
  course_url text,
  credential_url text,
  related_skills text[] not null default '{}',
  related_projects text[] not null default '{}',
  visible boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_items enable row level security;

drop policy if exists "visible learning items public read" on public.learning_items;
create policy "visible learning items public read" on public.learning_items
  for select using (visible = true);

drop policy if exists "admins manage learning items" on public.learning_items;
create policy "admins manage learning items" on public.learning_items
  for all using (public.is_admin()) with check (public.is_admin());
