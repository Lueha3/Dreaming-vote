import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

const schema = z.object({
  action: z.enum(["resolve", "dismiss", "delete"]),
  note: z.string().trim().max(300).optional(),
});

/**
 * PATCH /api/manage/reports/[id] — 신고 처리(운영진+).
 * - resolve: 조치 완료로 표시
 * - dismiss: 반려(문제 없음)
 * - delete: 신고된 콘텐츠(글/댓글) 삭제 + 같은 대상의 미처리 신고 일괄 해결 + 감사.
 *   (동아리는 여기서 삭제 불가 — '동아리 관리'에서 숨김 처리)
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { action } = parsed.data;
  const note = parsed.data.note ?? null;

  const report = await prisma.contentReport.findUnique({
    where: { id },
    select: { id: true, targetType: true, targetId: true, status: true },
  });
  if (!report) {
    return NextResponse.json({ ok: false, error: "신고를 찾을 수 없습니다." }, { status: 404 });
  }
  // 이미 처리된 신고는 재처리하지 않는다(최초 처리자/시각 스냅샷 보존).
  if (report.status !== "open") {
    return NextResponse.json({ ok: true, alreadyHandled: true });
  }

  /* ── 콘텐츠 삭제 처리 ─────────────────────────────────────── */
  if (action === "delete") {
    if (report.targetType === "club") {
      return NextResponse.json(
        { ok: false, error: "동아리는 여기서 삭제할 수 없어요. ‘동아리 관리’에서 숨김 처리해주세요." },
        { status: 400 },
      );
    }

    let conflicted = false;
    await prisma.$transaction(async (tx) => {
      // 이 신고가 아직 open일 때만 진행(동시 처리 가드 — dismiss된 신고로 콘텐츠가 삭제되는 것 방지).
      const claim = await tx.contentReport.updateMany({
        where: { id, status: "open" },
        data: { status: "resolved", note, resolvedById: user!.dbUserId, resolvedAt: new Date() },
      });
      if (claim.count === 0) {
        conflicted = true;
        return;
      }
      // deleteMany로 이미 삭제됐어도 throw하지 않게 한다(멱등).
      if (report.targetType === "prayer") {
        await tx.prayer.deleteMany({ where: { id: report.targetId } });
      } else {
        await tx.prayerComment.deleteMany({ where: { id: report.targetId } });
      }
      // 같은 대상에 대한 다른 미처리 신고도 모두 해결 처리(중복 큐 정리).
      await tx.contentReport.updateMany({
        where: { targetType: report.targetType, targetId: report.targetId, status: "open" },
        data: { status: "resolved", note, resolvedById: user!.dbUserId, resolvedAt: new Date() },
      });
    });

    if (conflicted) {
      return NextResponse.json({ ok: true, alreadyHandled: true });
    }

    try {
      await recordAudit({
        actor: user,
        action: "content_delete",
        targetType: report.targetType === "prayer" ? "prayer" : "comment",
        targetId: report.targetId,
        summary: "신고 처리로 콘텐츠 삭제",
        ip: getClientIp(req),
      });
    } catch {
      /* best-effort */
    }

    return NextResponse.json({ ok: true });
  }

  /* ── 해결 / 반려 ──────────────────────────────────────────── */
  // status:"open" 조건부 갱신 — 동시 처리 시 두 번째 요청은 0건 갱신(no-op)으로 흡수.
  const result = await prisma.contentReport.updateMany({
    where: { id, status: "open" },
    data: {
      status: action === "resolve" ? "resolved" : "dismissed",
      note,
      resolvedById: user!.dbUserId,
      resolvedAt: new Date(),
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ ok: true, alreadyHandled: true });
  }

  return NextResponse.json({ ok: true });
}
