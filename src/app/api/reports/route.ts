import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { parseReport } from "@/lib/ai";
import { generateUniqueSlug } from "@/lib/slug";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const bodySchema = z.object({
  rawText: z
    .string()
    .min(50, "결과가 너무 짧습니다. AI 분석 결과 전체를 붙여넣어 주세요.")
    .max(10000, "결과가 너무 깁니다."),
  sourceAi: z.enum(["chatgpt", "claude", "gemini", "copilot", "other"]),
});

/**
 * POST /api/reports
 * AI 결과 텍스트 → Claude Haiku 파싱 → 리포트 저장
 *
 * 익명 허용 흐름:
 * - 비로그인: 파싱만 하고 임시 결과 반환 (saved: false) — 원문 즉시 폐기
 * - 로그인: 파싱 + DB 저장 + 슬러그 발급 (saved: true)
 */
export async function POST(req: NextRequest) {
  // 1. Rate limit — Claude API 비용 보호 (분당 3회)
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 3 })) {
    return NextResponse.json(
      {
        ok: false,
        code: "RATE_LIMIT",
        error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 429 },
    );
  }

  // 2. 현재 유저 확인 (없으면 null — 에러 아님)
  const user = await getAuthUser();

  // 3. 입력 검증
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "입력값 오류",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { rawText, sourceAi } = parsed.data;

  // 4. Claude Haiku 파싱 — 원문은 여기서만 사용, 저장 안 함
  let reportData;
  try {
    reportData = await parseReport(rawText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    console.error("POST /api/reports parse failed:", msg);

    // 실패 로그 (원문 글자 수만)
    await prisma.parsingLog.create({
      data: {
        userId: user?.dbUserId ?? null,
        status: "parse_failed",
        sourceAi,
        inputLength: rawText.length,
        errorMessage: msg.slice(0, 200),
      },
    }).catch(() => {}); // 로그 실패가 응답에 영향 주지 않도록

    return NextResponse.json(
      {
        ok: false,
        code: "PARSE_FAILED",
        error: "분석에 실패했습니다. AI 결과를 더 자세하게 붙여넣고 다시 시도해주세요.",
      },
      { status: 422 },
    );
  }

  // 5. 비로그인: 파싱 결과만 반환 (저장 안 함)
  //    프론트에서 sessionStorage에 임시 보관 → 로그인 후 /api/reports/save로 재전송
  if (!user) {
    return NextResponse.json({
      ok: true,
      saved: false,
      reportData, // 원문은 여기 없음 — 파싱 결과만
    });
  }

  // 6. 로그인 상태: DB 저장
  const shareSlug = await generateUniqueSlug();

  const report = await prisma.report.create({
    data: {
      userId: user.dbUserId,
      catchphrase: reportData.catchphrase,
      coreTraits: reportData.coreTraits,
      optimalEcosystem: reportData.optimalEcosystem,
      corePosition: reportData.corePosition,
      sourceAi,
      parsingModel: "gemini-2.5-flash",
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  // 성공 로그
  await prisma.parsingLog.create({
    data: {
      userId: user.dbUserId,
      status: "success",
      sourceAi,
      inputLength: rawText.length,
    },
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    saved: true,
    shareSlug: report.shareSlug,
    reportData, // 슬라이드 결과 카드 표시용 — 로그인 시에도 항상 반환
  });
}
