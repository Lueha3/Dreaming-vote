import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";

function requireAdmin(req: NextRequest) {
  return isAdminRequest(req);
}

const STATUS_ORDER: Record<string, number> = { pending: 0, rejected: 1, approved: 2, none: 3 };

/**
 * GET /api/admin/members
 * 전체 사용자 목록 — 승인 대기 먼저, 그 다음 신청일/가입일 최신순.
 * 전화번호는 이 API(관리자 전용)에서만 노출된다.
 */
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  // 정렬은 아래 JS sort가 전담 (상태 우선 → 신청일/가입일) — DB 정렬 불필요
  const users = await prisma.user.findMany({
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      createdAt: true,
      membershipStatus: true,
      realName: true,
      age: true,
      gender: true,
      dreamGroup: true,
      phone: true,
      membershipAppliedAt: true,
      membershipDecidedAt: true,
      membershipNote: true,
    },
  });

  const items = [...users].sort((a, b) => {
    const byStatus =
      (STATUS_ORDER[a.membershipStatus] ?? 9) - (STATUS_ORDER[b.membershipStatus] ?? 9);
    if (byStatus !== 0) return byStatus;
    const aTime = a.membershipAppliedAt ?? a.createdAt;
    const bTime = b.membershipAppliedAt ?? b.createdAt;
    return bTime.getTime() - aTime.getTime();
  });

  return NextResponse.json({ ok: true, items });
}
