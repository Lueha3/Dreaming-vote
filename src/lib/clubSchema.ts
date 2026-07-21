import { z } from "zod";

import { CLUB_CATEGORIES } from "@/lib/clubCategories";
import { SUPABASE_STORAGE_PREFIX } from "@/lib/storage";

// 동아리 개설/수정 입력 스키마 단일 출처. POST /api/clubs 와 PATCH /api/clubs/[id] 가 공유한다.
export const clubImageSchema = z.object({
  url: z.string().url().startsWith(SUPABASE_STORAGE_PREFIX),
  caption: z.string().max(100).default(""),
  order: z.number().int().min(0),
});

// 개별 필드 검증기 — 개설(필수)·수정(선택)에서 재사용한다.
const nameField = z
  .string()
  .trim()
  .min(2, "동아리 이름은 2자 이상이어야 합니다.")
  .max(40, "동아리 이름이 너무 깁니다.");
const descriptionField = z
  .string()
  .trim()
  .min(10, "소개를 10자 이상 작성해주세요.")
  .max(2000, "소개가 너무 깁니다.");
const categoryField = z.enum(CLUB_CATEGORIES);
const tagsField = z
  .string()
  .trim()
  .min(1, "키워드를 1개 이상 입력해주세요.")
  .max(200, "키워드가 너무 깁니다.");
const maxMembersField = z.number().int().min(2).max(1000).nullable().optional();
// 동아리 대표 사진(카드뉴스 이미지)은 최소 1장 필수 — 홈 대문 캐러셀·목록 카드의 커버로 쓰인다.
const imagesField = z
  .array(clubImageSchema)
  .min(1, "동아리 대표 사진을 1장 이상 올려주세요.")
  .max(10, "이미지는 최대 10장까지 올릴 수 있습니다.");

export const clubCreateSchema = z.object({
  name: nameField,
  description: descriptionField,
  category: categoryField,
  tags: tagsField,
  maxMembers: maxMembersField,
  images: imagesField,
});

// 수정용 — 모든 필드 선택(부분 수정).
// 주의: images는 default를 두지 않는다. 생략(undefined)=기존 이미지 유지, 배열 전달=전체 교체.
// (clubCreateSchema.partial()을 쓰면 images의 default가 살아남아 '생략=전체 삭제'가 되어 버린다.)
// 배열을 명시적으로 보낼 때는 개설과 동일하게 최소 1장을 강제한다 — 대표 사진을 전부 지워
// 0장으로 만드는 우회를 막는다(대표 사진 필수 정책은 수정 후에도 항상 유지).
export const clubPatchSchema = z.object({
  name: nameField.optional(),
  description: descriptionField.optional(),
  category: categoryField.optional(),
  tags: tagsField.optional(),
  maxMembers: maxMembersField,
  images: imagesField.optional(),
});
