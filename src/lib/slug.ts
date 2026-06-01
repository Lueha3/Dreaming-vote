import { customAlphabet } from "nanoid";
import { prisma } from "./db";

// 7자리 소문자+숫자 슬러그 (약 37억 가지 조합 — 충돌 가능성 극히 낮음)
const nanoid = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 7);

/**
 * DB 중복 없는 고유 슬러그 생성
 * 5회 시도 후 실패 시 에러 (실제로는 거의 발생 안 함)
 */
export async function generateUniqueSlug(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const slug = nanoid();
    const existing = await prisma.report.findUnique({
      where: { shareSlug: slug },
      select: { id: true },
    });
    if (!existing) return slug;
  }
  throw new Error("Failed to generate unique slug after 5 attempts");
}
