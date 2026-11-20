-- Import the current visible portfolio content into CMS tables.
-- Existing rows are preserved; seed rows are matched by stable keys/slugs.

insert into public.profile (
  id, name, title, introduction, biography, objective, learning_focus, availability
) values (
  1,
  'ABHISHEK',
  'Cybersecurity Fresher',
  'Building practical skills in security monitoring, incident investigation, networking, and defensive analysis. This portfolio is ready for your verified experience and learning journey.',
  'I am a cybersecurity fresher developing foundational knowledge for a SOC Analyst role. My current focus is on understanding networks, security telemetry, alert investigation, and clear documentation.',
  'Secure an entry-level cybersecurity opportunity',
  'SOC workflows and defensive analysis',
  'Available for entry-level opportunities'
)
on conflict (id) do nothing;

insert into public.site_settings (
  id, site_name, terminal_welcome, terminal_enabled_commands,
  public_email_visible
) values (
  1,
  'Abhishek',
  'Welcome to abhishek.security',
  array['help','whoami','about','skills','projects','contact','clear'],
  true
)
on conflict (id) do nothing;

insert into public.skill_categories (id, name, description, display_order, visible)
values
  (gen_random_uuid(), 'Networking', 'TCP/IP, routing concepts, packet analysis fundamentals', 1, true),
  (gen_random_uuid(), 'Linux', 'Command-line fundamentals and system navigation', 2, true),
  (gen_random_uuid(), 'Security Monitoring', 'Log review, alert triage, investigation workflow', 3, true),
  (gen_random_uuid(), 'Security Fundamentals', 'CIA triad, authentication, risk and threat awareness', 4, true)
on conflict do nothing;

insert into public.skills (name, description, icon, indicator, display_order, visible)
select 'Networking', 'TCP/IP, routing concepts, packet analysis fundamentals', 'Network', 'Learning', 1, true
where not exists (select 1 from public.skills where name = 'Networking');
insert into public.skills (name, description, icon, indicator, display_order, visible)
select 'Linux', 'Command-line fundamentals and system navigation', 'Terminal', 'Learning', 2, true
where not exists (select 1 from public.skills where name = 'Linux');
insert into public.skills (name, description, icon, indicator, display_order, visible)
select 'Security Monitoring', 'Log review, alert triage, investigation workflow', 'SearchCheck', 'Learning', 3, true
where not exists (select 1 from public.skills where name = 'Security Monitoring');
insert into public.skills (name, description, icon, indicator, display_order, visible)
select 'Security Fundamentals', 'CIA triad, authentication, risk and threat awareness', 'ShieldAlert', 'Learning', 4, true
where not exists (select 1 from public.skills where name = 'Security Fundamentals');

insert into public.projects (
  title, slug, case_id, short_description, category, status, is_demo,
  display_order, process, findings
) values
  ('Network Traffic Investigation', 'SIM-001', 'CASE-001',
   'A clearly labelled sample case file demonstrating a structured packet-investigation workflow.',
   'Packet Analysis', 'published', true, 1,
   'Review packet evidence and document the investigation workflow.',
   'Sample finding placeholder; replace with verified evidence.'),
  ('SOC Alert Triage Workflow', 'SIM-002', 'CASE-002',
   'A fictional investigation exercise covering evidence review and analyst recommendations.',
   'Detection', 'published', true, 2,
   'Triage the alert, validate telemetry, and document recommendations.',
   'Sample finding placeholder; replace with verified evidence.'),
  ('Security Learning Lab', 'SIM-003', 'CASE-003',
   'A sample editable case file for documenting an isolated, authorized practice environment.',
   'Lab Notes', 'published', true, 3,
   'Document the isolated lab, commands, evidence, and lessons learned.',
   'Sample finding placeholder; replace with verified results.')
on conflict (slug) do nothing;
