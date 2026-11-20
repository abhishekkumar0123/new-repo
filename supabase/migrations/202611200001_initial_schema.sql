create extension if not exists pgcrypto;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role in ('admin','editor')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('admin','editor')
  );
$$;

create table public.profile (
  id integer primary key default 1 check (id = 1),
  name text not null default 'ABHISHEK',
  title text not null default 'Cybersecurity Fresher',
  introduction text not null default '',
  biography text not null default '',
  objective text not null default '',
  learning_focus text not null default '',
  profile_image text,
  resume_url text,
  availability text,
  updated_at timestamptz not null default now()
);
insert into public.profile(id) values (1) on conflict do nothing;

create table public.site_sections (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  subtitle text,
  description text,
  layout text not null default 'grid',
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  display_order integer not null default 0,
  visible boolean not null default true
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.skill_categories(id) on delete set null,
  name text not null,
  description text,
  icon text,
  indicator text,
  display_order integer not null default 0,
  visible boolean not null default true
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  case_id text,
  short_description text,
  report text,
  objective text,
  environment text,
  tools text[] not null default '{}',
  evidence text,
  findings text,
  process text,
  lessons text,
  github_url text,
  live_url text,
  category text,
  difficulty text,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_demo boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  media_url text not null,
  alt text,
  display_order integer not null default 0
);

create table public.writeups (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  summary text,
  content text,
  category text,
  tags text[] not null default '{}',
  cover_image text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  is_demo boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issuer text not null,
  issue_date date,
  expiration_date date,
  image_url text,
  credential_url text,
  verification_id text,
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.lab_entries (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  username text,
  profile_url text,
  achievement text,
  rank text,
  score text,
  description text,
  logo_url text,
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.timeline_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organization text,
  description text,
  occurred_at date,
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  icon text,
  visible boolean not null default true,
  display_order integer not null default 0
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text unique not null,
  public_url text,
  mime_type text,
  size_bytes bigint,
  alt text,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'new' check (status in ('new','read','archived')),
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Abhishek',
  terminal_welcome text not null default 'Welcome to abhishek.security',
  terminal_enabled_commands text[] not null default array['help','whoami','about','skills','projects','contact','clear'],
  contact_email text,
  public_email_visible boolean not null default true,
  seo_title text,
  seo_description text,
  og_image text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1) on conflict do nothing;

alter table public.profile enable row level security;
alter table public.site_sections enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;
alter table public.project_images enable row level security;
alter table public.writeups enable row level security;
alter table public.certifications enable row level security;
alter table public.lab_entries enable row level security;
alter table public.timeline_entries enable row level security;
alter table public.social_links enable row level security;
alter table public.media_assets enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;

create policy "published projects public read" on public.projects for select using (status = 'published');
create policy "project images public read" on public.project_images for select using (exists (select 1 from public.projects p where p.id = project_id and p.status = 'published'));
create policy "published writeups public read" on public.writeups for select using (status = 'published');
create policy "visible skills public read" on public.skills for select using (visible = true);
create policy "visible categories public read" on public.skill_categories for select using (visible = true);
create policy "visible certifications public read" on public.certifications for select using (visible = true);
create policy "visible labs public read" on public.lab_entries for select using (visible = true);
create policy "visible timeline public read" on public.timeline_entries for select using (visible = true);
create policy "visible links public read" on public.social_links for select using (visible = true);
create policy "visible sections public read" on public.site_sections for select using (visible = true);
create policy "profile public read" on public.profile for select using (true);
create policy "settings public read" on public.site_settings for select using (true);

-- Contact submissions are created only through application validation, not arbitrary browser mutations.
create policy "anon can submit contact" on public.contact_messages for insert with check (length(trim(name)) between 2 and 100 and length(trim(email)) between 3 and 254 and length(trim(message)) between 10 and 5000);

-- Administrative CRUD policies for every CMS table.
create policy "admins manage profile" on public.profile for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage sections" on public.site_sections for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage skill categories" on public.skill_categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage skills" on public.skills for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage project images" on public.project_images for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage writeups" on public.writeups for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage certifications" on public.certifications for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage labs" on public.lab_entries for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage timeline" on public.timeline_entries for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage links" on public.social_links for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage media" on public.media_assets for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage messages" on public.contact_messages for select using (public.is_admin());
create policy "admins update messages" on public.contact_messages for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete messages" on public.contact_messages for delete using (public.is_admin());
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public) values ('portfolio-media','portfolio-media',true) on conflict (id) do nothing;

create policy "public media read" on storage.objects for select using (bucket_id = 'portfolio-media');
create policy "admins upload media" on storage.objects for insert with check (bucket_id = 'portfolio-media' and public.is_admin());
create policy "admins update media" on storage.objects for update using (bucket_id = 'portfolio-media' and public.is_admin()) with check (bucket_id = 'portfolio-media' and public.is_admin());
create policy "admins delete media" on storage.objects for delete using (bucket_id = 'portfolio-media' and public.is_admin());
