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

## Step 2: Get Database URL

1. In Supabase project, go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **URI** tab
4. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`)
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. This is your `DATABASE_URL`

## Step 3: Run Prisma Migrations

On your local machine:

```bash
# Generate Prisma Client for PostgreSQL
npx prisma generate

# Run migrations to create tables in Supabase
npx prisma migrate dev --name init_pg
```

**Note**: This will create all tables in your Supabase database. Make sure you're using the production `DATABASE_URL` in your `.env.local` for this step, or set it temporarily:

```bash
# Temporarily set DATABASE_URL for migration
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres"
npx prisma migrate dev --name init_pg
```

## Step 4: Set Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

### Required Variables

- **`DATABASE_URL`**
  - Value: Your Supabase connection string from Step 2
  - Environment: Production, Preview, Development (all)

- **`ADMIN_SECRET`**
  - Value: Your admin authentication secret (use a strong random string)
  - Environment: Production, Preview, Development (all)

- **`CHURCH_CODE`**
  - Value: Your church/organization code
  - Environment: Production, Preview, Development (all)

### Optional Variables

- **`NODE_ENV`**
  - Value: `production` (automatically set by Vercel, but you can override)
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
     - **Build Command**: `npm run build` (default)
     - **Output Directory**: `.next` (default)
3. Deploy

### Subsequent Deployments

- Push to your main branch → automatic deployment
- Or use Vercel CLI: `vercel --prod`

## Step 6: Smoke Tests

After deployment, verify the following URLs:

1. **Homepage**: `https://your-app.vercel.app/`
   - Should show recruitment list

2. **Admin Gate**: `https://your-app.vercel.app/admin`
   - Should show admin secret input form

3. **API Health**: `https://your-app.vercel.app/api/recruitments`
   - Should return JSON: `{ "ok": true, "items": [...] }`

4. **Admin API** (with secret):
   - Test via admin UI or curl with `x-admin-secret` header

## Local Development

For local development, keep using SQLite:

1. Create `.env.local` with:
   ```bash
   DATABASE_URL="file:./dev.db"
   ADMIN_SECRET=your-local-secret
   CHURCH_CODE=your-local-code
   ```

2. Run migrations for SQLite:
   ```bash
   npx prisma migrate dev
   ```

3. The Prisma schema uses `env("DATABASE_URL")`, so:
   - Local: `.env.local` with `file:./dev.db` → SQLite
   - Production: Vercel env var with Postgres URL → PostgreSQL

## Troubleshooting

### Migration Issues

If migrations fail:
- Check `DATABASE_URL` is correct
- Ensure database password is URL-encoded if it contains special characters
- Verify Supabase project is active

### Connection Issues

- Check Vercel environment variables are set correctly
- Verify `DATABASE_URL` includes the password
- Check Supabase project is not paused

### Build Failures

- Ensure `prisma generate` runs during build (should be automatic)
- Check all environment variables are set in Vercel
- Review build logs in Vercel dashboard

## Security Notes

- Never commit `.env.local` or `.env` files
- Use strong, random values for `ADMIN_SECRET`
- Rotate `ADMIN_SECRET` periodically
- Keep Supabase database password secure
- Enable Supabase Row Level Security (RLS) if needed for additional security

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

