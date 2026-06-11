import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/members/[id]/reject
 * 가입 거절 — body.reason(선택)이 신청자에게 표시된다. 재신청 가능.
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const { id } = params instanceof Promise ? await params : params;

  let reason: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.reason === "string") reason = body.reason.trim().slice(0, 200) || null;
  } catch {
    /* body 없이도 허용 */
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: {
      membershipStatus: "rejected",
      membershipDecidedAt: new Date(),
      membershipNote: reason,
    },
  });

  return NextResponse.json({ ok: true });
}
