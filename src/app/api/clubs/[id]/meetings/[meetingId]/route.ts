import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { getClubMembership } from "@/lib/clubAccess";
import type { Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/storage";

type Params = {
  params: Promise<{ id: string; meetingId: string }> | { id: string; meetingId: string };
};

/**
 * GET /api/clubs/[id]/meetings/[meetingId]
 * 모임 상세(일정 + 후기 + 갤러리) — 동아리 멤버에게만 공개.
 * 각 후기/사진의 canDelete는 작성자/업로더 또는 개설자 여부로 서버에서 판정(PII 미노출).
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id, meetingId } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  const { club, isOwner, isMember } = await getClubMembership(id, user?.dbUserId ?? null);

  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }
  if (!isMember) {
    return NextResponse.json(
      { ok: false, code: "member_only", error: "모임 상세는 동아리 멤버에게만 공개돼요." },
      { status: 403 },
    );
  }

  const meeting = await prisma.clubMeeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      clubId: true,
      title: true,
      meetsAt: true,
      place: true,
      items: true,
      fee: true,
      note: true,
      reviews: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          userId: true,
          user: { select: { nickname: true, avatarUrl: true, role: true } },
        },
      },
      images: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, url: true, caption: true, userId: true },
      },
      rsvps: {
        orderBy: { createdAt: "asc" },
        select: {
          userId: true,
          status: true,
          user: { select: { nickname: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!meeting || meeting.clubId !== id) {
    return NextResponse.json({ ok: false, error: "모임을 찾을 수 없습니다." }, { status: 404 });
  }

  const me = user?.dbUserId ?? null;

  const going = meeting.rsvps.filter((r) => r.status === "going");
  const maybe = meeting.rsvps.filter((r) => r.status === "maybe");
  const myStatus = me ? meeting.rsvps.find((r) => r.userId === me)?.status ?? null : null;

  return NextResponse.json({
    ok: true,
    isOwner,
    isMember,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      meetsAt: meeting.meetsAt,
      place: meeting.place,
      items: meeting.items,
      fee: meeting.fee,
      note: meeting.note,
    },
    reviews: meeting.reviews.map((r) => ({
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      authorNickname: r.user?.nickname ?? null,
      authorAvatarUrl: r.user?.avatarUrl ?? null,
      authorRole: (r.user?.role ?? null) as Role | null,
      canDelete: isOwner || (!!me && r.userId === me),
      // 수정은 본인 후기만 — 개설자 권한과 분리
      canEdit: !!me && r.userId === me,
    })),
    images: meeting.images.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.caption,
      canDelete: isOwner || (!!me && img.userId === me),
    })),
    rsvp: {
      myStatus,
      goingCount: going.length,
      maybeCount: maybe.length,
      // 참석자 아바타 줄 — 너무 길지 않게 going 우선 최대 12명 표시.
      going: going.slice(0, 12).map((r) => ({
        nickname: r.user?.nickname ?? null,
        avatarUrl: r.user?.avatarUrl ?? null,
      })),
    },
  });
}

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

  // cascade로 함께 삭제될 갤러리 사진의 스토리지 객체를 정리(고아 방지) — best-effort.
  const images = await prisma.clubMeetingImage.findMany({
    where: { meetingId },
    select: { url: true },
  });

  await prisma.clubMeeting.delete({ where: { id: meetingId } });

  if (images.length > 0) {
    const supabase = await createClient();
    await removeStorageObjects(supabase, "club-images", images.map((im) => im.url));
  }

  return NextResponse.json({ ok: true });
}
