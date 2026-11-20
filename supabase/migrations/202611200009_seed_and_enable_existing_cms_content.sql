create extension if not exists pgcrypto;

create table if not exists public.profile (
  id integer primary key default 1 check (id = 1),
  name text not null default 'ABHISHEK', title text not null default 'Cybersecurity Fresher',
  introduction text not null default '', biography text not null default '',
  objective text not null default '', learning_focus text not null default '',
  profile_image text, resume_url text, availability text,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  site_name text not null default 'Abhishek',
  terminal_welcome text not null default 'Welcome to abhishek.security',
  terminal_enabled_commands text[] not null default array['help','whoami','about','skills','projects','contact','clear'],
  contact_email text, public_email_visible boolean not null default true,
  seo_title text, seo_description text, og_image text,
  updated_at timestamptz not null default now()
);

create table if not exists public.skill_categories (
  id uuid primary key default gen_random_uuid(), name text not null,
  description text, display_order integer not null default 0, visible boolean not null default true
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(), category_id uuid references public.skill_categories(id) on delete set null,
  name text not null, description text, icon text, indicator text,
  display_order integer not null default 0, visible boolean not null default true
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

alter table public.profile enable row level security;
alter table public.site_settings enable row level security;
alter table public.skill_categories enable row level security;
alter table public.skills enable row level security;
alter table public.projects enable row level security;

insert into public.profile (id, name, title, introduction, biography, objective, learning_focus, availability)
values (1, 'ABHISHEK', 'Cybersecurity Fresher',
'Building practical skills in security monitoring, incident investigation, networking, and defensive analysis.',
'I am a cybersecurity fresher developing foundational knowledge for a SOC Analyst role. My current focus is on understanding networks, security telemetry, alert investigation, and clear documentation.',
'Secure an entry-level cybersecurity opportunity', 'SOC workflows and defensive analysis',
'Available for entry-level opportunities')
on conflict (id) do nothing;

insert into public.site_settings (id, site_name, terminal_welcome, terminal_enabled_commands, public_email_visible)
values (1, 'Abhishek', 'Welcome to abhishek.security', array['help','whoami','about','skills','projects','contact','clear'], true)
on conflict (id) do nothing;

insert into public.skills (name, description, icon, indicator, display_order, visible)
values
('Networking','TCP/IP, routing concepts, packet analysis fundamentals','Network','Learning',1,true),
('Linux','Command-line fundamentals and system navigation','Terminal','Learning',2,true),
('Security Monitoring','Log review, alert triage, investigation workflow','SearchCheck','Learning',3,true),
('Security Fundamentals','CIA triad, authentication, risk and threat awareness','ShieldAlert','Learning',4,true)
except select name, description, icon, indicator, display_order, visible from public.skills;

insert into public.projects (title, slug, case_id, short_description, category, status, is_demo, display_order)
values
('Network Traffic Investigation','SIM-001','CASE-001','A clearly labelled sample case file demonstrating a structured packet-investigation workflow.','Packet Analysis','published',true,1),
('SOC Alert Triage Workflow','SIM-002','CASE-002','A fictional investigation exercise covering evidence review and analyst recommendations.','Detection','published',true,2),
('Security Learning Lab','SIM-003','CASE-003','A sample editable case file for documenting an isolated, authorized practice environment.','Lab Notes','published',true,3)
on conflict (slug) do nothing;

drop policy if exists "profile public read" on public.profile;
create policy "profile public read" on public.profile for select using (true);
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);
drop policy if exists "visible categories public read" on public.skill_categories;
create policy "visible categories public read" on public.skill_categories for select using (visible = true);
drop policy if exists "visible skills public read" on public.skills;
create policy "visible skills public read" on public.skills for select using (visible = true);
drop policy if exists "published projects public read" on public.projects;
create policy "published projects public read" on public.projects for select using (status = 'published');

drop policy if exists "admins manage profile" on public.profile;
create policy "admins manage profile" on public.profile for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage skill categories" on public.skill_categories;
create policy "admins manage skill categories" on public.skill_categories for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage skills" on public.skills;
create policy "admins manage skills" on public.skills for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage projects" on public.projects;
create policy "admins manage projects" on public.projects for all using (public.is_admin()) with check (public.is_admin());
