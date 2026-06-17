import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

// 역할 강한 순으로 정렬(관리자 먼저). club_leader는 전역 role엔 없지만 방어적으로 포함.
const ROLE_ORDER: Record<string, number> = {
  superadmin: 0,
  admin: 1,
  staff: 2,
  club_leader: 3,
  member: 4,
};

/**
 * GET /api/manage/users
 * 역할 관리용 사용자 목록 — 운영진 이상 열람. PII(전화/이메일) 미노출.
 * viewerRole/viewerId를 함께 내려 클라이언트가 가능한 조작을 판단한다.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      role: true,
      membershipStatus: true,
      createdAt: true,
    },
  });

  const items = [...users].sort((a, b) => {
    const byRole = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    if (byRole !== 0) return byRole;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return NextResponse.json({
    ok: true,
    viewerRole: user!.role,
    viewerId: user!.dbUserId,
    items,
  });
}
