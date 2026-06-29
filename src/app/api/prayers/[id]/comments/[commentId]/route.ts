import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

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
    select: {
      userId: true,
      prayerId: true,
      prayer: { select: { userId: true } },
      replies: { select: { id: true } },
    },
  });

  if (!comment || comment.prayerId !== id) {
    return NextResponse.json({ ok: false, error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  const canDelete =
    comment.userId === user.dbUserId ||
    comment.prayer.userId === user.dbUserId ||
    hasAtLeast(user.role, "staff");
  if (!canDelete) return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  // 내가 쓰지 않은 댓글 삭제 = 모더레이션(운영진 권한 또는 글 작성자의 스레드 관리).
  // 두 경로 모두 타인 콘텐츠 삭제이므로 책임추적을 위해 감사하되 권한 출처를 구분 기록.
  const isModeration = comment.userId !== user.dbUserId;
  const byStaff = hasAtLeast(user.role, "staff");

  // 부모 댓글 삭제 시 답글도 DB FK(onDelete: Cascade)로 함께 삭제됨 — 신고 해결도 답글까지 포함.
  const targetIds = [commentId, ...comment.replies.map((r) => r.id)];
  await prisma.$transaction(async (tx) => {
    await tx.prayerComment.delete({ where: { id: commentId } });
    // 이 댓글(및 함께 삭제된 답글)의 미처리 신고를 해결 처리(콘텐츠가 사라졌으므로 유령 신고 적체 방지)
    await tx.contentReport.updateMany({
      where: { status: "open", targetType: "comment", targetId: { in: targetIds } },
      data: { status: "resolved", resolvedById: user.dbUserId, resolvedAt: new Date() },
    });
  });

  if (isModeration) {
    try {
      await recordAudit({
        actor: user,
        action: "content_delete",
        targetType: "comment",
        targetId: commentId,
        summary: byStaff ? "광장 댓글을 운영 권한으로 삭제" : "광장 댓글을 글 작성자 권한으로 삭제",
        ip: getClientIp(req),
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}
