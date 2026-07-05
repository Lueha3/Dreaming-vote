import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

/**
 * GET /api/manage/metrics
 * 최근 12주 운영 지표 스냅샷 — /manage/stats 추세 표시용(운영진 이상).
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const snapshots = await prisma.metricSnapshot.findMany({
    orderBy: { weekOf: "desc" },
    take: 12,
    select: {
      weekOf: true,
      newcomer90dRetention: true,
      crossCellInteractionRate: true,
      clubJoinRate: true,
      activeMemberCount: true,
    },
  });

  // 오래된 → 최신 순으로 반환(차트를 좌→우 시간순으로 그리기 위함).
  return NextResponse.json({ ok: true, snapshots: snapshots.reverse() });
}
