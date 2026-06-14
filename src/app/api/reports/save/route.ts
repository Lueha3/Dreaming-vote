import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/slug";
import { reportSchema } from "@/lib/ai";

/**
 * POST /api/reports/save
 * 비로그인 파싱 결과를 로그인 후 저장하는 엔드포인트
 * 프론트에서 sessionStorage의 임시 데이터를 로그인 콜백 후 이 API로 전송
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  // sourceAi는 프론트(AI_OPTIONS)·텍스트 라우트·성격유형 라우트가 보내는 모든 값을 허용해야 한다.
  // 누락 시 비로그인→로그인 저장이 400으로 실패한다: "personality"(MBTI 경로), "copilot"(텍스트 경로).
  const bodySchema = z.object({
    reportData: reportSchema,
    sourceAi: z.enum(["chatgpt", "claude", "gemini", "copilot", "other", "personality"]),
  });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "데이터 형식 오류", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { reportData, sourceAi } = parsed.data;
  const shareSlug = await generateUniqueSlug();

  const report = await prisma.report.create({
    data: {
      userId: user.dbUserId,
      ...reportData,
      sourceAi,
      // 비로그인 때 생성된 결과를 로그인 후 저장하는 경로 — 실제 생성 모델을 알 수 없다(캐시/라이브 불명).
      // 죽은 모델명(gemini-2.0-flash-lite, 현재 404)을 박지 않고 정직한 라벨로 기록.
      parsingModel: "deferred",
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  return NextResponse.json({ ok: true, shareSlug: report.shareSlug });
}
