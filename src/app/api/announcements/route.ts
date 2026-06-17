import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/announcements — 공개 공지(게시된 것만). 인증 불필요.
 * ?pinned=1 → 고정 공지만 (배너용). 미지정 → 전체 게시 공지 (/notices 목록용).
 * 정렬: 고정 우선 → 최신순.
 */
export async function GET(req: NextRequest) {
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw, 10) || 1, 1), 50) : undefined;
  const pinnedOnly = req.nextUrl.searchParams.get("pinned") === "1";

  const rows = await prisma.announcement.findMany({
    where: { isPublished: true, ...(pinnedOnly ? { isPinned: true } : {}) },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      isPinned: true,
      createdAt: true,
      author: { select: { nickname: true } },
    },
  });

  const items = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    isPinned: a.isPinned,
    createdAt: a.createdAt,
    authorNickname: a.author?.nickname ?? null,
  }));

  return NextResponse.json({ ok: true, items });
}
