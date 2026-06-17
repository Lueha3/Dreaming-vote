import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { checkRateLimit } from "@/lib/rateLimit";
import { PERSONALITY_CARDS } from "@/data/personalityCards";

const PERSONALITY_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP",
] as const;

const bodySchema = z.object({
  personalityType: z.enum(PERSONALITY_TYPES),
});

/**
 * POST /api/reports/personality
 * 성격 유형 선택 → 사전 생성 캐시 카드 → DB 저장 + 슬러그 발급
 *
 * 정책(2026-06-16): 로그인 + 승인 멤버 전용. 익명·미승인 생성 차단.
 *   - 비로그인        → 401 (code: login_required) → 클라이언트는 /login 유도
 *   - 로그인·미승인   → 403 (code: membership_required) → 클라이언트는 /join(프로필 설정) 유도
 *   - 로그인·승인     → 캐시 카드 생성 + 저장 (saved: true)
 */
export async function POST(req: NextRequest) {
  // 1. 인증 게이트 — 로그인 + 승인 멤버만 (서버가 최종 경계, 클라이언트 우회 불가)
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, code: "login_required", error: "로그인 후 이용할 수 있어요." },
      { status: 401 },
    );
  }
  const gate = membershipGate(user); // 승인 멤버가 아니면 403 (code: membership_required)
  if (gate) return gate;

  // 2. 입력 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "올바른 성격 유형을 선택해주세요." },
      { status: 400 },
    );
  }

  const { personalityType } = parsed.data;

  // 3. Rate limit — 로그인 유저(userId) 단위 DB 쓰기 보호.
  //    공유 IP(교회 WiFi)와 무관하게 같은 사람만 제한된다.
  if (!checkRateLimit(user.dbUserId, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "잠시 후 다시 시도해주세요 (1분이면 풀려요)." },
      { status: 429 },
    );
  }

  // 4. 사전 생성 캐시 — MBTI는 입력이 16종뿐이라 라이브 AI 호출이 없다.
  //    (인물형/프롬프트 변경 시 npx tsx scripts/generate-personality-cards.ts 로 재생성)
  const reportData = PERSONALITY_CARDS[personalityType];
  if (!reportData) {
    // 16종 캐시 누락 — 정상 경로에서는 도달 불가
    return NextResponse.json(
      { ok: false, error: "해당 유형 카드를 찾을 수 없어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  // 5. 기존 성향 카드 전부 삭제 → 항상 최신 1장만 유지
  //    (ShareEvent·ClubRecommendation은 onDelete: Cascade로 함께 정리됨)
  await prisma.report.deleteMany({ where: { userId: user.dbUserId } });

  // 6. 새 카드 저장 + 슬러그 발급
  const shareSlug = await generateUniqueSlug();

  const report = await prisma.report.create({
    data: {
      userId: user.dbUserId,
      catchphrase: reportData.catchphrase,
      coreTraits: reportData.coreTraits,
      optimalEcosystem: reportData.optimalEcosystem,
      corePosition: reportData.corePosition,
      sourceAi: "personality",
      parsingModel: "cache:v1",
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  return NextResponse.json({ ok: true, saved: true, shareSlug: report.shareSlug, reportData });
}
