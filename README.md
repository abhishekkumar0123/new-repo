# Abhishek Cybersecurity Portfolio

A Next.js, TypeScript, Tailwind, and Supabase portfolio with a private administrator CMS.

## Development

```bash
npm install
npm run dev
```

The local environment is configured in `.env.local`, which is ignored by Git. It contains only the Supabase project URL and publishable key.

## Supabase authentication setup

1. Run both SQL migrations from `supabase/migrations/` in Supabase SQL Editor.
2. In Supabase Authentication, create the account for `abhishekkumar.ak0123@gmail.com`.
3. Copy the created auth user UUID.
4. Run:

```sql
insert into public.admin_users (user_id, email, role)
values ('YOUR-AUTH-UUID', 'abhishekkumar.ak0123@gmail.com', 'admin')
on conflict (user_id) do update
set email = excluded.email, role = excluded.role;
```

The `admin_users` table has RLS and only its own authenticated administrator row can be read. CMS APIs and `/admin` routes require a valid session plus an `admin` row.

## Supabase URL configuration

In Supabase Auth → URL Configuration, add:

- `http://localhost:3000/auth/callback`
- `https://YOUR-DOMAIN/auth/callback`

Set Site URL to `http://localhost:3000` while developing, and to `https://YOUR-DOMAIN` after deployment. Supabase also supports custom redirect URLs in development and production.

## Password reset

Open `/admin/login`, select **Forgot password?**, and enter the administrator email. The recovery email redirects through `/auth/callback` to `/admin/reset-password`.

No public signup route is created. Never add the service-role key or password to browser code or environment files used by the browser.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase/migrations/202611200001_initial_schema.sql` in the Supabase SQL editor.
3. Create an administrator in Supabase Authentication.
4. Add that user's UUID and email to `public.admin_users` with role `admin` or `editor`.
5. Copy the project URL and anon key into `.env.local`.

Only users present in `admin_users` may enter `/admin`. Ordinary authenticated Supabase users are not administrators.

The initial public content is placeholder or sample content where appropriate. It does not claim professional experience, certifications, or achievements.

## GitHub Pages static hosting

The site exports to `out/` with repository base path `/new-repo`. GitHub Actions builds pull requests and deploys pushes to `main` (and manual dispatch). Configure the repository as a GitHub Pages source using GitHub Actions.

Set these as GitHub Actions Secrets (recommended) or repository Actions Variables:

- `NEXT_PUBLIC_SUPABASE_URL` — the Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the Supabase publishable key or legacy anon key.

The workflow accepts Secrets first, then Actions Variables. Do not add a service-role key.

In Supabase Auth URL Configuration, add the GitHub Pages callback:

- `https://abhishekkumar0123.github.io/new-repo/auth/callback/`
- `https://abhishekkumar0123.github.io/new-repo/admin/reset-password/`

## Static hosting limitations

- Contact submissions run directly through Supabase RLS. Server-side IP rate limiting is unavailable; the form uses honeypot protection and a browser session throttle. For stronger abuse protection, configure Supabase CAPTCHA, database quotas, or a third-party form protection service.
- Project and writeup detail entries are loaded by slug in static browser pages, so new CMS entries do not require a GitHub Pages rebuild.
- Apply all SQL migrations, including `202611200006_reconcile_admin_authorization.sql`, in the Supabase SQL editor.
- Configure the public URL allowlists in Supabase Auth for local and production callback URLs.
- The media bucket must allow public reads and restrict authenticated writes to the `is_admin()` RLS policy. Migration `005` configures bucket MIME and size limits.
- Apply `202611200007_admin_email_authorization.sql` to reconcile permanent administrator email authorization in Supabase.
