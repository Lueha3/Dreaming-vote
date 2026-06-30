import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getClubMembership } from "@/lib/clubAccess";
import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/storage";

type Params = {
  params:
    | Promise<{ id: string; meetingId: string; imageId: string }>
    | { id: string; meetingId: string; imageId: string };
};

/**
 * DELETE /api/clubs/[id]/meetings/[meetingId]/images/[imageId]
 * 모임 갤러리 사진 삭제 — 업로더 본인 또는 개설자만. (Storage 객체는 보존 — DB 행만 제거)
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, meetingId, imageId } = params instanceof Promise ? await params : params;

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

  const image = await prisma.clubMeetingImage.findUnique({
    where: { id: imageId },
    select: { userId: true, url: true, meetingId: true, meeting: { select: { clubId: true } } },
  });
  if (!image || image.meetingId !== meetingId || image.meeting.clubId !== id) {
    return NextResponse.json({ ok: false, error: "사진을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!isOwner && image.userId !== user.dbUserId) {
    return NextResponse.json(
      { ok: false, error: "업로더 또는 개설자만 삭제할 수 있어요." },
      { status: 403 },
    );
  }

  await prisma.clubMeetingImage.delete({ where: { id: imageId } });

  // 스토리지 객체도 정리(고아 방지) — best-effort.
  const supabase = await createClient();
  await removeStorageObjects(supabase, "club-images", [image.url]);

  return NextResponse.json({ ok: true });
}
