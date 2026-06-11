import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/clubs/[id]/approve
 * 동아리 승인 — 노출 시작 (isApproved=true, isActive=true)
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const { id } = params instanceof Promise ? await params : params;

  const club = await prisma.club.findUnique({ where: { id }, select: { id: true } });
  if (!club) return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });

  await prisma.club.update({
    where: { id },
    data: { isApproved: true, isActive: true },
  });

  return NextResponse.json({ ok: true });
}
