# 02. 개발 계획 — 기술 아키텍처와 로드맵

## 1. 결론 요약 (추천안)

- **1인 개발**: **웹 기반 — React Three Fiber + Rapier(물리) + Web Audio API + Colyseus(네트워킹)**. 기존 Next.js/React/Supabase 역량을 100% 재활용하고, 설치 없는 URL 초대(카카오톡 링크 하나로 관중 입장)가 콘서트 앱의 바이럴 특성과 궁합이 최고. 2026년 기준 WebGPU가 W3C 후보권고안 도달, 글로벌 브라우저 지원율 약 85%(iOS 26 Safari 포함)로 웹 3D의 성능 천장이 크게 올라간 시점.
- **3~5인 팀**: **Unity 6 + Photon Fusion(또는 Normcore) + Steam Audio/FMOD**. "실제 대규모 공연장의 공간감·사운드"(요구사항 6)를 끝까지 밀려면(HRTF 음향 레이트레이싱, 수백 명 군중, VR 확장) 네이티브 엔진이 결국 필요.
- **절충 전략(권장)**: MVP는 웹으로 3~4개월 내 출시해 "자작곡으로 공연을 열고 관중이 별점을 주는" 핵심 루프를 검증 → 리텐션 확인 후 Unity 클라이언트 병행. **계정·랭킹·리워드·곡 검수 백엔드는 처음부터 클라이언트 독립적으로(기존 Supabase 스택) 설계**해 엔진을 갈아타도 백엔드는 그대로 간다.

초기 성패는 그래픽 충실도가 아니라 "친구를 내 공연에 얼마나 쉽게 데려오느냐"다. 모바일 앱 설치 퍼널은 70~80%가 이탈하지만 웹은 링크 하나로 입장한다. Fortnite급 비주얼은 MVP에 필요 없다.

## 2. 엔진/플랫폼 비교

| 항목 | Unity 6 | Unreal 5.x | Three.js/R3F (웹) | Babylon.js (웹) | PlayCanvas (웹) |
|---|---|---|---|---|---|
| 물리엔진 | PhysX 내장, Havok 옵션 | Chaos 내장, 파괴·클로스 최상급 | 내장 없음 → **Rapier(WASM)** 권장 | **Havok WASM 공식 플러그인**(무료) | ammo.js |
| 공간 오디오 | Steam Audio·Meta XR·FMOD/Wwise 전부 지원 | 내장 컨볼루션 + Steam Audio | Web Audio `PannerNode`(HRTF) + `ConvolverNode` | 동일 | 동일 |
| 네트워킹 | Photon Fusion/Normcore 생태계 풍부 | 내장 리플리케이션 + Photon | Colyseus/LiveKit/WebSocket | 동일 | 동일 |
| 개발 난이도(현 스택 기준) | 중~상 (C# 신규 학습) | 상 (1인 비현실적) | **하** (React/TS 그대로) | 중 (React 통합 약함) | 중 |
| 크로스플랫폼 | 모바일/PC/콘솔/**VR 최강** | PC/콘솔 강점 | 브라우저 = 모든 기기 즉시, WebXR | 동일 | 동일 |
| 비용 | Personal 무료(연매출 20만$ 이하) | 매출 100만$ 초과분 5% | MIT 무료 | Apache 2.0 무료 | 에디터 유료 플랜 |
| 치명적 약점 | 웹 빌드가 무겁고 로딩 김 | 팀 규모 요구 | 대규모 군중+고급 음향의 성능 천장 | 한국 인력 풀 작음 | 동일 |

## 3. 공간 오디오 — "현장감의 80%는 그래픽이 아니라 오디오"

4개 레이어로 구현한다.

1. **음악 본체**: 3D 포지셔널 처리 금지. 실제 콘서트도 PA 스피커로 홀 전체에 균일하게 퍼지므로 **스테레오 2D + 위치별 EQ/리버브 프리셋**(스탠딩 앞줄=드라이·큼, 2층 뒤=하이컷+리버브 증가)이 정답. 전 곡 HRTF 패닝은 부자연스럽고 CPU 낭비.
2. **HRTF 3D(주변음만)**: 옆 관중 환호·응원봉·특수효과만 3D 처리. 웹은 `PannerNode {panningModel:'HRTF', distanceModel:'inverse'}` — 브라우저 내장이라 추가 비용 0. Unity는 Steam Audio(무료, 오클루전·리플렉션 레이트레이싱).
3. **리버브 존**: 구역(무대 앞/중앙/복도)별 임펄스 응답 차등 적용. 웹은 `ConvolverNode` + OpenAIR의 실제 콘서트홀 IR(무료). **복도에서 공연장으로 들어서는 순간 소리가 확 트이는 연출이 현장감의 킬러 디테일.**
4. **군중 사운드(핵심 차별점)**: **프로시저럴 크라우드 베드** — 환호/박수/떼창 루프를 강도별 5~10 레이어로 준비, 서버가 집계한 '군중 흥분도 파라미터'(이모트 빈도·실시간 별점·인원수)에 따라 크로스페이드. 내 주변 8~16명만 개별 3D 사운드 소스 부여 → '내 옆 사람' 실재감.
   - 실시간 음성이 필요해지면 **LiveKit**(오픈소스 SFU, Ship $50/월~) 1순위. Dolby.io Communications는 2024년 사업 재편으로 신규 채택 비추천.

## 4. 물리엔진 — 선택적 로컬 적용 원칙 (요구사항 6)

물리를 "다 켜는" 순간 모바일에서 죽는다. **물리는 클라이언트 로컬 연출로 한정하고, 네트워크로는 이벤트만 전송한다(서버 권위 물리는 쓰지 않는다).** 현장감 대비 비용 효율 순:

| 적용처 | 비용 | 효과 | 구현 |
|---|---|---|---|
| **응원봉/소품** | 낮음 | **최상** | 스윙 관성·탄성(스프링 조인트 1개), 리듬 판정. 관중 시야에 항상 보임. 던진 야광봉은 리지드바디+3초 디스폰 |
| **저음 반응 카메라·햅틱** | ~0 | 큼 | 킥드럼/베이스 대역 분석(`AnalyserNode`) → 카메라 미세 셰이크 + 모바일 진동. "서브우퍼 앞에 서 있는 느낌" |
| **클로스** | 중간 | 중 | 무대 배너·의상 자락. 저음 비트에 맞춰 흔들리면 '소리가 공간을 울린다'는 착각 |
| **파티클(컨페티·파이로)** | 중간 | 큼 | 물리엔진이 아닌 GPU 파티클로. 피날레 컨페티 장면 = 마케팅 소재 |
| **군중 아바타** | **최상(함정)** | — | 전원 리지드바디 절대 금지. 근거리 8~16명만 캡슐 충돌체, 나머지는 GPU 인스턴싱 + 버텍스 애니메이션 텍스처(VAT). 군중 웨이브는 사인파 오프셋 애니메이션 |

## 5. 실시간 네트워킹 — 동접 규모별 3단계

| 규모 | 아키텍처 | 구현 |
|---|---|---|
| ~30명 (MVP) | 단일 룸 전체 동기화 | 관중 위치 10Hz 스냅샷+보간, 이모트 이벤트 브로드캐스트 |
| 30~200명 (알파) | 단일 룸 + AOI | 주변 격자 셀만 고빈도 수신, 원거리는 1~2Hz/밀도맵 |
| 200~수천 (베타+) | **인스턴스 샤딩 + 팬텀 크라우드** | 150명 단위 룸 복제, 곡 타임라인·흥분도·별점만 전역 동기화. 타 샤드 관중은 원경 실루엣 렌더 — Travis Scott 콘서트(1,230만 명)도 인스턴스당 ~50명이었다 |

- 아티스트 상태 20~30Hz 서버 권위 동기화, 관중 10Hz 스냅샷, **별점·리워드는 게임 서버가 아닌 플랫폼 백엔드(Supabase)에 서버 권위로 기록.**
- 솔루션: 웹 = **Colyseus**(TS 스키마 상태동기화, 자가호스팅 $20~50/월) + LiveKit(라이브 음성 도입 시). Unity = **Photon Fusion**(100 CCU 무료, 200 CCU $95/년).
- MVP는 사전녹음 공연이므로 LiveKit 없이 "서버 타임스탬프 기준 HLS 동기 재생"으로 충분(오차 ±200ms는 체감 불가).

## 6. 음원 파이프라인 (요구사항 2)

```
업로드 → 트랜스코딩 → 자동 검수 → (플래그 시 인간 검수) → 공개 승인 → HLS 스트리밍
```

1. **업로드/트랜스코딩**: 클라이언트 → Supabase Storage 또는 Cloudflare R2(egress 무료) → 서버리스 FFmpeg 워커로 AAC/Opus 트랜스코딩, 라우드니스 정규화(-14 LUFS), HLS 세그먼트.
2. **저작권 자동 검수 — ACRCloud**: 1.5억+ 곡 핑거프린트 DB. (a) 원음 일치 = 즉시 반려, (b) 커버 감지(Cover Song Identification 별도 제공) = 인간 검수 큐, (c) AI Music Detector(2026.1 출시)로 Suno/Udio 생성 확률 점수 → 'AI 생성' 라벨 자동 부착. 소량 패키지(연 1만 요청 단위)로 초기 비용 낮음.
3. **검수 UX 경계선**: 업로드 즉시 '비공개 리허설' 가능, **공개 공연은 검수 통과 후**(수 분, 실패 시 사유 고지 + 이의신청 플로우 — 자작곡 오탐이 유저 이탈을 부르므로 반려가 아닌 '검수 대기' 큐 필수). 인적 검수·제작 증빙(Suno 프로젝트 링크/DAW 스크린샷)은 **랭킹 상위권·수상 후보에만** 요구 — 창작 허들과 어뷰징 방지를 분리.
4. **AI 곡 공급 정책** (2026.7 기준 확인):
   - **Suno**: 공식 공개 API 없음. 파트너 인테이크 폼만 오픈 — **지금 신청해 둘 것**. 비공식 API(sunoapi류)는 약관 위반·계정 밴·라이선스 불명 3중 리스크로 채택 불가. 상업 이용은 **Pro($10/월) 이상 구독 중 생성분만** 가능 → 업로드 허용 시 '유료 티어 생성' 자가 확인 절차 필수.
   - **Udio**: 2025.10 UMG 합의 후 다운로드 중단('월드가든' — 외부 반출 금지) → **퍼널에서 배제.**
   - **인앱 생성 대안 — Mubert API**: $199/월 5,000곡(곡당 ~$0.04), **API 플랜에 서브라이선싱 포함**으로 유저의 상업 이용까지 커버. 단 보컬 없는 인스트루멘털 한정 → 베타에서 "인앱 비트 스튜디오 + 브라우저 보컬 녹음(getUserMedia) 오버더빙" 조합이 현실적 상한선. 창작 허들을 "작곡할 줄 아는 사람"에서 "노래방 갈 줄 아는 사람"으로 낮추는 것이 관중→아티스트 서사의 실질 병목 해소.
5. **온보딩 데모곡**: 프리랜서 커미션 5곡(트랙당 30~80만원, 매절 계약 명시) + Mubert 생성 30곡(사실상 무료) = 초기 예산 200~400만원. Artlist/Epidemic 구독은 앱 내 재배포 미커버라 비권장.
6. **라이브 vs 사전녹음**: MVP는 **사전녹음 + 타임라인 스크립팅**("1:32에 파이로, 2:50에 컨페티" 예약) — 서버는 재생 커서만 방송, 비용·복잡도 1/10. 진짜 라이브(마이크)는 베타 이후 LiveKit WebRTC.

## 7. 백엔드 — 기존 스택 재활용 구조

**원칙: '플랫폼 백엔드'와 '실시간 게임 서버'를 분리.** 기존 Next.js+Supabase+Prisma+Vercel을 플랫폼 백엔드로 승격.

- **플랫폼 백엔드(기존 스택)**: 계정(Supabase Auth), 아티스트 프로필, 곡 업로드·검수 상태머신, 콘서트 개설/예매, 별점, 리워드 원장, 시즌 랭킹, 결제(토스페이먼츠/스토어 IAP 웹훅). 랭킹 집계는 pg_cron + Edge Function 배치, 실시간 리더보드는 Supabase Realtime.
- **게임 서버(신규, 분리)**: Colyseus(웹)/Photon(Unity). 위치·이모트·군중 흥분도 등 휘발성 상태만. **입장 시 Supabase Auth JWT를 게임 서버가 JWKS로 검증**해 계정 일원화. 공연 종료 시 참석 증명(입장~퇴장 로그)을 플랫폼 API로 전송 → 이 증명이 있어야 별점/리워드 가능.
- **원장은 2개로 분리**(법률 검토 반영):
  1. **SP 원장**: append-only 이중기입. 관람 리워드 적립·대관료 차감·시즌 감가가 전부 이 원장을 지나감 — 폐쇄 루프·어뷰징 감사용.
  2. **현금 정산 원장**: T1 파트너 아티스트의 후원·굿즈 수익 배분(사업소득 3.3% 원천징수 포함). SP 원장과 절대 섞지 않음 — 게임산업법 환전 금지·전금법·세무 의무를 동시에 처리하기 위한 구조([04-리스크](./04-risk-analysis.md) 참조).

## 8. 데이터 모델 초안 (ERD 스케치)

> 실제 구현은 `prototype/guldari/db/001_init_schema.sql`(3-렌즈 어드버서리 리뷰 반영, 새 Supabase
> 프로젝트에 적용됨). 아래 스케치는 최종 스키마에 맞춰 갱신했다 — email은 Supabase
> `auth.users`에 위임(profiles가 1:1 확장), trust_score는 저장 컬럼이 아니라
> `trust_weight(verified_ci, created_at, abuse_flag)` 파생 함수로 매 시점 계산한다.

```
User (id, nickname, avatar_config, created_at, verified_ci, abuse_flag, deleted_at)
 ├─ ArtistProfile (user_id FK, stage_name, bio, popularity_score, tier)
 ├─ Song (id, artist_id FK, title, duration, audio_url, hls_url,
 │        source_type: 'ORIGINAL'|'AI_GENERATED',
 │        review_status: 'PENDING'|'FINGERPRINT_FLAGGED'|'APPROVED'|'REJECTED',
 │        acr_result_json, ai_probability)
 ├─ Setlist (id, artist_id FK)
 │   └─ SetlistItem (setlist_id, song_id, position)   -- PK(setlist_id,position)이 15곡 상한을 물리적으로 강제
 ├─ Venue (id, name, capacity, scene_asset_key, physics_profile, tier)
 ├─ Concert (id, artist_id, setlist_id, venue_id, scheduled_at,
 │           status: 'DRAFT'|'FUNDED'|'LIVE'|'ENDED'|'CANCELLED',
 │           funding_cost_sp, effects_timeline_json, opening_guest_artist_id, opening_guest_song_count)
 │           -- LIVE 전이 시 셋리스트 전 곡 APPROVED 여부를 트리거로 재확인
 │   ├─ Attendance (concert_id, user_id, joined_at, left_at, shard_id, presence_ratio)
 │   ├─ Rating (concert_id, user_id, segment: 'MAIN'|'OPENING', stars 1-5, best_moment_ts, created_at)
 │   │     -- UNIQUE(concert_id, user_id, segment), Attendance(presence_ratio >= 0.6) 필수(트리거)
 │   │     -- segment='OPENING'은 오프닝 게스트 무대 평가(01 §2-4의 1.5배 가중 집계용)
 │   └─ ConcertStats (concert_id, peak_ccu, avg_stars, weighted_stars, encore_reached, encore_reached_at)
 ├─ FanRegistration (artist_id, user_id, fan_number, created_at)   -- 1호 팬, advisory lock으로 채번 직렬화
 ├─ SpLedger (id, seq, user_id, amount, balance_after,
 │        reason: 'VIEW_REWARD'|'RATING_REWARD'|'MISSION'|'ARTIST_SHOW_REWARD'|'VENUE_FUNDING'|'PROMO_SPEND'|'SEASON_DECAY',
 │        ref_id, created_at)  -- append-only(UPDATE/DELETE 트리거 차단), balance_after는 seq 기준 서버 계산
 │        -- VIEW_REWARD=20·RATING_REWARD=10 고정값 CHECK로 못박아 "별점 값과 무관"을 스키마가 보증
 ├─ PayoutLedger (id, artist_id, gross, fee, withholding, net, source, period)  -- 현금 정산 분리, net은 생성 컬럼
 └─ RankingSeason (id, quarter, starts_at, ends_at, status)
      └─ SeasonScore (season_id, artist_id, weighted_score, rank, prize_paid)
```

시즌 점수: `weighted_score = 평균별점 × log₁₀(1 + Σ 신뢰점수tᵢ) × 신뢰가중` — 관중 수를 로그로 눌러 소수 열성팬 아티스트도 경쟁 가능(요구사항 3·5·7 밸런스). 품앗이 관중은 t=0으로 산입 자체가 0.

## 9. 단계별 로드맵

### MVP (3~4개월) — "빼는 것"이 설계다
**맵(총 제작 예산 ~2주)**: "한국 골목 프랍 키트" ~30종(4~5일, 전 맵 재활용) + **굴다리(T0 무료, 2~3일 — 브랜드 그 자체이자 ConvolverNode 터널 리버브 데모)** + **옥상 루프탑(T1 800 SP·50석 — 유료 티어가 1개는 있어야 SP 경제 루프를 검증)** + 여유 시 놀이터(그네 힌지 물리·낮 무드). 대형 공연장 에셋은 만들지 않는다. 상세 근거는 [06 §7](./06-venues-and-discovery.md).
**포함**: 사전녹음 업로드 + ACRCloud 자동검수 + 수동 승인, 셋리스트(15곡 제한), 동접 30명 룸, 아바타 + 이모트 6종 + 응원봉·폰 플래시(스프링 물리) + 동전 던지기(물리 코인), 맵별 리버브 IR + 군중 사운드 3레이어 + 앰비언트 레이어(기차 럼블 등), 앉기 시스템, 아티스트 텍스트 멘트·연출 트리거·자동 립싱크, 별점 + SP 원장, 주간 리더보드, 세로 클립 자동 생성(근접 직캠 템플릿), 발견 기능 5종(랜덤 문·큐레이션·신인 쿼터·웰컴 크루·잠자는 곡 구제 퍼널), 온보딩 '첫 산책'.
**제외**: VR, 라이브 마이크, 커스텀 공연장, 현금 결제, 분기 시즌(주간으로 대체), 네이티브 앱(모바일 웹), 군중 물리, T2 이상 대형 맵.
- 1인: 4개월, 인프라 월 $100~200(Supabase Pro + Vercel Pro + Fly.io 게임서버 + R2 + ACRCloud 소량) ≈ 현금 60~100만원 + 본인 인건비
- 3~5인(개발2·3D/테크아트1·기획PM1): 2~2.5개월, 약 4,000~8,000만원

### 알파 (2~3개월) — 비공개 테스트, 시드 아티스트 30팀
맵 추가: 놀이터(미포함 시)·편의점 앞(T0), 한강 돗자리(T1 — 클립 생산성 최고) + 행인 NPC 시스템 + 산책 허브(편성제). 동접 100~200(AOI), 응원봉 리듬 판정, 연출 타임라인 에디터 고도화, 흥분도 기반 군중 사운드, 골목 라디오(클립 피드), 시즌 랭킹 정식화, 어뷰징 방어(참석 검증·리워드 상한·클러스터 탐지), 음성 멘트 + 라이트 QTE. 인프라 월 $200~400.

### 베타 (3개월) — 공개, 수익화 시동
맵 추가: **클럽 스테이지(T2, 300석 — 유효관중 100+ 아티스트가 나오는 시점에 오픈, 수익화와 동시 가동)**, 지하보도(T0), 골목 계단참 또는 노천극장(T1). 인스턴스 샤딩 + 팬텀 크라우드, 모바일 최적화(웹 유지 또는 Capacitor 래핑 — IAP 시 스토어 수수료 15~30% 감안), 크리스탈 결제(토스페이먼츠 — 응원 부스트·골목 소품·그래피티 커스텀 중심), 굿즈·팬클럽 멤버십, 인앱 비트 스튜디오(Mubert) + 보컬 녹음, 라이브 마이크 공연(LiveKit), Unity 클라이언트 착수 여부 결정 게이트. 팀 4~5인 필수 구간: 분기 인건비 약 1~1.5억원 + 인프라 월 $500~1,000.

### 정식 (베타 후 2개월~)
맵 추가: **페스티벌 메인스테이지(T3 — 압도감 문법 해금: 대형 조명 리그·컨페티·팬텀 크라우드)**, 스타디움(어워드 전용). 첫 분기 어워드 시즌(요구사항 7), 아티스트 현금 정산 체계(T1 파트너), 표정 캡처 opt-in, VR(WebXR/Quest), 글로벌 리전(도쿄 게임서버 — 일본 파일럿).

**총계**: 1인 → 정식까지 약 12개월 + 현금 500~1,000만원(인건비 제외) / 3~5인 팀 → 8~9개월 + 3~5억원.

## 10. 최대 기술 리스크 3가지

1. **동접 착시**: 초기엔 공연당 관중 5명일 확률이 높다 — 스케일링보다 "5명이어도 꽉 차 보이는" 봇 관중 + 팬텀 크라우드가 먼저다.
2. **저작권 오탐**: 유사 진행 자작곡 오탐이 유저 이탈을 부른다 — 반려가 아닌 '검수 대기' 큐 + 이의신청 플로우 필수.
3. **모바일 웹 성능**: 중저가 안드로이드에서 관중 200명 렌더 시 발열·프레임 저하 — VAT 인스턴싱, 드로우콜 100 이하, 30fps 타깃을 MVP부터 성능 예산으로 못 박을 것.

---

### 참고 소스
- [Photon 100 CCU 무료](https://blog.photonengine.com/new-free-100-ccu-for-photon-fusion-and-quantum-games/) · [Photon Fusion Pricing](https://www.photonengine.com/fusion/pricing)
- [WebGPU 브라우저 지원 현황](https://github.com/gpuweb/gpuweb/wiki/Implementation-Status) · [iOS 26 Safari WebGPU](https://appdevelopermagazine.com/webgpu-in-ios-26/)
- [ACRCloud AI Music Detector](https://www.acrcloud.com/blog/introducing-ai-music-detector-to-identify-ai-generated-music/) · [ACRCloud 커버 인식](https://docs.acrcloud.com/get-started/tutorials/recognize-music)
- [LiveKit Pricing](https://livekit.com/pricing)
- [Suno 개발자 API 탐색 — MBW](https://www.musicbusinessworldwide.com/suno-explores-developer-api-seeking-apps-that-unlock-experiences-generative-music-makes-possible-for-the-first-time/) · [Suno 상업권 — Terms.Law](https://terms.law/ai-output-rights/suno/)
- [Udio 월드가든 — Chartlex](https://www.chartlex.com/blog/business/udio-umg-walled-garden-explained-2026)
- [Mubert API 서브라이선싱](https://mubert.com/blog/mubert-api-sublicensing-the-hidden-truth-every-developer-must-know)
