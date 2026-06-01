import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/clubs/[id]/applications
 * 동아리 가입 신청 목록 (개설자 본인만 조회 가능).
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  const club = await prisma.club.findUnique({
    where: { id },
    select: { id: true, name: true, ownerUserId: true, maxMembers: true },
  });
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }
  if (club.ownerUserId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const apps = await prisma.clubApplication.findMany({
    where: { clubId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      message: true,
      status: true,
      createdAt: true,
      user: { select: { nickname: true, avatarUrl: true } },
    },
  });

  const items = apps.map((a) => ({
    id: a.id,
    message: a.message,
    status: a.status,
    createdAt: a.createdAt,
    applicantNickname: a.user?.nickname ?? null,
    applicantAvatarUrl: a.user?.avatarUrl ?? null,
  }));

  return NextResponse.json({
    ok: true,
    club: { id: club.id, name: club.name, maxMembers: club.maxMembers },
    items,
    acceptedCount: items.filter((i) => i.status === "accepted").length,
    pendingCount: items.filter((i) => i.status === "pending").length,
  });
}
