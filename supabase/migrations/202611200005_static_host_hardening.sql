-- Static-host browser uploads: constrain the public media bucket at Supabase's storage layer.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']
where id = 'portfolio-media';

-- Strengthen contact insert validation for browser submissions.
drop policy if exists "anon can submit contact" on public.contact_messages;
create policy "anon can submit contact"
  on public.contact_messages
  for insert
  with check (
    length(trim(name)) between 2 and 100
    and length(trim(email)) between 3 and 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and coalesce(length(trim(subject)), 0) <= 150
    and length(trim(message)) between 10 and 5000
  );
