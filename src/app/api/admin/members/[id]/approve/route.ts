import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildNickname } from "@/lib/membership";
import { isAdminRequest } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/members/[id]/approve
 * 가입 승인 — 닉네임을 신청서의 검증된 나이·이름으로 무조건 재생성.
 * (승인 전 자가 설정한 위조 형식 닉네임이 '검증된 신원'으로 굳는 것을 차단)
 */
export async function POST(req: NextRequest, { params }: Params) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const { id } = params instanceof Promise ? await params : params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, nickname: true, realName: true, age: true, membershipStatus: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });
  }
  if (user.membershipStatus === "none") {
    return NextResponse.json(
      { ok: false, error: "아직 가입 신청서를 제출하지 않은 사용자예요." },
      { status: 400 },
    );
  }

  const autoNickname =
    user.realName && user.age ? buildNickname(user.age, user.realName) : null;

  await prisma.user.update({
    where: { id },
    data: {
      membershipStatus: "approved",
      membershipDecidedAt: new Date(),
      membershipNote: null,
      ...(autoNickname ? { nickname: autoNickname } : {}),
    },
  });

  return NextResponse.json({ ok: true, nickname: autoNickname ?? user.nickname });
}
