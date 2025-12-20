-- Supabase PostgreSQL 초기 스키마 생성 스크립트
-- Prisma schema.prisma 기반
-- Supabase SQL Editor에 직접 붙여넣어 실행하세요

-- ============================================
-- 1. User 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "churchCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phoneLast4" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User 인덱스 및 제약조건
CREATE INDEX IF NOT EXISTS "User_churchCode_idx" ON "User"("churchCode");
CREATE UNIQUE INDEX IF NOT EXISTS "User_churchCode_name_phoneLast4_key" ON "User"("churchCode", "name", "phoneLast4");

-- ============================================
-- 2. Recruitment 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS "Recruitment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "churchCode" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "appliedCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Recruitment 인덱스
CREATE INDEX IF NOT EXISTS "Recruitment_churchCode_status_idx" ON "Recruitment"("churchCode", "status");

-- updatedAt 자동 업데이트를 위한 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recruitment 테이블에 updatedAt 트리거 생성
DROP TRIGGER IF EXISTS update_Recruitment_updated_at ON "Recruitment";
CREATE TRIGGER update_Recruitment_updated_at
  BEFORE UPDATE ON "Recruitment"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Application 테이블
-- ============================================
CREATE TABLE IF NOT EXISTS "Application" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "recruitmentId" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "name" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Application_recruitmentId_fkey" FOREIGN KEY ("recruitmentId") REFERENCES "Recruitment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Application 인덱스 및 제약조건
CREATE INDEX IF NOT EXISTS "Application_recruitmentId_idx" ON "Application"("recruitmentId");
CREATE INDEX IF NOT EXISTS "Application_contact_idx" ON "Application"("contact");
CREATE UNIQUE INDEX IF NOT EXISTS "Application_recruitmentId_contact_key" ON "Application"("recruitmentId", "contact");

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ 스키마 생성 완료: User, Recruitment, Application 테이블이 생성되었습니다.';
END $$;

