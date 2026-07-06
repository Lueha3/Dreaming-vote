import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

/**
 * GET /api/manage/events/setup — 운영진+ : 청년부 전체 행사 보드(시스템 동아리) 존재 여부.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const club = await prisma.club.findFirst({
    where: { isSystem: true },
    select: { id: true, name: true, _count: { select: { applications: { where: { status: "accepted" } } } } },
  });

  return NextResponse.json({
    ok: true,
    exists: !!club,
    clubId: club?.id ?? null,
    name: club?.name ?? null,
    memberCount: club?._count.applications ?? 0,
  });
}

/**
 * POST /api/manage/events/setup — 운영진+ : 없으면 시스템 동아리를 생성하고
 * 현재 승인 멤버 전원을 accepted 멤버로 등록(이후 신규 승인자는 승인 시점에 자동 등록).
 * 이미 있으면 최신 승인 멤버로 다시 동기화만 한다(멱등).
 */
export async function POST() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  let club = await prisma.club.findFirst({ where: { isSystem: true }, select: { id: true } });
  if (!club) {
    club = await prisma.club.create({
      data: {
        name: "청년부 전체 행사",
        description: "청년부 전체가 함께하는 행사 일정이 모이는 공간이에요.",
        category: "친목",
        tags: "전체행사",
        ownerUserId: user!.dbUserId,
        isApproved: true,
        isActive: true,
        isSystem: true,
      },
      select: { id: true },
    });
  }

  const members = await prisma.user.findMany({
    where: { membershipStatus: "approved", deletedAt: null },
    select: { id: true },
  });

  for (const m of members) {
    await prisma.clubApplication.upsert({
      where: { clubId_userId: { clubId: club.id, userId: m.id } },
      update: { status: "accepted" },
      create: { clubId: club.id, userId: m.id, status: "accepted" },
    });
  }

  return NextResponse.json({ ok: true, clubId: club.id, memberCount: members.length });
}
