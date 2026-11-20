-- Permanent authorization for the portfolio administrator.
-- Authentication is still verified by Supabase; only this exact email is admitted.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

update public.admin_users set role = 'admin' where role = 'editor';

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

alter table public.admin_users
  add constraint admin_users_role_check check (role = 'admin');

create unique index if not exists admin_users_single_admin
  on public.admin_users ((role));

drop policy if exists "admin_users own row" on public.admin_users;
create policy "admin_users own row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', '')) =
         'abhishekkumar.ak0123@gmail.com';
$$;

grant execute on function public.is_admin() to authenticated;

drop trigger if exists authorize_admin_email_on_auth_user on auth.users;
drop function if exists public.authorize_admin_email();

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
