import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

/**
 * GET /api/manage/members
 * 멤버관리(강제 탈퇴) 탭용 목록 — 이미 탈퇴(소프트 삭제)된 계정은 제외. 운영진 이상 열람.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const items = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      role: true,
      membershipStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    viewerRole: user!.role,
    viewerId: user!.dbUserId,
    items,
  });
}
