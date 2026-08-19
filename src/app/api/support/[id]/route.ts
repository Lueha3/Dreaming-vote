import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

/** DELETE /api/support/[id] — 문의 삭제. 작성자 본인 또는 운영진(모더레이션)만. */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  if (!checkRateLimit(`support-del:${user.dbUserId}`, { windowMs: 60_000, max: 30 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { userId: true } });
  if (!ticket) return NextResponse.json({ ok: false, error: "문의를 찾을 수 없습니다." }, { status: 404 });

  const isStaff = hasAtLeast(user.role, "staff");
  const isModeration = ticket.userId !== user.dbUserId;
  if (isModeration && !isStaff) {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  await prisma.supportTicket.delete({ where: { id } }); // 답글은 onDelete: Cascade로 함께 삭제

  if (isModeration) {
    try {
      await recordAudit({
        actor: user,
        action: "content_delete",
        targetType: "support_ticket",
        targetId: id,
        summary: "고객센터 문의 삭제(모더레이션)",
        ip: getClientIp(req),
      });
    } catch {
      /* best-effort */
    }
  }

  return NextResponse.json({ ok: true });
}
