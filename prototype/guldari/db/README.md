# 굴다리(Guldari) DB 스키마 — Supabase

`docs/metaverse-concert/02-development-plan.md` §8(ERD)·`03-economy-design.md`(SP 경제)·
`04-risk-analysis.md`(원장 분리)·`06-venues-and-discovery.md`(티어)를 실제 스키마로 구현했다.

## 어느 프로젝트에 있는가

기존 레포가 쓰는 Supabase 프로젝트(**Blue-Humanity** — 청년부 커뮤니티 앱, 실사용자 데이터 있는 라이브 프로덕션)와
완전히 분리된 **새 전용 프로젝트**에 만들었다.

| | |
|---|---|
| 프로젝트명 | `guldari` |
| Project ID | `drwrrabpcfixpvzwmlii` |
| 리전 | `ap-northeast-2` (서울) |
| URL | `https://drwrrabpcfixpvzwmlii.supabase.co` |
| 요금제 | 무료 티어 ($0/월) |

**무료 티어는 조직당 활성 프로젝트 2개 한도**라 이 프로젝트를 만들기 위해 기존 **Blueharmony**(사용량 0에
가까운 별개 프로젝트)를 일시 정지(pause)해 자리를 확보했다. 필요하면 Supabase 대시보드에서 재개(resume)할 수 있다.

## 마이그레이션

| 파일 | 내용 |
|---|---|
| `001_init_schema.sql` | 15개 테이블 + 트리거 + RLS. 3-렌즈 어드버서리 리뷰(ERD 정합성/경제 규칙/SQL 정확성 — 3개 독립 에이전트) 통과 후 적용 |
| `002_hardening.sql` | Supabase security/performance advisor 결과 반영(함수 `search_path` 고정, FK 커버링 인덱스 6개) |
| `database.types.ts` | `generate_typescript_types`로 생성한 타입(수정 시 재생성할 것) |

두 파일 모두 Supabase MCP `apply_migration`으로 실제 DB에 적용 완료됐고, 적용 후 `get_advisors`로
재검증해 남은 항목이 의도된 것(`rls_enabled_no_policy`, INFO — 아래 참조)뿐임을 확인했다.

## 핵심 설계 결정

- **계정은 Supabase Auth 위임**: `profiles.id`가 `auth.users(id)`를 참조하는 1:1 확장 테이블. `email`은
  저장하지 않는다.
- **핵심 불변식은 앱 버그와 무관하게 DB가 보증**한다(트리거로 이중 방어):
  - 셋리스트 15곡 상한 — `setlist_items` PK가 `(setlist_id, position)`이고 `position`이 1~15로 제한돼
    물리적으로 16번째 자리가 없다.
  - 별점은 관람 60%+ 없이는 불가 — `ratings`가 `attendances(concert_id, user_id)`를 참조하는 복합 FK +
    `presence_ratio >= 0.6`을 확인하는 트리거.
  - 공개 공연(`concerts.status = 'LIVE'`)은 셋리스트 전 곡이 `APPROVED`여야 전이 가능(트리거).
  - **SP 원장은 append-only** — `UPDATE`/`DELETE` 자체가 트리거로 거부된다. `balance_after`는
    클라이언트가 아니라 서버(트리거)가 계산하고, 음수가 되는 차감은 거부된다.
  - `VIEW_REWARD`는 20 SP, `RATING_REWARD`는 10 SP로 CHECK 제약이 못박혀 있다 — "별점 값과 무관하게
    리워드 지급"(게임산업법 §28 사행성 회피 근거)이 스키마 레벨에서 보증된다.
  - 팬 넘버("1호 팬")는 아티스트별로 advisory lock을 걸어 동시 가입 경합에도 중복 없이 순차 채번.
- **SP(무상 리워드)와 현금 정산은 물리적으로 분리된 테이블**(`sp_ledger` vs `payout_ledger`) — 둘을
  잇는 FK·뷰·트리거가 전혀 없어 "환전 경로 없음"이 스키마 구조로 보증된다.
- **RLS 전 테이블 활성화 + 정책 0개** — 기존 레포(`prisma/rls.sql`, Blue-Humanity)와 동일한 관례.
  anon/authenticated의 PostgREST 직접 접근을 전면 차단하고, 서비스는 서버 사이드 소유자 연결로만
  접근한다. `get_advisors`가 보고하는 `rls_enabled_no_policy`(INFO)는 이 설계를 그대로 반영한 것이라
  정상이다 — 정책을 만들지 "않는 것"이 의도.

## 검증 방법과 결과

적용 직후 `execute_sql`로 13개 시나리오를 실행하고 **전부 PASS**를 확인했다(전체를 하나의 트랜잭션으로
묶어 마지막에 의도적으로 예외를 던져 자동 롤백 — 테스트 흔적이 DB에 전혀 남지 않는다):

```
A  15곡 정상 편성 / 16번째 곡 삽입 거부
B  검수 미통과 곡 있으면 LIVE 전이 거부 / 전곡 승인 후 LIVE 전이 성공
C  관람 60% 미만 별점 거부 / 60%+ 별점 성공 + concert_stats 실시간 반영
D  오프닝 게스트 없는 콘서트에 OPENING 세그먼트 평가 거부
E  VIEW_REWARD 15 SP(잘못된 금액) 거부
F  같은 트랜잭션에서 5건 연속 SP 지급 → balance_after 체인 정확히 계산
   (이게 바로 어드버서리 리뷰가 잡아낸 blocker: created_at 정렬은 같은 트랜잭션 내
   동시 insert에서 값이 동일해 순서를 못 가리는데, seq(bigint identity) 컬럼으로 해결)
G  SP 잔액이 음수가 되는 차감 거부
H  SP 원장 UPDATE/DELETE 모두 거부(append-only)
I  팬 넘버 자동 채번 1, 2, 3 순차 확인
```

재현하려면(읽기 전용 확인 후 반드시 롤백되도록 설계돼 있어 안전):

```sql
-- Supabase SQL Editor 또는 MCP execute_sql로 실행
-- prototype/guldari/db/ 의 001, 002 적용 후:
-- (테스트 스크립트 원본은 이 세션의 대화 로그 참조 — 별도 파일로는 보관하지 않음)
```

## 연결 정보 / 앱에서 쓰려면

```bash
NEXT_PUBLIC_SUPABASE_URL=https://drwrrabpcfixpvzwmlii.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<Supabase 대시보드 → Settings → API에서 확인>
DATABASE_URL=postgresql://postgres.drwrrabpcfixpvzwmlii:[DB_PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[DB_PASSWORD]@db.drwrrabpcfixpvzwmlii.supabase.co:5432/postgres
```

`[DB_PASSWORD]`는 프로젝트 생성 시 Supabase가 발급한 값으로, 보안상 이 레포/문서에는 남기지 않는다 —
Supabase 대시보드(Settings → Database)에서 재설정해 받아야 한다. anon key도 같은 대시보드 API 탭에서
확인한다(둘 다 커밋해도 되는 공개 가능 값이지만, 이 문서에는 URL만 남기고 실제 값은 `.env.local`에만 둘 것).

Prisma로 연결하려면 이 프로젝트 전용 `schema.prisma`가 별도로 필요하다(기존 루트 `prisma/schema.prisma`는
Blue-Humanity 전용이라 건드리지 않았다) — 아직 작성하지 않음, 다음 단계에서 실제 API 라우트를 붙일 때 추가한다.
