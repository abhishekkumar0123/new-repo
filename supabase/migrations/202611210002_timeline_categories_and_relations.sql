alter table public.timeline_entries
  add column if not exists category text,
  add column if not exists related_projects text[] not null default '{}',
  add column if not exists related_certifications text[] not null default '{}',
  add column if not exists related_skills text[] not null default '{}';

create index if not exists timeline_entries_category_idx on public.timeline_entries (category);
create index if not exists timeline_entries_occurred_at_idx on public.timeline_entries (occurred_at);

drop policy if exists "visible timeline public read" on public.timeline_entries;
create policy "visible timeline public read" on public.timeline_entries
  for select using (visible = true);

drop policy if exists "admins manage timeline" on public.timeline_entries;
create policy "admins manage timeline" on public.timeline_entries
  for all using (public.is_admin()) with check (public.is_admin());
