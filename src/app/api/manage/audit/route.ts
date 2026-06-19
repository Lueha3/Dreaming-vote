import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

/**
 * GET /api/manage/audit — 최근 감사 로그(운영진+). 최신 100건.
 * actorId 등 내부 식별자는 제외하고 표시용 필드만 반환.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const items = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      actorNickname: true,
      actorRole: true,
      action: true,
      targetType: true,
      summary: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}
