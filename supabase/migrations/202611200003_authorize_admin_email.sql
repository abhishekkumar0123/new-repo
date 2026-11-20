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
  end;
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
