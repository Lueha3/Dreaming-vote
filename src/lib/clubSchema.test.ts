import { describe, it, expect } from "vitest";
import { clubCreateSchema, clubPatchSchema } from "@/lib/clubSchema";
import { CLUB_CATEGORIES } from "@/lib/clubCategories";
import { SUPABASE_STORAGE_PREFIX } from "@/lib/storage";

const CAT = CLUB_CATEGORIES[0];
const VALID_URL = `${SUPABASE_STORAGE_PREFIX}abc.webp`;

const baseCreate = {
  name: "알고리즘 스터디",
  description: "매주 모여 알고리즘 문제를 함께 풉니다.",
  category: CAT,
  tags: "코딩, 알고리즘",
  images: [{ url: `${SUPABASE_STORAGE_PREFIX}abc.webp`, caption: "", order: 0 }],
};

describe("clubCreateSchema (개설)", () => {
  it("정상 입력(대표 사진 1장 포함) 통과", () => {
    const r = clubCreateSchema.safeParse(baseCreate);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.images).toHaveLength(1);
  });

  it("★ 대표 사진 없이는 개설 불가 — images 생략·빈 배열 모두 거부", () => {
    const withoutImages: Record<string, unknown> = { ...baseCreate };
    delete withoutImages.images;
    expect(clubCreateSchema.safeParse(withoutImages).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, images: [] }).success).toBe(false);
  });

  it("이름 2자 미만·소개 10자 미만·빈 키워드·잘못된 카테고리 거부", () => {
    expect(clubCreateSchema.safeParse({ ...baseCreate, name: "A" }).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, description: "짧음" }).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, tags: "" }).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, category: "없는카테고리" }).success).toBe(false);
  });

  it("maxMembers 경계(2~1000), null 허용", () => {
    expect(clubCreateSchema.safeParse({ ...baseCreate, maxMembers: 1 }).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, maxMembers: 1001 }).success).toBe(false);
    expect(clubCreateSchema.safeParse({ ...baseCreate, maxMembers: 2 }).success).toBe(true);
    expect(clubCreateSchema.safeParse({ ...baseCreate, maxMembers: null }).success).toBe(true);
  });

  it("이미지 URL은 우리 스토리지 prefix만 허용", () => {
    const ok = clubCreateSchema.safeParse({
      ...baseCreate,
      images: [{ url: VALID_URL, caption: "", order: 0 }],
    });
    expect(ok.success).toBe(true);
    const bad = clubCreateSchema.safeParse({
      ...baseCreate,
      images: [{ url: "https://evil.com/x.png", caption: "", order: 0 }],
    });
    expect(bad.success).toBe(false);
  });

  it("이미지 최대 10장 초과 거부", () => {
    const images = Array.from({ length: 11 }, (_, i) => ({
      url: VALID_URL,
      caption: "",
      order: i,
    }));
    expect(clubCreateSchema.safeParse({ ...baseCreate, images }).success).toBe(false);
  });
});

describe("clubPatchSchema (수정) — images default 트랩 회귀 가드", () => {
  it("빈 객체 통과, 모든 필드 optional", () => {
    const r = clubPatchSchema.safeParse({});
    expect(r.success).toBe(true);
  });

  it("★ images 생략 = undefined (절대 [] 아님 — '생략=유지' 보장)", () => {
    const r = clubPatchSchema.safeParse({ name: "새 이름" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.images).toBeUndefined();
  });

  it("★ images: [] 전달(전체 비우기)은 거부 — 대표 사진은 수정 후에도 최소 1장 유지", () => {
    const r = clubPatchSchema.safeParse({ images: [] });
    expect(r.success).toBe(false);
  });

  it("images 배열을 명시적으로 보내면 1장 이상이어야 통과", () => {
    const r = clubPatchSchema.safeParse({
      images: [{ url: VALID_URL, caption: "", order: 0 }],
    });
    expect(r.success).toBe(true);
  });

  it("부분 수정(이름만) 통과", () => {
    expect(clubPatchSchema.safeParse({ name: "변경됨" }).success).toBe(true);
  });
});
