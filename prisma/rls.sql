-- ============================================================================
-- Row Level Security (RLS) hardening — BlueHumanity
-- ============================================================================
-- 이 앱은 모든 DB 접근을 서버 사이드 Prisma(`postgres` = 테이블 소유자 연결)로만
-- 수행합니다. 테이블 소유자는 RLS를 우회하므로 아래 설정은 Prisma 동작에 영향이
-- 없습니다.
--
-- 반면 공개된 anon 키(NEXT_PUBLIC_SUPABASE_ANON_KEY)로 접근하는 Supabase
-- PostgREST(anon / authenticated 롤)는 테이블 소유자가 아니므로 RLS가 강제됩니다.
-- 정책(policy)을 하나도 만들지 않으면 = "전부 거부" → anon 키로 이 테이블들을
-- 직접 읽거나 쓸 수 없습니다 (심층 방어).
--
-- 적용:  Supabase MCP `apply_migration` (또는 SQL editor)로 실행.
--        모든 문장은 idempotent — 여러 번 실행해도 안전합니다.
-- 주의:  이 파일은 프로덕션 DB를 변경합니다. 적용 전 사용자 승인 필요.
-- ============================================================================

ALTER TABLE "User"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Report"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PromptVersion"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ParsingLog"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ShareEvent"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Club"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubApplication"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClubRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification"       ENABLE ROW LEVEL SECURITY;  -- 개인 알림(본인 외 접근 차단). create_notification_table 마이그레이션에서 이미 적용됨.
ALTER TABLE "AuditLog"           ENABLE ROW LEVEL SECURITY;  -- 감사 로그(운영 전용). create_audit_log_table 마이그레이션에서 이미 적용됨.

-- 정책은 의도적으로 생성하지 않습니다.
-- (anon/authenticated 직접 접근 전면 차단; 서비스는 Prisma 소유자 연결로만 동작)
