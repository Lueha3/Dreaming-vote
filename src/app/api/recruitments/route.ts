import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

// GET /api/recruitments
// 모집글 목록 조회
// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function GET() {
  try {
    console.log("GET /api/recruitments");
    
    const rows = await prisma.recruitment.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        capacity: true,
        appliedCount: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.content,
        status: r.status,
        capacity: r.capacity,
        appliedCount: r.appliedCount,
      })),
    });
  } catch (e: any) {
    console.error("GET /api/recruitments failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}


