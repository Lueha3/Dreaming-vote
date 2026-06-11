# "꿈꾸는 하늘" 디자인 시스템 — 변환 가이드

다크 테마(검정 + 보라/파랑)를 **하늘 글래스 라이트 테마**(꿈꾸는교회 로고 팔레트 × Suno 글래스 감성)로 변환할 때 따르는 규칙.

## 0. 절대 규칙

- **로직·상태·API 호출·라우팅은 절대 변경하지 않는다.** 시각(className, 인라인 스타일)과 문구만 바꾼다.
- 용어 규칙: "성향 카드" 사용. 금지어: "비즈니스 페르소나", "리포트", "프롬프트", "유저", "노출", "반려".
- 페이지별 `AmbientGlow` 류 로컬 배경 컴포넌트는 **삭제**한다 (전역 `SkyBackdrop`이 layout.tsx에 있음).
- 페이지 래퍼의 `bg-[#0a0a0a] text-white` 류는 제거 (body가 하늘 그라데이션 + 잉크 텍스트).

## 1. 사용 가능한 토큰 (Tailwind 클래스)

globals.css `@theme`에 정의됨 — `text-ink`, `bg-gold`, `border-teal/30`, `from-gold`, `to-teal` 등으로 사용:

| 토큰 | 값 | 용도 |
|---|---|---|
| `ink` | #3A4149 | 제목·본문 강조 텍스트 |
| `ink-soft` | #5E6973 | 본문 텍스트 |
| `ink-faint` | #8A95A1 | 보조·캡션 텍스트 |
| `gold` / `gold-deep` | #F0B429 / #D99B0B | 골드 포인트·그라데이션 |
| `gold-ink` | #A6780B | 라이트 배경 위 골드 "텍스트" (가독성용) |
| `teal` / `teal-deep` | #35C3B4 / #1A9D8F | 민트 포인트 |
| `teal-ink` | #15837A | 라이트 배경 위 민트 "텍스트" |
| `skyx` / `skyx-deep` / `skyx-ink` | #7FBDE4 / #4A90C2 / #2E6E9E | 하늘 포인트 / 링크·네비 텍스트 |
| `sky-line` | rgba(122,150,176,.35) | 라이트 배경 위 은은한 구분선 |

## 2. CSS 헬퍼 클래스 (globals.css에 정의됨)

- `.glass-card` — frosted glass 카드 (bg white .78 + blur 22 + 흰 보더 + 하늘 그림자 + radius 24px). **카드 삼총사 대체용.**
- `.glass-soft` — 가벼운 글래스 (칩/배지/보조 버튼 서피스)
- `.glass-ribbon` — 카드 상단 골드→틸 4px 빛띠 (`relative overflow-hidden`과 함께; 핵심 카드 1~2곳만)
- `.btn-gold` — 골드→틸 그라데이션 주 CTA (텍스트색 #3A2A02 자동 포함, hover lift 포함)
- `.gradient-text` — 골드→틸 그라데이션 텍스트 (구 보라→파랑 대체, 이미 재정의됨)
- `.card-glow` / `.btn-glow` — 이미 골드/하늘 글로우로 재정의됨 (클래스명 그대로 두면 됨)

## 3. 클래스 매핑 테이블

| 기존 (다크) | 변환 (하늘 글래스) |
|---|---|
| `bg-[#0a0a0a]`, `bg-[#09090b]`, `bg-black` (페이지 래퍼) | 제거 |
| `text-white` (페이지 래퍼/제목) | `text-ink` |
| `rounded-2xl border border-white/[0.07] bg-[#111111]` (카드) | `glass-card` (rounded-2xl, border, bg 모두 제거) |
| `bg-[#1a1a1a]`, `bg-[#111111]` (단독) | `bg-white/70` 또는 `glass-soft` |
| `text-zinc-200`, `text-zinc-300` | `text-ink` |
| `text-zinc-400`, `text-zinc-500` | `text-ink-soft` |
| `text-zinc-600`, `text-zinc-700` | `text-ink-faint` |
| `border-white/[0.05~0.1]` (구분선) | `border-sky-line` |
| `bg-white/[0.04~0.05] border-white/[0.07]` (보조 버튼/칩) | `glass-soft text-ink-soft hover:bg-white/90 hover:text-ink` |
| `bg-gradient-to-r from-violet-600 to-blue-600 text-white` (주 CTA) | `btn-gold` (text 색 클래스 제거) |
| `from-violet-300 to-blue-300 bg-clip-text` (그라데이션 텍스트) | `gradient-text` (from/to/bg-clip 제거) |
| `from-violet-400 to-blue-400 bg-clip-text` | `gradient-text` |
| `border-violet-500/20 bg-violet-500/10 text-violet-400` (칩) | `border-gold/35 bg-gold/10 text-gold-ink` |
| `text-violet-300/400`, `hover:text-violet-300` (링크) | `text-teal-ink`, `hover:text-teal-deep` |
| `bg-violet-500/20`, `ring-violet-500/20` | `bg-skyx/25`, `ring-skyx/30` |
| `hover:border-violet-500/30 hover:bg-violet-500/[0.07]` | `hover:border-teal/40 hover:bg-teal/[0.07]` |
| `border-emerald-500/25 bg-emerald-500/10 text-emerald-400` (공개/성공) | `border-teal/35 bg-teal/10 text-teal-ink` |
| `bg-emerald-400` (점) | `bg-teal` |
| `border-amber-500/30 bg-amber-500/[0.08] text-amber-300/400` (경고) | `border-gold/40 bg-gold/10 text-gold-ink` |
| `text-red-400 bg-red-500/10 border-red-500/20` (에러) | `text-red-500 bg-red-500/[0.08] border-red-300/60` |
| 입력 필드 `bg-white/5 border-white/10 text-white placeholder-zinc-600` | `bg-white/70 border border-white/95 text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none` |
| 스켈레톤 `bg-white/5` | `bg-white/55` |
| 모달 오버레이 `bg-black/60~70` | `bg-[#2E6E9E]/25 backdrop-blur-sm` |
| 모달 패널 `bg-[#111]~[#1a1a1a] border-white/10` | `glass-card` + `style={{background:"rgba(255,255,255,.92)"}}` |
| `shadow-2xl shadow-black/50` | `shadow-[0_24px_60px_-18px_rgba(74,144,194,.35)]` |
| `bg-zinc-800/900` 류 | `bg-white/60` |

색은 위 표에 없는 경우에도 원칙 유지: **어두운 서피스 → 흰 글래스, 밝은 텍스트 → 잉크, 보라/파랑 포인트 → 골드/민트/하늘.**

## 4. 문구 톤

승인된 메인 페이지 톤: 따뜻하고 가벼운 청년부 말투. 예시:
- "꿈꾸는교회 청년부 · 동아리 뭐 들지!?"
- "나에게 꼭 맞는 동아리를 찾아보세요"
- "신중하게 선택해주세요!!"
- "ChatGPT 등 AI를 쓰고 있다면 — 나도 몰랐던 '나'에 대해 알아볼까요?"

뻣뻣하거나 기계적인 문구만 이 톤으로 다듬는다. **문구 길이는 비슷하게 유지**(레이아웃 깨짐 방지). 기능 설명이 바뀌면 안 된다. 확신 없으면 그대로 둔다.

## 5. 검증

- 변환 후 해당 파일에 `#0a0a0a`, `#111111`, `zinc-`, `violet-`, `emerald-`, `text-white`, `bg-black` 이 남아있으면 안 된다 (grep으로 자가 확인).
- import 추가/삭제 정합성 확인 (예: AmbientGlow 삭제 시 사용처도 모두 제거).
- 빌드는 돌리지 마라 (메인 세션에서 일괄 실행).
