import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getClubMembership } from "@/lib/clubAccess";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = {
  params: Promise<{ id: string; meetingId: string }> | { id: string; meetingId: string };
};

const schema = z.object({ status: z.enum(["going", "maybe", "none"]) });

/**
 * POST /api/clubs/[id]/meetings/[meetingId]/rsvp
 * 모임 참석 표시 토글 — 동아리 멤버만. body: { status: "going" | "maybe" | "none" }
 * none이면 RSVP 삭제, going/maybe면 upsert.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id, meetingId } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  // 토글 처닝 방지 — 유저 단위 한도.
  if (!checkRateLimit(`rsvp:${user.dbUserId}`, { windowMs: 60_000, max: 60 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { isMember } = await getClubMembership(id, user.dbUserId);
  if (!isMember) {
    return NextResponse.json(
      { ok: false, error: "동아리 멤버만 참석을 표시할 수 있어요." },
      { status: 403 },
    );
  }

  const meeting = await prisma.clubMeeting.findUnique({
    where: { id: meetingId },
    select: { id: true, clubId: true, meetsAt: true },
  });
  if (!meeting || meeting.clubId !== id) {
    return NextResponse.json({ ok: false, error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { status } = parsed.data;

  // 지난 모임엔 새 참석 표시 불가(이전 표시 취소는 허용).
  if (status !== "none" && meeting.meetsAt < new Date()) {
    return NextResponse.json({ ok: false, error: "이미 지난 모임이에요." }, { status: 409 });
  }

  if (status === "none") {
    await prisma.clubMeetingRsvp.deleteMany({ where: { meetingId, userId: user.dbUserId } });
  } else {
    await prisma.clubMeetingRsvp.upsert({
      where: { meetingId_userId: { meetingId, userId: user.dbUserId } },
      update: { status },
      create: { meetingId, userId: user.dbUserId, status },
    });
  }

  const [goingCount, maybeCount] = await Promise.all([
    prisma.clubMeetingRsvp.count({ where: { meetingId, status: "going" } }),
    prisma.clubMeetingRsvp.count({ where: { meetingId, status: "maybe" } }),
  ]);

  return NextResponse.json({
    ok: true,
    myStatus: status === "none" ? null : status,
    goingCount,
    maybeCount,
  });
}
