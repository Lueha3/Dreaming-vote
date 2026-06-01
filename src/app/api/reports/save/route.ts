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

  const bodySchema = z.object({
    reportData: reportSchema,
    sourceAi: z.enum(["chatgpt", "claude", "gemini", "other"]),
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
      parsingModel: "gemini-2.0-flash-lite",
      parsingVersion: "v1.0",
      shareSlug,
    },
  });

  return NextResponse.json({ ok: true, shareSlug: report.shareSlug });
}
