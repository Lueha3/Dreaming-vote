import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";

/**
 * GET /api/admin/stats
 * 운영 지표 집계 (관리자 전용)
 */
export async function GET() {
  if (!(await hasAdminAreaAccess("staff"))) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const [
    users,
    reports,
    clubsTotal,
    clubsPending,
    clubsActive,
    appsTotal,
    appsAccepted,
    appsPending,
    recommendations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.report.count(),
    prisma.club.count(),
    prisma.club.count({ where: { isApproved: false } }),
    prisma.club.count({ where: { isApproved: true, isActive: true } }),
    prisma.clubApplication.count(),
    prisma.clubApplication.count({ where: { status: "accepted" } }),
    prisma.clubApplication.count({ where: { status: "pending" } }),
    prisma.clubRecommendation.count(),
  ]);

  return NextResponse.json({
    ok: true,
    stats: {
      users,
      reports,
      clubsTotal,
      clubsPending,
      clubsActive,
      appsTotal,
      appsAccepted,
      appsPending,
      recommendations,
    },
  });
}
