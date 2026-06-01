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

export const CLUB_CATEGORY_META: Record<string, { emoji: string }> = {
  신앙: { emoji: "✝️" },
  스터디: { emoji: "📚" },
  "취미/여가": { emoji: "🎮" },
  운동: { emoji: "🏃" },
  봉사: { emoji: "🤝" },
  "창업/사이드프로젝트": { emoji: "🚀" },
  "문화/예술": { emoji: "🎨" },
  친목: { emoji: "🍻" },
};

export function isClubCategory(value: string): value is ClubCategory {
  return (CLUB_CATEGORIES as readonly string[]).includes(value);
}
