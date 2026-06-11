import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/clubs/[id]/reject
 * 동아리 반려 — 비노출 처리 (isApproved=false, isActive=false)
 * 영구 삭제가 아닌 소프트 숨김. 데이터는 보존됩니다.
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
    data: { isApproved: false, isActive: false },
  });

  return NextResponse.json({ ok: true });
}
