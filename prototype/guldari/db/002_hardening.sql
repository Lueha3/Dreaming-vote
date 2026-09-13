-- ============================================================================
-- 굴다리 스키마 하드닝 — Supabase security/performance advisor 결과 반영
-- (001_init_schema.sql 적용 직후 get_advisors 실행 결과)
-- ============================================================================

-- 보안 advisor(WARN): 함수 search_path 미고정 — 스키마 하이재킹 방지를 위해 명시 고정.
alter function set_updated_at() set search_path = public, pg_temp;
alter function block_mutation() set search_path = public, pg_temp;
alter function trust_weight(boolean, timestamptz, boolean) set search_path = public, pg_temp;
alter function enforce_setlist_approved_before_live() set search_path = public, pg_temp;
alter function create_concert_stats_row() set search_path = public, pg_temp;
alter function enforce_rating_requires_min_presence() set search_path = public, pg_temp;
alter function refresh_concert_stats_on_rating() set search_path = public, pg_temp;
alter function assign_fan_number() set search_path = public, pg_temp;
alter function sp_ledger_compute_balance() set search_path = public, pg_temp;

-- 성능 advisor(INFO): FK 컬럼에 커버링 인덱스 없음 — 조인/삭제 시 풀스캔 방지.
create index concerts_opening_guest_artist_idx on concerts(opening_guest_artist_id);
create index concerts_setlist_idx on concerts(setlist_id);
create index fan_registrations_user_idx on fan_registrations(user_id);
create index season_scores_artist_idx on season_scores(artist_id);
create index setlist_items_song_idx on setlist_items(song_id);
create index setlists_artist_idx on setlists(artist_id);

-- 남은 advisor 항목(rls_enabled_no_policy, INFO)은 의도된 설계다:
-- 모든 테이블 RLS 활성화 + 정책 0개 = anon/authenticated PostgREST 직접 접근 전면 차단,
-- 서비스는 서버 사이드 소유자 연결로만 접근한다(prisma/rls.sql과 동일 관례).
