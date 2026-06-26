import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { createMembershipNotification } from "@/lib/notifications";
import { rateLimitResponse, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

/**
 * POST /api/manage/membership/bulk-approve — 가입 일괄 승인(운영진+). body: { ids }
 * pending인 유저만 승인(approvedAge 고정·알림·감사 각각). 단건 승인과 동일 의미,
 * 한 요청으로 처리해 per-IP rate-limit에 걸리지 않게 한다.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const rl = rateLimitResponse(`membership-bulk:${getClientIp(req)}`, { windowMs: 60_000, max: 10 });
  if (rl) return rl;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const ids = [...new Set(parsed.data.ids)];

  const targets = await prisma.user.findMany({
    where: { id: { in: ids }, membershipStatus: "pending" },
    select: { id: true, nickname: true, age: true },
  });

  let approved = 0;
  for (const t of targets) {
    try {
      // status:"pending" 조건부 갱신 — 동시 처리/단건 승인과 겹쳐도 한 번만 처리.
      const r = await prisma.user.updateMany({
        where: { id: t.id, membershipStatus: "pending" },
        data: {
          membershipStatus: "approved",
          membershipDecidedAt: new Date(),
          membershipNote: null,
          approvedAge: t.age, // 승인 시점 나이 스냅샷 고정
        },
      });
      if (r.count === 0) continue; // 이미 처리됨
      approved++;

      try {
        await createMembershipNotification(t.id, "approve");
      } catch {
        /* best-effort */
      }
      try {
        await recordAudit({
          actor: user,
          action: "membership_approve",
          targetType: "user",
          targetId: t.id,
          summary: `가입 일괄 승인 (${t.nickname ?? "no-nickname"})`,
          ip: getClientIp(req),
        });
      } catch {
        /* best-effort */
      }
    } catch (e) {
      console.error("[membership-bulk] 승인 실패:", t.id, e);
    }
  }

  return NextResponse.json({ ok: true, approved, requested: ids.length });
}
