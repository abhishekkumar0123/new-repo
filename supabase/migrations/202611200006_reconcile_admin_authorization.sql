-- Reconcile admin authorization across the static-host migrations.
-- This keeps authorization limited to the configured Supabase auth account
-- and requires a matching admin_users row for CMS access.

alter table public.admin_users enable row level security;

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check check (role = 'admin');

update public.admin_users
set role = 'admin'
where role = 'editor';

create unique index if not exists admin_users_single_admin
  on public.admin_users ((role));

drop policy if exists "admin_users own row" on public.admin_users;
create policy "admin_users own row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.authorize_admin_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'abhishekkumar.ak0123@gmail.com' then
    insert into public.admin_users (user_id, email, role)
    values (new.id, new.email, 'admin')
    on conflict (user_id) do update
      set email = excluded.email,
          role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists authorize_admin_email_on_auth_user on auth.users;
create trigger authorize_admin_email_on_auth_user
after insert or update of email on auth.users
for each row execute function public.authorize_admin_email();

insert into public.admin_users (user_id, email, role)
select id, email, 'admin'
from auth.users
where lower(email) = 'abhishekkumar.ak0123@gmail.com'
on conflict (user_id) do update
set email = excluded.email,
    role = 'admin';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) = 'abhishekkumar.ak0123@gmail.com'
    and exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
        and lower(email) = 'abhishekkumar.ak0123@gmail.com'
        and role = 'admin'
    );
$$;
