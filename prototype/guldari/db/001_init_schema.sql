-- ============================================================================
-- 굴다리(Guldari) 콘서트 앱 — 초기 스키마
-- 02-development-plan.md §8(ERD) · 03-economy-design.md(SP 경제 규칙) ·
-- 04-risk-analysis.md(원장 분리) · 06-venues-and-discovery.md(티어 리스킨) 반영
--
-- 설계 원칙:
--   1. 계정은 Supabase Auth(auth.users)에 위임 — profiles가 1:1 확장 테이블.
--   2. 별점·리워드·랭킹의 핵심 불변식은 앱 버그에도 깨지지 않도록 DB 트리거로
--      이중 방어한다(참석 없이 별점 불가, SP 원장 append-only, 잔액 음수 불가,
--      팬 넘버 중복 불가, 셋리스트 15곡 초과 불가).
--   3. SP(무상 리워드)와 현금 정산(payout_ledger)은 물리적으로 분리된 테이블 —
--      04-risk-analysis.md §2의 "SP↔현금 전환 경로 없음"을 스키마 레벨에서 보증.
--   4. 일일/주간 지급 한도(03 §2-1) 같은 시계열 집계 규칙은 앱 레이어에서
--      insert 직전에 SUM 쿼리로 검증한다 — DB 트리거로는 강제하지 않는다(의도적
--      스코프 경계: 구조적 불변식만 DB가 보증, 정책성 한도는 운영 중 조정 가능해야 함).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- profiles — Supabase Auth 사용자의 앱 확장 정보
-- verified_ci/abuse_flag는 03 §3 신뢰가중치(trust_weight) 산정의 원재료.
-- ----------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  nickname     text not null check (char_length(nickname) between 1 and 20),
  avatar_config jsonb not null default '{}'::jsonb,
  verified_ci  boolean not null default false, -- 본인인증(CI) 완료 여부
  abuse_flag   boolean not null default false, -- 어뷰징 클러스터 판정(수동/배치)
  created_at   timestamptz not null default now()
);

-- 신뢰가중치 t: 어뷰징 0 > 본인인증 1.0 > 신규(14일 미만) 0.3 > 그 외 비인증 0.1
-- (03-economy-design.md §1 "유효관중 = Σ 신뢰점수 tᵢ")
create or replace function trust_weight(p_verified_ci boolean, p_created_at timestamptz, p_abuse_flag boolean)
returns numeric as $$
  select case
    when p_abuse_flag then 0
    when p_verified_ci then 1.0
    when now() - p_created_at < interval '14 days' then 0.3
    else 0.1
  end;
$$ language sql immutable;

-- ----------------------------------------------------------------------------
-- artist_profiles — T0 취미 / T1 파트너 / T2 어워드 수상자 (03 §1-2)
-- ----------------------------------------------------------------------------
create table artist_profiles (
  user_id         uuid primary key references profiles(id) on delete cascade,
  stage_name      text not null check (char_length(stage_name) between 1 and 30),
  bio             text,
  popularity_score numeric not null default 0,
  tier            text not null default 'T0_HOBBY'
                    check (tier in ('T0_HOBBY', 'T1_PARTNER', 'T2_AWARD')),
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- songs — 요구사항 2: 자작곡/AI곡(저작권 클리어 시), 검수 상태머신
-- ----------------------------------------------------------------------------
create table songs (
  id              uuid primary key default gen_random_uuid(),
  artist_id       uuid not null references artist_profiles(user_id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 40),
  duration_seconds int not null check (duration_seconds > 0),
  audio_url       text,
  hls_url         text,
  source_type     text not null check (source_type in ('ORIGINAL', 'AI_GENERATED')),
  ai_tool         text, -- 예: "Suno Pro" — source_type='AI_GENERATED'일 때 참고용
  review_status   text not null default 'PENDING'
                    check (review_status in ('PENDING', 'FINGERPRINT_FLAGGED', 'APPROVED', 'REJECTED')),
  acr_result      jsonb, -- ACRCloud 등 핑거프린트 검수 원본 응답
  ai_probability  numeric(4,3) check (ai_probability is null or ai_probability between 0 and 1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger songs_set_updated_at before update on songs
  for each row execute function set_updated_at();

create index songs_artist_idx on songs(artist_id);
create index songs_review_status_idx on songs(review_status);

-- ----------------------------------------------------------------------------
-- setlists / setlist_items — 요구사항 1: 최대 15곡 (position 1..15로 하드 제한)
-- ----------------------------------------------------------------------------
create table setlists (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references artist_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

create table setlist_items (
  setlist_id uuid not null references setlists(id) on delete cascade,
  song_id    uuid not null references songs(id) on delete restrict,
  position   smallint not null check (position between 1 and 15),
  primary key (setlist_id, position), -- 자리(1~15개) 자체가 15곡 상한을 물리적으로 강제
  unique (setlist_id, song_id)        -- 같은 곡 중복 편성 방지
);

-- ----------------------------------------------------------------------------
-- venues — 06-venues-and-discovery.md §4 티어 리스킨: 길 위 → 스타디움
-- ----------------------------------------------------------------------------
create table venues (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  tier             text not null
                     check (tier in ('T0_STREET', 'T1_SPOT', 'T2_CLUB', 'T3_FESTIVAL', 'T4_STADIUM')),
  capacity         int not null check (capacity > 0),
  scene_asset_key  text, -- 클라이언트 3D 맵 애셋 식별자(예: 'guldari', 'rooftop')
  physics_profile  jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- concerts — 오프닝 게스트는 15곡 한도와 별도(01 §2-4)
-- ----------------------------------------------------------------------------
create table concerts (
  id                       uuid primary key default gen_random_uuid(),
  artist_id                uuid not null references artist_profiles(user_id) on delete cascade,
  setlist_id               uuid not null references setlists(id) on delete restrict,
  venue_id                 uuid not null references venues(id) on delete restrict,
  scheduled_at             timestamptz not null,
  status                   text not null default 'DRAFT'
                             check (status in ('DRAFT', 'FUNDED', 'LIVE', 'ENDED', 'CANCELLED')),
  funding_cost_sp          int not null default 0 check (funding_cost_sp >= 0),
  effects_timeline         jsonb not null default '[]'::jsonb, -- 연출 시퀀서 큐(조명/파이로/색전환 등)
  opening_guest_artist_id  uuid references artist_profiles(user_id),
  opening_guest_song_count smallint check (opening_guest_song_count between 1 and 3),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  check (opening_guest_artist_id is null or opening_guest_artist_id <> artist_id),
  check ((opening_guest_artist_id is null) = (opening_guest_song_count is null))
);

create trigger concerts_set_updated_at before update on concerts
  for each row execute function set_updated_at();

create index concerts_artist_scheduled_idx on concerts(artist_id, scheduled_at);
create index concerts_venue_idx on concerts(venue_id);

-- concert_stats — 실시간 리더보드용 롤업(Supabase Realtime 구독 대상)
create table concert_stats (
  concert_id     uuid primary key references concerts(id) on delete cascade,
  peak_ccu       int not null default 0,
  rating_count   int not null default 0,
  avg_stars      numeric(2,1),
  weighted_stars numeric, -- avg_stars × log10(1+Σ신뢰가중 관중) — 03 §1-2 시즌 점수 산식의 콘서트 단위 값
  encore_reached boolean not null default false,
  updated_at     timestamptz not null default now()
);

create trigger concert_stats_set_updated_at before update on concert_stats
  for each row execute function set_updated_at();

create or replace function create_concert_stats_row()
returns trigger as $$
begin
  insert into concert_stats(concert_id) values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger concerts_after_insert_stats after insert on concerts
  for each row execute function create_concert_stats_row();

-- ----------------------------------------------------------------------------
-- attendances — 별점 자격의 근거(01 §5, 04 §5: 관람 60%+ 실재해야 평가권)
-- ----------------------------------------------------------------------------
create table attendances (
  concert_id     uuid not null references concerts(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  joined_at      timestamptz not null default now(),
  left_at        timestamptz,
  shard_id       text, -- 인스턴스 샤딩 식별자(02 §5)
  presence_ratio numeric(3,2) check (presence_ratio is null or presence_ratio between 0 and 1),
  primary key (concert_id, user_id)
);

create index attendances_user_idx on attendances(user_id);

-- ----------------------------------------------------------------------------
-- ratings — UNIQUE(concert,user) + 참석(presence_ratio>=0.6) FK로 이중 방어
-- ----------------------------------------------------------------------------
create table ratings (
  id             uuid primary key default gen_random_uuid(),
  concert_id     uuid not null,
  user_id        uuid not null,
  stars          smallint not null check (stars between 1 and 5),
  best_moment_ts numeric, -- '베스트 순간' 태깅(01 §5) — 곡 재생 경과초
  created_at     timestamptz not null default now(),
  unique (concert_id, user_id),
  foreign key (concert_id, user_id) references attendances(concert_id, user_id) on delete cascade
);

-- 관람 60% 미만이면 참석 레코드는 있어도 평가 자격 없음 — FK만으로는 못 막아 트리거로 보강
create or replace function enforce_rating_requires_min_presence()
returns trigger as $$
declare
  v_ratio numeric(3,2);
begin
  select presence_ratio into v_ratio
    from attendances
    where concert_id = new.concert_id and user_id = new.user_id;

  if v_ratio is null or v_ratio < 0.6 then
    raise exception 'rating requires attendance presence_ratio >= 0.6 (got %)', v_ratio
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger ratings_require_presence before insert on ratings
  for each row execute function enforce_rating_requires_min_presence();

-- 별점 등록/취소 시 concert_stats 롤업 갱신(평균 별점 + 03 §1-2 가중 점수)
create or replace function refresh_concert_stats_on_rating()
returns trigger as $$
declare
  v_concert_id uuid := coalesce(new.concert_id, old.concert_id);
  v_count      int;
  v_avg        numeric;
  v_trust_sum  numeric;
begin
  select count(*), avg(r.stars)
    into v_count, v_avg
    from ratings r where r.concert_id = v_concert_id;

  select coalesce(sum(trust_weight(p.verified_ci, p.created_at, p.abuse_flag)), 0)
    into v_trust_sum
    from ratings r
    join profiles p on p.id = r.user_id
    where r.concert_id = v_concert_id;

  update concert_stats
     set rating_count   = v_count,
         avg_stars      = round(v_avg, 1),
         weighted_stars = case when v_count > 0 then round(v_avg * log(10, 1 + v_trust_sum), 4) else 0 end
   where concert_id = v_concert_id;

  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger ratings_after_change_refresh_stats
  after insert or delete on ratings
  for each row execute function refresh_concert_stats_on_rating();

-- ----------------------------------------------------------------------------
-- fan_registrations — "1호 팬" 메커니즘(01 §2-3), 아티스트별 연속 번호 자동 채번
-- ----------------------------------------------------------------------------
create table fan_registrations (
  id         uuid primary key default gen_random_uuid(),
  artist_id  uuid not null references artist_profiles(user_id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  fan_number int not null,
  created_at timestamptz not null default now(),
  unique (artist_id, user_id),
  unique (artist_id, fan_number)
);

-- 동시 가입 경합 시에도 번호가 겹치지 않도록 아티스트별 advisory lock으로 직렬화
create or replace function assign_fan_number()
returns trigger as $$
declare
  v_next int;
begin
  perform pg_advisory_xact_lock(hashtext(new.artist_id::text));
  select coalesce(max(fan_number), 0) + 1 into v_next
    from fan_registrations where artist_id = new.artist_id;
  new.fan_number := v_next;
  return new;
end;
$$ language plpgsql;

create trigger fan_registrations_assign_number before insert on fan_registrations
  for each row execute function assign_fan_number();

-- ----------------------------------------------------------------------------
-- sp_ledger — 무상 리워드(SP) append-only 원장. 04 §2: 현금화·양도·환전 경로 없음.
-- balance_after는 트리거가 서버 권위로 계산(클라이언트/앱이 값을 지어낼 수 없음),
-- 잔액이 음수가 되는 차감은 애초에 거부된다.
-- ----------------------------------------------------------------------------
create table sp_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  amount        int not null check (amount <> 0), -- 양수=적립, 음수=차감(대관료 등)
  balance_after int not null check (balance_after >= 0),
  reason        text not null check (reason in (
                   'VIEW_REWARD',        -- 관람 완료 20 SP
                   'RATING_REWARD',      -- 별점 평가 제출 10 SP
                   'MISSION',            -- 데일리/위클리/시즌 무료패스
                   'ARTIST_SHOW_REWARD', -- T0 아티스트 공연 보상(50+유효관중×5×별점계수)
                   'VENUE_FUNDING',      -- 공연장 대관+기본연출 차감(음수)
                   'PROMO_SPEND',        -- 홍보슬롯·앞좌석·응원배너 등 소비(음수)
                   'SEASON_DECAY'        -- 시즌말 이월 상한 초과분 소멸(음수)
                 )),
  ref_id        text, -- 관련 concert_id/song_id 등(느슨한 참조, 원장 자체 append-only 유지 위해 FK 미설정)
  created_at    timestamptz not null default now()
);

create index sp_ledger_user_created_idx on sp_ledger(user_id, created_at desc);

create or replace function sp_ledger_compute_balance()
returns trigger as $$
declare
  v_prev int;
begin
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));
  select balance_after into v_prev
    from sp_ledger
    where user_id = new.user_id
    order by created_at desc, id desc
    limit 1;
  new.balance_after := coalesce(v_prev, 0) + new.amount;
  return new;
end;
$$ language plpgsql;

create trigger sp_ledger_before_insert before insert on sp_ledger
  for each row execute function sp_ledger_compute_balance();

-- append-only 강제: UPDATE/DELETE를 코드 레벨에서 아예 차단(04 §2 "환전 금지" 설계의 근간)
create or replace function block_mutation()
returns trigger as $$
begin
  raise exception '% is append-only — % not allowed', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$ language plpgsql;

create trigger sp_ledger_block_update before update on sp_ledger
  for each row execute function block_mutation();
create trigger sp_ledger_block_delete before delete on sp_ledger
  for each row execute function block_mutation();

-- ----------------------------------------------------------------------------
-- payout_ledger — 현금 정산(T1 파트너). SP 원장과 물리적으로 분리(04 §2 완화안 ③).
-- net은 생성 컬럼이라 gross-fee-withholding 불일치가 구조적으로 불가능.
-- ----------------------------------------------------------------------------
create table payout_ledger (
  id          uuid primary key default gen_random_uuid(),
  artist_id   uuid not null references artist_profiles(user_id) on delete cascade,
  source      text not null check (source in ('SPONSOR_BOOST', 'MERCH', 'SEASON_PRIZE')),
  gross       numeric(12,2) not null check (gross >= 0),
  fee         numeric(12,2) not null default 0 check (fee >= 0),
  withholding numeric(12,2) not null default 0 check (withholding >= 0),
  net         numeric(12,2) generated always as (gross - fee - withholding) stored,
  period      text not null, -- 정산 대상 기간, 예: '2026-08'
  status      text not null default 'PENDING' check (status in ('PENDING', 'PAID')),
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);

create index payout_ledger_artist_period_idx on payout_ledger(artist_id, period);

-- ----------------------------------------------------------------------------
-- ranking_seasons / season_scores — 요구사항 7: 분기 어워드
-- ----------------------------------------------------------------------------
create table ranking_seasons (
  id         uuid primary key default gen_random_uuid(),
  quarter    text not null unique, -- 예: '2026-Q3'
  starts_at  timestamptz not null,
  ends_at    timestamptz not null check (ends_at > starts_at),
  status     text not null default 'UPCOMING' check (status in ('UPCOMING', 'ACTIVE', 'ENDED'))
);

create table season_scores (
  id             uuid primary key default gen_random_uuid(),
  season_id      uuid not null references ranking_seasons(id) on delete cascade,
  artist_id      uuid not null references artist_profiles(user_id) on delete cascade,
  weighted_score numeric not null default 0,
  rank           int,
  prize_tier     text,
  prize_paid     boolean not null default false,
  unique (season_id, artist_id)
);

create index season_scores_season_rank_idx on season_scores(season_id, rank);
