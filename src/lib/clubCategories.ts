/**
 * 동아리 카테고리 — "대학/청년 동아리형"
 * 생성 폼, 목록 필터, 서버 검증, AI 매칭이 모두 이 단일 출처를 공유합니다.
 */
export const CLUB_CATEGORIES = [
  "신앙",
  "스터디",
  "취미/여가",
  "운동",
  "봉사",
  "창업/사이드프로젝트",
  "문화/예술",
  "친목",
] as const;

export type ClubCategory = (typeof CLUB_CATEGORIES)[number];

// 교회 청년부 앱 — 술/담배/성적 암시 등 기독교 교리상 논란이 될 수 있는 이모지는 쓰지 않는다.
// (예: 친목 카테고리는 🍻 대신 🧑‍🤝‍🧑)
//
// gradient: 사진 미등록 동아리의 기본 커버(목록 카드/상세 히어로 공용, 밝은 파스텔 — 그 위에 컬러 아이콘).
// cover:    홈 대문 캐러셀의 사진 미등록 폴백 커버(풀블리드·어두운 딥 그라데이션 — 그 위에 흰 글씨 오버레이).
//           밝은 gradient는 흰 글씨 대비가 안 나오므로 캐러셀 전용 딥 버전을 따로 둔다.
// accent:   활성 슬라이드가 배경으로 번지는 앰비언트 글로우 색(한 색).
// 브랜드 팔레트가 하늘·골드·민트 3색뿐이라 새 색상을 늘리지 않고, 세 계열의 딥 셰이드 조합만 카테고리별로 달리한다.
export const CLUB_CATEGORY_META: Record<
  string,
  { emoji: string; gradient: string; cover: string; accent: string }
> = {
  신앙: {
    emoji: "✝️",
    gradient: "from-skyx/40 to-gold/15",
    cover: "linear-gradient(158deg,#14273F 0%,#2E6E9E 56%,#7FBDE4 100%)",
    accent: "#4A90C2",
  },
  스터디: {
    emoji: "📚",
    gradient: "from-skyx-deep/30 to-teal/20",
    cover: "linear-gradient(158deg,#142A38 0%,#2E6E9E 50%,#3FB4C4 100%)",
    accent: "#2E6E9E",
  },
  "취미/여가": {
    emoji: "🎮",
    gradient: "from-gold/30 to-teal/25",
    cover: "linear-gradient(158deg,#332512 0%,#B9821A 52%,#3FBFB0 100%)",
    accent: "#D99B0B",
  },
  운동: {
    emoji: "🏃",
    gradient: "from-teal-deep/30 to-skyx/25",
    cover: "linear-gradient(158deg,#0F2F2C 0%,#1A9D8F 54%,#7FBDE4 100%)",
    accent: "#1A9D8F",
  },
  봉사: {
    emoji: "🤝",
    gradient: "from-gold-deep/30 to-skyx/20",
    cover: "linear-gradient(158deg,#2C2308 0%,#A6780B 50%,#4A90C2 100%)",
    accent: "#D99B0B",
  },
  "창업/사이드프로젝트": {
    emoji: "🚀",
    gradient: "from-skyx-deep/35 to-teal-deep/25",
    cover: "linear-gradient(158deg,#13233A 0%,#2E6E9E 48%,#1A9D8F 100%)",
    accent: "#2E6E9E",
  },
  "문화/예술": {
    emoji: "🎨",
    gradient: "from-gold/20 via-teal/15 to-skyx/30",
    cover: "linear-gradient(158deg,#2C2712 0%,#8A6A1A 44%,#2E6E9E 100%)",
    accent: "#F0B429",
  },
  친목: {
    emoji: "🧑‍🤝‍🧑",
    gradient: "from-teal/25 to-gold/35",
    cover: "linear-gradient(158deg,#123330 0%,#1A9D8F 48%,#C9962E 100%)",
    accent: "#35C3B4",
  },
};

// 카테고리 미지정(구/이상 데이터)용 캐러셀 폴백.
export const CLUB_COVER_FALLBACK = {
  cover: "linear-gradient(158deg,#14273F 0%,#2E6E9E 55%,#7FBDE4 100%)",
  accent: "#4A90C2",
};

export function isClubCategory(value: string): value is ClubCategory {
  return (CLUB_CATEGORIES as readonly string[]).includes(value);
}
