# Production Deployment Guide

This guide covers deploying the application to Vercel with Supabase Postgres.

## Prerequisites

- Vercel account
- Supabase account
- Git repository (GitHub/GitLab/Bitbucket)

## Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in:
   - **Name**: Your project name
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

## Step 2: Get the Connection Strings

Prisma needs **two** Postgres URLs (see `prisma/schema.prisma`):

- `DATABASE_URL` — the **pooled** connection (PgBouncer, port `6543`), used by the app at runtime.
- `DIRECT_URL` — the **direct** connection (port `5432`), used for schema changes (`prisma db push`, `prisma generate` introspection).

To get them:

1. In your Supabase project, go to **Settings** → **Database** → **Connection string**.
2. **Pooled** (Transaction mode): copy the URI and append `?pgbouncer=true`. This is your `DATABASE_URL`:
   ```
   postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
3. **Direct** connection: copy the `5432` URI. This is your `DIRECT_URL`:
   ```
   postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
   ```
4. Replace `[PASSWORD]` with your database password (URL-encode any special characters).

## Step 3: Apply the Database Schema

This project does **not** keep a Prisma migration history (`prisma/migrations/` does not exist). The schema is applied by syncing `prisma/schema.prisma` directly. Do **not** run `prisma migrate dev` — without a migrations folder it expects a shadow database and will fail.

Pick one of the following on your local machine:

```bash
# Generate the Prisma Client (also runs automatically via postinstall)
npx prisma generate

# Option A — push the schema straight to Supabase (uses DIRECT_URL)
npx prisma db push
```

**Option B — Supabase MCP**: apply the equivalent DDL with the Supabase MCP `apply_migration` tool against the target project. Use this when you want the change recorded on the Supabase side.

`prisma db push` reads `DIRECT_URL`, so make sure both `DATABASE_URL` and `DIRECT_URL` for the target project are present in your `.env.local` (or exported) before running it:

```bash
# Example: target a specific Supabase project for the push
export DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres"
export DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
npx prisma db push
```

> Row Level Security policies live in `prisma/rls.sql` and are not managed by Prisma. Apply that SQL separately (Supabase SQL editor or MCP) if you rely on RLS.

## Step 4: Set Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables (mirror your local `.env.local` — see [ENV_EXAMPLE.md](./ENV_EXAMPLE.md)):

### Required Variables

- **`NEXT_PUBLIC_SUPABASE_URL`** / **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
  - Value: from Supabase **Settings** → **API**. Safe to expose to the browser.
  - Environment: Production, Preview, Development (all)

- **`DATABASE_URL`**
  - Value: the **pooled** connection string from Step 2 (port `6543`, `?pgbouncer=true`).
  - Environment: Production, Preview, Development (all)

- **`DIRECT_URL`**
  - Value: the **direct** connection string from Step 2 (port `5432`).
  - Environment: Production, Preview, Development (all)

- **`GOOGLE_AI_API_KEY`**
  - Value: Google AI Studio key used for AI parsing. Server-only — never prefix with `NEXT_PUBLIC_`.
  - Environment: Production, Preview, Development (all)

- **`ADMIN_SECRET`**
  - Value: Your admin authentication secret (use a strong random string).
  - Environment: Production, Preview, Development (all)

- **`SUPERADMIN_EMAILS`**
  - Value: Comma-separated Google login emails granted the top `superadmin` role (RBAC bootstrap). Leave empty for none. Server-only — never prefix with `NEXT_PUBLIC_`.
  - Environment: Production, Preview, Development (all)

- **`NEXT_PUBLIC_APP_URL`**
  - Value: The app's public base URL (e.g. `https://your-app.vercel.app`).
  - Environment: Production, Preview, Development (all)

### Optional Variables

- **`NODE_ENV`**
  - Value: `production` (automatically set by Vercel, but you can override).
  - Environment: Production only

## Step 5: Deploy to Vercel

### First Deployment

1. Push your code to Git repository
2. Import project in Vercel:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your Git repository
   - Configure:
     - **Framework Preset**: Next.js
     - **Root Directory**: `./` (default)
     - **Build Command**: `npm run build` (default — `prisma generate` runs via `postinstall`)
     - **Output Directory**: `.next` (default)
3. Deploy

### Subsequent Deployments

- Push to your main branch → automatic deployment
- Or use Vercel CLI: `vercel --prod`

## Step 6: Smoke Tests

After deployment, verify the following URLs:

1. **Homepage**: `https://your-app.vercel.app/`
   - Should load and show the club list

2. **Clubs API**: `https://your-app.vercel.app/api/clubs`
   - Should return JSON: `{ "ok": true, "items": [...] }`

3. **Admin Gate**: `https://your-app.vercel.app/admin`
   - Should show the admin secret input form

4. **Admin API** (with secret):
   - Test via the admin UI, or send the `x-admin-secret` header to an admin endpoint

## Local Development

The project targets Supabase Postgres in every environment — there is no SQLite path.

1. Copy the template and fill in the values:
   ```bash
   cp .env.local.example .env.local
   ```
   At minimum set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL`, `DIRECT_URL`, `GOOGLE_AI_API_KEY`, `ADMIN_SECRET`, and (optionally) `SUPERADMIN_EMAILS`.

2. Point `DATABASE_URL` / `DIRECT_URL` at a Supabase project (a separate dev/preview project is recommended) and sync the schema:
   ```bash
   npx prisma db push
   ```

3. Start the dev server:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Schema Sync Issues

If `prisma db push` fails:
- Check that `DIRECT_URL` (port `5432`, not the pooler) is set and correct — `db push` uses the direct connection.
- Ensure the database password is URL-encoded if it contains special characters.
- Verify the Supabase project is active (not paused).

### Connection Issues

- Check Vercel environment variables are set correctly.
- Confirm `DATABASE_URL` is the pooled URL (`6543`, `?pgbouncer=true`) and `DIRECT_URL` is the direct URL (`5432`).
- Check the Supabase project is not paused.

### Build Failures

- Ensure `prisma generate` runs during install (it is wired as `postinstall`).
- Check all environment variables are set in Vercel.
- Review build logs in Vercel dashboard.

## Security Notes

- Never commit `.env.local` or `.env` files.
- Use strong, random values for `ADMIN_SECRET`, and rotate it periodically.
- Keep the Supabase database password and `GOOGLE_AI_API_KEY` secure (server-only).
- Keep `SUPERADMIN_EMAILS` accurate — every listed email always holds the top role.
- Row Level Security policies are in `prisma/rls.sql`; apply and review them if you rely on RLS.

## Rollback

If deployment fails:

1. Go to Vercel dashboard → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

## Next Steps

- Set up custom domain (optional)
- Configure Supabase backups
- Set up monitoring/alerts
- Review and enable Supabase security features
