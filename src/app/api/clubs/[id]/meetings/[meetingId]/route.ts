import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string; meetingId: string }> | { id: string; meetingId: string };
};

const patchSchema = z.object({
  title: z.string().trim().min(1).max(60).optional(),
  meetsAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
  place: z.string().trim().min(1).max(100).optional(),
  items: z.string().trim().max(200).nullable().optional(),
  fee: z.string().trim().max(50).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

/** 개설자 검증 — 통과 시 null, 실패 시 에러 응답 */
async function ownerGate(clubId: string, meetingId: string) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  const meeting = await prisma.clubMeeting.findUnique({
    where: { id: meetingId },
    select: { clubId: true, club: { select: { ownerUserId: true } } },
  });
  if (!meeting || meeting.clubId !== clubId) {
    return NextResponse.json({ ok: false, error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }
  if (meeting.club.ownerUserId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "개설자만 수정할 수 있어요." }, { status: 403 });
  }
  return null;
}

/** PATCH /api/clubs/[id]/meetings/[meetingId] — 모임 공지 수정 (개설자만) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id, meetingId } = params instanceof Promise ? await params : params;

  const denied = await ownerGate(id, meetingId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "입력값을 확인해주세요." }, { status: 400 });
  }

  const { meetsAt, ...rest } = parsed.data;
  await prisma.clubMeeting.update({
    where: { id: meetingId },
    data: { ...rest, ...(meetsAt ? { meetsAt: new Date(meetsAt) } : {}) },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/clubs/[id]/meetings/[meetingId] — 모임 공지 삭제 (개설자만) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, meetingId } = params instanceof Promise ? await params : params;

  const denied = await ownerGate(id, meetingId);
  if (denied) return denied;

  await prisma.clubMeeting.delete({ where: { id: meetingId } });
  return NextResponse.json({ ok: true });
}
