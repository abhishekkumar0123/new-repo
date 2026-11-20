alter table public.admin_users enable row level security;

alter table public.admin_users
  drop constraint if exists admin_users_role_check;

update public.admin_users set role = 'admin' where role = 'editor';

alter table public.admin_users
  add constraint admin_users_role_check check (role = 'admin');

create unique index if not exists admin_users_single_admin
  on public.admin_users ((role));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "admin_users own row" on public.admin_users;
create policy "admin_users own row"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());
