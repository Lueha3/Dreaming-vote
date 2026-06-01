import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function requireAdmin(req: NextRequest) {
  return req.cookies.get("admin_session")?.value === "1";
}

/**
 * GET /api/admin/clubs
 * 전체 동아리 목록 — 승인 대기(미승인) 먼저, 그 다음 최신순
 */
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const clubs = await prisma.club.findMany({
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      maxMembers: true,
      isApproved: true,
      isActive: true,
      viewCount: true,
      createdAt: true,
      owner: { select: { nickname: true } },
      _count: { select: { applications: true } },
      images: { select: { url: true, caption: true }, orderBy: { order: "asc" }, take: 10 },
    },
  });

  const items = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    tags: c.tags,
    maxMembers: c.maxMembers,
    isApproved: c.isApproved,
    isActive: c.isActive,
    viewCount: c.viewCount,
    createdAt: c.createdAt,
    ownerNickname: c.owner?.nickname ?? null,
    applicationCount: c._count.applications,
    images: c.images,
  }));

  return NextResponse.json({ ok: true, items });
}
