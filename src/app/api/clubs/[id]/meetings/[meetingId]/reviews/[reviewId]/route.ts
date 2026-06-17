import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getClubMembership } from "@/lib/clubAccess";

type Params = {
  params:
    | Promise<{ id: string; meetingId: string; reviewId: string }>
    | { id: string; meetingId: string; reviewId: string };
};

/**
 * DELETE /api/clubs/[id]/meetings/[meetingId]/reviews/[reviewId]
 * 후기 삭제 — 작성자 본인 또는 개설자만.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, meetingId, reviewId } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  const { club, isOwner } = await getClubMembership(id, user.dbUserId);
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }

  const review = await prisma.clubMeetingReview.findUnique({
    where: { id: reviewId },
    select: { userId: true, meetingId: true, meeting: { select: { clubId: true } } },
  });
  if (!review || review.meetingId !== meetingId || review.meeting.clubId !== id) {
    return NextResponse.json({ ok: false, error: "후기를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!isOwner && review.userId !== user.dbUserId) {
    return NextResponse.json(
      { ok: false, error: "본인 또는 개설자만 삭제할 수 있어요." },
      { status: 403 },
    );
  }

  await prisma.clubMeetingReview.delete({ where: { id: reviewId } });
  return NextResponse.json({ ok: true });
}
