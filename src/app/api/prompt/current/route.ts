import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/prompt/current
 * 현재 활성화된 코어 프롬프트 반환
 * 비로그인 허용 — 프롬프트 페이지는 누구나 접근 가능
 */
export async function GET() {
  try {
    const prompt = await prisma.promptVersion.findFirst({
      where: { isActive: true },
      select: { version: true, content: true },
      orderBy: { createdAt: "desc" },
    });

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: "활성화된 프롬프트가 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, prompt });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";
    console.error("GET /api/prompt/current failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
