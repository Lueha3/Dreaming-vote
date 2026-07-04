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
// gradient: 사진 미등록 동아리의 기본 커버(카드/히어로 공용). 브랜드 팔레트가 하늘·골드·민트
// 3색뿐이라 새 색상을 늘리지 않고, 이 3색의 조합·비중만 카테고리별로 달리해 구분한다.
export const CLUB_CATEGORY_META: Record<string, { emoji: string; gradient: string }> = {
  신앙: { emoji: "✝️", gradient: "from-skyx/40 to-gold/15" },
  스터디: { emoji: "📚", gradient: "from-skyx-deep/30 to-teal/20" },
  "취미/여가": { emoji: "🎮", gradient: "from-gold/30 to-teal/25" },
  운동: { emoji: "🏃", gradient: "from-teal-deep/30 to-skyx/25" },
  봉사: { emoji: "🤝", gradient: "from-gold-deep/30 to-skyx/20" },
  "창업/사이드프로젝트": { emoji: "🚀", gradient: "from-skyx-deep/35 to-teal-deep/25" },
  "문화/예술": { emoji: "🎨", gradient: "from-gold/20 via-teal/15 to-skyx/30" },
  친목: { emoji: "🧑‍🤝‍🧑", gradient: "from-teal/25 to-gold/35" },
};

export function isClubCategory(value: string): value is ClubCategory {
  return (CLUB_CATEGORIES as readonly string[]).includes(value);
}
