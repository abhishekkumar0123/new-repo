create extension if not exists pgcrypto;

create table if not exists public.site_sections (
  id uuid primary key default gen_random_uuid(), key text unique not null,
  title text, subtitle text, description text, layout text not null default 'grid',
  visible boolean not null default true, display_order integer not null default 0
);

create table if not exists public.writeups (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  summary text, content text, category text, tags text[] not null default '{}', cover_image text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_demo boolean not null default false, display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(), name text not null, issuer text not null,
  issue_date date, expiration_date date, image_url text, credential_url text, verification_id text,
  visible boolean not null default true, display_order integer not null default 0
);

create table if not exists public.lab_entries (
  id uuid primary key default gen_random_uuid(), platform text not null, username text,
  profile_url text, achievement text, rank text, score text, description text, logo_url text,
  visible boolean not null default true, display_order integer not null default 0
);

create table if not exists public.timeline_entries (
  id uuid primary key default gen_random_uuid(), title text not null, organization text,
  description text, occurred_at date, visible boolean not null default true, display_order integer not null default 0
);

create table if not exists public.social_links (
  id uuid primary key default gen_random_uuid(), platform text not null, url text not null,
  icon text, visible boolean not null default true, display_order integer not null default 0
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), title text not null, slug text unique not null,
  case_id text, short_description text, report text, objective text, environment text,
  tools text[] not null default '{}', evidence text, findings text, process text, lessons text,
  github_url text, live_url text, category text, difficulty text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_demo boolean not null default false, display_order integer not null default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  media_url text not null, alt text, display_order integer not null default 0
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(), name text not null, storage_path text unique not null,
  public_url text, mime_type text, size_bytes bigint, alt text, created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  subject text, message text not null, status text not null default 'new' check (status in ('new','read','archived')),
  created_at timestamptz not null default now()
);

alter table public.site_sections enable row level security;
alter table public.writeups enable row level security;
alter table public.certifications enable row level security;
alter table public.lab_entries enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.social_links enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.media_assets enable row level security;
alter table public.contact_messages enable row level security;

insert into public.writeups (title, slug, summary, content, category, status, is_demo, display_order)
values
('Lab walkthrough template','lab-walkthrough-template','A template for documenting lab setup, commands, evidence, and findings.','Add your detailed lab walkthrough here.','Lab walkthrough','draft',true,1),
('Security investigation notes','security-investigation-notes','Structured notes for investigations and alert analysis.','Add your security investigation notes here.','Security investigation','draft',true,2),
('Tool tutorial','tool-tutorial','A learning summary for security tools and workflows.','Add your tool tutorial here.','Tool tutorial','draft',true,3)
on conflict (slug) do nothing;

drop policy if exists "visible sections public read" on public.site_sections;
create policy "visible sections public read" on public.site_sections for select using (visible = true);
drop policy if exists "published writeups public read" on public.writeups;
create policy "published writeups public read" on public.writeups for select using (status = 'published');
drop policy if exists "visible certifications public read" on public.certifications;
create policy "visible certifications public read" on public.certifications for select using (visible = true);
drop policy if exists "visible labs public read" on public.lab_entries;
create policy "visible labs public read" on public.lab_entries for select using (visible = true);
drop policy if exists "visible timeline public read" on public.timeline_entries;
create policy "visible timeline public read" on public.timeline_entries for select using (visible = true);
drop policy if exists "visible links public read" on public.social_links;
create policy "visible links public read" on public.social_links for select using (visible = true);
drop policy if exists "project images public read" on public.project_images;
create policy "project images public read" on public.project_images for select using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
drop policy if exists "public media read" on public.media_assets;
create policy "public media read" on public.media_assets for select using (true);

drop policy if exists "admins manage sections" on public.site_sections;
create policy "admins manage sections" on public.site_sections for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage writeups" on public.writeups;
create policy "admins manage writeups" on public.writeups for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage certifications" on public.certifications;
create policy "admins manage certifications" on public.certifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage labs" on public.lab_entries;
create policy "admins manage labs" on public.lab_entries for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage timeline" on public.timeline_entries;
create policy "admins manage timeline" on public.timeline_entries for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage links" on public.social_links;
create policy "admins manage links" on public.social_links for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage projects" on public.projects;
create policy "admins manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage project images" on public.project_images;
create policy "admins manage project images" on public.project_images for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage media" on public.media_assets;
create policy "admins manage media" on public.media_assets for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage messages" on public.contact_messages;
create policy "admins manage messages" on public.contact_messages for select using (public.is_admin());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = 'abhishekkumar.ak0123@gmail.com';
$$;
grant execute on function public.is_admin() to authenticated;
