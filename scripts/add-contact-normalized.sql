-- Migration: Add contact_normalized column to Application table
-- Run this in Supabase SQL Editor
-- Table name is "Application" (PascalCase, quoted)

-- Step 0: Check current table structure (run this first to see what exists)
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='Application'
-- ORDER BY column_name;

-- Step 1: Add contact_normalized column with default value (snake_case)
ALTER TABLE "Application" 
ADD COLUMN IF NOT EXISTS "contact_normalized" TEXT NOT NULL DEFAULT '';

-- Step 2: Create index on contact_normalized
CREATE INDEX IF NOT EXISTS "idx_Application_contact_normalized" 
ON "Application" ("contact_normalized");

-- Step 3: Create unique constraint for recruitmentId + contact_normalized
-- (Drop existing if any, then recreate)
ALTER TABLE "Application"
DROP CONSTRAINT IF EXISTS "Application_recruitmentId_contact_normalized_key";

ALTER TABLE "Application"
ADD CONSTRAINT "Application_recruitmentId_contact_normalized_key"
UNIQUE ("recruitmentId", "contact_normalized");

-- Step 4: Backfill existing rows: normalize contact values
-- Email: lowercase, Phone: digits only
UPDATE "Application"
SET "contact_normalized" = 
  CASE 
    WHEN "contact" LIKE '%@%' THEN LOWER(TRIM("contact"))
    ELSE REGEXP_REPLACE(TRIM("contact"), '[^0-9]', '', 'g')
  END
WHERE "contact_normalized" = '' OR "contact_normalized" IS NULL;

-- Step 5: Verify the update
SELECT COUNT(*) AS total_applications,
       COUNT(CASE WHEN "contact_normalized" = '' THEN 1 END) AS empty_normalized
FROM "Application";

