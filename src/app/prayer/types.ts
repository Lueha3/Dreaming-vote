import type { Role } from "@/lib/roles";

export const CATEGORIES = ["일상", "기도해주세요", "동아리광고"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_META: Record<Category, { emoji: string; placeholder: string; empty: string }> = {
  일상: {
    emoji: "☀️",
    placeholder: "오늘의 일상을 나눠보세요...",
    empty: "아직 나눈 일상이 없어요. 첫 이야기를 들려주세요.",
  },
  기도해주세요: {
    emoji: "🙏",
    placeholder: "함께 기도할 기도제목을 나눠주세요...",
    empty: "아직 나눈 기도제목이 없어요. 첫 기도제목을 올려보세요.",
  },
  동아리광고: {
    emoji: "📣",
    placeholder: "동아리를 소개하고 함께할 친구를 찾아보세요...",
    empty: "아직 올라온 동아리 광고가 없어요. 우리 동아리를 알려보세요.",
  },
};

/** 동아리광고 글에 첨부된 동아리 미리보기 — 광고 카드 렌더링용. */
export type PlazaClubRef = {
  id: string;
  name: string;
  category: string;
  isApproved: boolean;
  isActive: boolean;
  maxMembers: number | null;
  memberCount: number;
  imageUrl: string | null;
};

export type PlazaPost = {
  id: string;
  category: string;
  content: string;
  isAnswered: boolean;
  answeredNote: string | null;
  answeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  isMine: boolean;
  canDelete: boolean;
  canEdit: boolean;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role | null;
  isNewcomer: boolean;
  systemType: string | null;
  images: string[];
  club: PlazaClubRef | null;
  reactionCount: number;
  iReacted: boolean;
  commentCount: number;
};
