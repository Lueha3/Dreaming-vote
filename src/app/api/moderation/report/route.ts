import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { createAdminNotification } from "@/lib/notifications";

const schema = z.object({
  targetType: z.enum(["prayer", "comment", "club"]),
  targetId: z.string().trim().min(1).max(40),
  reason: z.string().trim().min(1, "신고 사유를 입력해주세요.").max(500, "사유가 너무 깁니다."),
});

/** 신고 대상의 존재 여부 + 작성자 id(허위 타깃 차단 + 본인 자가 신고 차단용). */
async function fetchTarget(
  targetType: string,
  targetId: string,
): Promise<{ exists: boolean; authorId: string | null }> {
  if (targetType === "prayer") {
    const p = await prisma.prayer.findUnique({ where: { id: targetId }, select: { userId: true } });
    return { exists: !!p, authorId: p?.userId ?? null };
  }
  if (targetType === "comment") {
    const c = await prisma.prayerComment.findUnique({
      where: { id: targetId },
      select: { userId: true },
    });
    return { exists: !!c, authorId: c?.userId ?? null };
  }
  const cl = await prisma.club.findUnique({
    where: { id: targetId },
    select: { ownerUserId: true },
  });
  return { exists: !!cl, authorId: cl?.ownerUserId ?? null };
}

/**
 * POST /api/moderation/report
 * 광장 글/댓글/동아리 신고 — 승인 멤버만. body: { targetType, targetId, reason }
 * 같은 대상에 대한 본인의 미처리(open) 신고가 이미 있으면 중복 생성하지 않는다.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  if (!checkRateLimit(`report:${user.dbUserId}`, { windowMs: 60_000, max: 10 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().fieldErrors.reason?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }
  const { targetType, targetId, reason } = parsed.data;

  const target = await fetchTarget(targetType, targetId);
  if (!target.exists) {
    return NextResponse.json({ ok: false, error: "신고 대상을 찾을 수 없어요." }, { status: 404 });
  }
  // 본인 콘텐츠 자가 신고는 조용히 무시(운영 큐 노이즈 방지 — 본인 글은 직접 삭제 가능).
  if (target.authorId && target.authorId === user.dbUserId) {
    return NextResponse.json({ ok: true, self: true });
  }

  // 동일 대상에 대한 본인의 미처리 신고가 이미 있으면 멱등 처리(중복 접수 방지).
  const dup = await prisma.contentReport.findFirst({
    where: { reporterId: user.dbUserId, targetType, targetId, status: "open" },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json({ ok: true, already: true });
  }

  try {
    await prisma.contentReport.create({
      data: { reporterId: user.dbUserId, targetType, targetId, reason },
    });
  } catch (e) {
    // 부분 유니크 인덱스(reporterId,targetType,targetId WHERE status='open') 충돌 = 동시 중복 접수.
    if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    throw e;
  }

  // 운영진에게 새 신고 접수 알림 (best-effort)
  try {
    await createAdminNotification({
      type: "admin_content_reported",
      title: "새 신고가 접수됐어요",
      body: `${targetType === "prayer" ? "광장 글" : targetType === "comment" ? "댓글" : "동아리"} 신고 — 사유: ${reason}`,
      link: "/manage/reports",
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
