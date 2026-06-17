import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = {
  params: Promise<{ id: string; commentId: string }> | { id: string; commentId: string };
};

/** DELETE /api/prayers/[id]/comments/[commentId] — 댓글 삭제 (작성자·글쓴이·운영진+) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, commentId } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  if (!checkRateLimit(`delc:${user.dbUserId}`, { windowMs: 60_000, max: 30 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const comment = await prisma.prayerComment.findUnique({
    where: { id: commentId },
    select: { userId: true, prayerId: true, prayer: { select: { userId: true } } },
  });

  if (!comment || comment.prayerId !== id) {
    return NextResponse.json({ ok: false, error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const canDelete =
    comment.userId === user.dbUserId ||
    comment.prayer.userId === user.dbUserId ||
    hasAtLeast(user.role, "staff");
  if (!canDelete) return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  await prisma.prayerComment.delete({ where: { id: commentId } });
  return NextResponse.json({ ok: true });
}
