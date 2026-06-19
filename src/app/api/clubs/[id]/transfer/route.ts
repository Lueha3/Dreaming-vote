import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getClientIp } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> | { id: string } };

const bodySchema = z.object({ appId: z.string().min(1) });

/**
 * POST /api/clubs/[id]/transfer  body: { appId }
 * 동아리장 승계 — 현재 개설자만. 대상은 accepted 멤버(appId로 지정).
 * 트랜잭션:
 *  - club.ownerUserId = 새 개설자
 *  - 새 개설자의 application 삭제 (이제 ownerUserId로 표현 → 라인업 중복 방지)
 *  - 기존 개설자를 accepted 멤버로 남김 (원하면 이후 '나가기' 가능)
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  const club = await prisma.club.findUnique({
    where: { id },
    select: { id: true, name: true, ownerUserId: true },
  });
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }
  if (club.ownerUserId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "개설자만 동아리장을 넘길 수 있어요." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "대상을 지정해주세요." }, { status: 400 });
  }

  const app = await prisma.clubApplication.findUnique({
    where: { id: parsed.data.appId },
    select: { id: true, clubId: true, status: true, userId: true },
  });
  if (!app || app.clubId !== id || app.status !== "accepted") {
    return NextResponse.json(
      { ok: false, error: "가입된 멤버에게만 동아리장을 넘길 수 있어요." },
      { status: 400 },
    );
  }
  if (app.userId === user.dbUserId) {
    return NextResponse.json({ ok: false, error: "본인에게는 넘길 수 없어요." }, { status: 400 });
  }

  const newOwnerId = app.userId;
  const oldOwnerId = user.dbUserId;

  try {
    await prisma.$transaction(async (tx) => {
      // 소유권 이전은 "현재 개설자가 oldOwner일 때만" 조건부로 수행한다.
      // (소유자 확인이 트랜잭션 밖이라, 가드 없이 update하면 동시 양도가 끼어들어
      //  먼저 개설자가 된 멤버가 신청행까지 삭제된 채 라인업에서 사라질 수 있다.)
      const updated = await tx.club.updateMany({
        where: { id, ownerUserId: oldOwnerId },
        data: { ownerUserId: newOwnerId },
      });
      if (updated.count === 0) {
        // 이미 다른 양도가 처리됨 → 전체 롤백
        throw new Error("TRANSFER_CONFLICT");
      }
      // 새 개설자는 ownerUserId로 표현되므로 신청 행은 제거(라인업·멤버수 중복 방지).
      // deleteMany로 0건이어도 throw하지 않게 한다.
      await tx.clubApplication.deleteMany({ where: { id: app.id } });
      // 기존 개설자는 일반 멤버로 남긴다.
      await tx.clubApplication.upsert({
        where: { clubId_userId: { clubId: id, userId: oldOwnerId } },
        update: { status: "accepted" },
        create: { clubId: id, userId: oldOwnerId, status: "accepted" },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "TRANSFER_CONFLICT") {
      return NextResponse.json(
        { ok: false, error: "이미 처리됐거나 개설자가 바뀌었어요. 새로고침 후 다시 시도해주세요." },
        { status: 409 },
      );
    }
    throw e;
  }

  // 새 개설자 알림 (best-effort)
  try {
    await createNotification({
      userId: newOwnerId,
      type: "club_ownership_received",
      title: "동아리장이 되었어요 👑",
      body: `'${club.name}'의 동아리장이 되었어요. 이제 모임 공지·멤버 관리를 할 수 있어요.`,
      link: `/clubs/${id}`,
    });
  } catch {
    /* best-effort */
  }
  // 소유권 이전은 중요 변이 — 감사 기록
  try {
    await recordAudit({
      actor: user,
      action: "club_transfer",
      targetType: "club",
      targetId: id,
      summary: `'${club.name}' 동아리장 양도`,
      ip: getClientIp(req),
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
