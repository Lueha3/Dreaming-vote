import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// GET /api/recruitments/[id]
// 모집글 단건 상세 조회
// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    // Next.js 16: params may be a Promise
    const resolvedParams = 
      context.params instanceof Promise 
        ? await context.params 
        : context.params;
    const { id } = resolvedParams;
    
    console.log("GET /api/recruitments/[id]", { id });

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const recruitment = await prisma.recruitment.findUnique({
      where: { id },
    });

    if (!recruitment) {
      return NextResponse.json(
        { ok: false, error: "해당 모집글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: recruitment,
    });
  } catch (e: any) {
    console.error("GET /api/recruitments/[id] failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}


