import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parsePersonalityReport, classifyAiError } from "@/lib/ai";
import { generateUniqueSlug } from "@/lib/slug";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

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
  // 1. Rate limit
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  // 2. 현재 유저 확인
  const user = await getAuthUser();

  // 3. 입력 검증
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

  // 4. Gemini로 성격 유형 분석
  let reportData;
  try {
    reportData = await parsePersonalityReport(personalityType);
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

  // 5. 비로그인: 파싱 결과만 반환
  if (!user) {
    return NextResponse.json({ ok: true, saved: false, reportData });
  }

  // 6. 로그인: DB 저장
  const shareSlug = await generateUniqueSlug();

  const report = await prisma.report.create({
    data: {
      userId: user.dbUserId,
      catchphrase: reportData.catchphrase,
      coreTraits: reportData.coreTraits,
      optimalEcosystem: reportData.optimalEcosystem,
      corePosition: reportData.corePosition,
      sourceAi: "personality",
      parsingModel: "gemini-2.5-flash",
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  await prisma.parsingLog.create({
    data: {
      userId: user.dbUserId,
      status: "success",
      sourceAi: "personality",
      inputLength: personalityType.length,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, saved: true, shareSlug: report.shareSlug, reportData });
}
