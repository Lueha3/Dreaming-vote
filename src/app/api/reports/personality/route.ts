import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parsePersonalityReport, classifyAiError } from "@/lib/ai";
import { generateUniqueSlug } from "@/lib/slug";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
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
 * 성격 유형 선택 → Gemini 분석 → 리포트 생성
 *
 * - 비로그인: 파싱 결과만 반환 (saved: false)
 * - 로그인: DB 저장 + 슬러그 발급 (saved: true)
 */
export async function POST(req: NextRequest) {
  // 1. 현재 유저 확인 — rate limit 키 결정에 필요 (로그인: userId, 비로그인: IP)
  const user = await getAuthUser();

  // 2. 입력 검증 (캐시·레이트리밋 판단에 유형이 필요하므로 먼저)
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

  // 3. 사전 생성 캐시 우선 — MBTI는 입력이 16종뿐이라 라이브 Gemini 호출이 필요 없다.
  //    (인물형/프롬프트 변경 시 npx tsx scripts/generate-personality-cards.ts 로 재생성)
  const cached = PERSONALITY_CARDS[personalityType] ?? null;

  // 4. Rate limit — "라이브 AI 호출(캐시 미스)" 또는 "DB 쓰기(로그인)"가 있을 때만 적용.
  //    비로그인 + 캐시 히트는 AI·DB 비용이 0이라 제한하지 않는다
  //    → 같은 교회 WiFi(공유 IP)에서 100명이 동시에 골라도 무료로 즉시 응답.
  const ip = getClientIp(req);
  const rateLimitKey = user?.dbUserId ?? ip;
  const needsRateLimit = !cached || !!user;
  if (needsRateLimit && !checkRateLimit(rateLimitKey, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "잠시 후 다시 시도해주세요 (1분이면 풀려요)." },
      { status: 429 },
    );
  }

  // 5. 카드 데이터 — 캐시 히트면 그대로, 미스(이론상 없음, 방어적)면 라이브 생성
  let reportData = cached;
  let parsingModel = "cache:v1";
  if (!reportData) {
    try {
      reportData = await parsePersonalityReport(personalityType);
      parsingModel = "gemini-2.5-flash";
    } catch (e) {
      const c = classifyAiError(e);
      console.error("POST /api/reports/personality failed:", c.raw);

      await prisma.parsingLog.create({
        data: {
          userId: user?.dbUserId ?? null,
          status: c.code === "AI_QUOTA" ? "api_error" : "parse_failed",
          sourceAi: "personality",
          inputLength: personalityType.length,
          errorMessage: c.raw.slice(0, 200),
        },
      }).catch(() => {});

      return NextResponse.json(
        { ok: false, code: c.code, error: c.error },
        { status: c.status },
      );
    }
  }

  // 6. 비로그인: 파싱 결과만 반환
  if (!user) {
    return NextResponse.json({ ok: true, saved: false, reportData });
  }

  // 7. 로그인: DB 저장
  const shareSlug = await generateUniqueSlug();

  const report = await prisma.report.create({
    data: {
      userId: user.dbUserId,
      catchphrase: reportData.catchphrase,
      coreTraits: reportData.coreTraits,
      optimalEcosystem: reportData.optimalEcosystem,
      corePosition: reportData.corePosition,
      sourceAi: "personality",
      parsingModel,
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  // 라이브 생성만 ParsingLog에 기록(추적용). 캐시 히트는 버스트 시 DB 쓰기를 줄이려 생략.
  if (!cached) {
    await prisma.parsingLog.create({
      data: {
        userId: user.dbUserId,
        status: "success",
        sourceAi: "personality",
        inputLength: personalityType.length,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, saved: true, shareSlug: report.shareSlug, reportData });
}
