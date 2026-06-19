import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { getClubDetail } from "@/lib/clubDetail";
import { clubPatchSchema } from "@/lib/clubSchema";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/clubs/[id]
 * 동아리 상세 (공개) — 승인+활성 동아리만 노출. 개설자 본인은 승인 전/숨김도 조회 가능.
 *
 * 읽기·게이팅 로직은 getClubDetail(lib/clubDetail.ts)로 단일화돼 있다(상세 페이지 RSC와 공유).
 * 이 라우트는 동일 계약을 유지하기 위한 얇은 래퍼 — null이면 404, 비개설자 조회 시 viewCount +1.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  const data = await getClubDetail(id, user);

  if (!data) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }

  // 조회수 증가 (개설자 본인 조회는 제외) — 실패해도 무시.
  // ?prefill=1(수정 폼 prefill 등)은 '조회'가 아니므로 증가시키지 않는다.
  const isPrefill = new URL(req.url).searchParams.get("prefill") === "1";
  if (!data.isOwner && !isPrefill) {
    prisma.club.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  return NextResponse.json({ ok: true, ...data });
}

/**
 * PATCH /api/clubs/[id]
 * 동아리 정보 수정 — 개설자 본인 또는 운영진(staff+)만.
 * 부분 수정(clubPatchSchema): 보낸 필드만 갱신. images는 보내면 전체 교체, 생략하면 유지.
 * 승인 상태(isApproved)는 건드리지 않는다(이미 공개된 동아리의 오탈자·소개 수정이 흔하므로
 * 재승인을 강제하지 않음 — 남용은 운영진 숨김·감사로 대응).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      ownerUserId: true,
      category: true,
      tags: true,
      _count: { select: { applications: { where: { status: "accepted" } } } },
    },
  });
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }

  const isOwner = club.ownerUserId === user.dbUserId;
  if (!isOwner && !hasAtLeast(user.role, "staff")) {
    return NextResponse.json({ ok: false, error: "수정 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = clubPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "입력값 오류", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  // 정원을 현재 멤버 수보다 작게 낮출 수 없다.
  if (d.maxMembers != null && d.maxMembers < club._count.applications) {
    return NextResponse.json(
      {
        ok: false,
        error: `현재 멤버가 ${club._count.applications}명이라 정원을 그보다 작게 정할 수 없어요.`,
      },
      { status: 409 },
    );
  }

  // 매칭 입력(카테고리/키워드)이 바뀌면 기존 추천 캐시는 stale → 무효화 대상.
  const matchInputChanged =
    (d.category !== undefined && d.category !== club.category) ||
    (d.tags !== undefined && d.tags !== club.tags);
  const replaceImages = d.images !== undefined;

  await prisma.$transaction(async (tx) => {
    await tx.club.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.description !== undefined && { description: d.description }),
        ...(d.category !== undefined && { category: d.category }),
        ...(d.tags !== undefined && { tags: d.tags }),
        ...(d.maxMembers !== undefined && { maxMembers: d.maxMembers ?? null }),
      },
    });

    // 이미지 전체 교체(원자적) — 기존 개설 경로의 비원자성도 여기선 트랜잭션으로 해소.
    if (replaceImages) {
      await tx.clubImage.deleteMany({ where: { clubId: id } });
      if (d.images!.length > 0) {
        await tx.clubImage.createMany({
          data: d.images!.map((img) => ({
            clubId: id,
            url: img.url,
            caption: img.caption,
            order: img.order,
          })),
        });
      }
    }

    if (matchInputChanged) {
      await tx.clubRecommendation.deleteMany({ where: { clubId: id } });
    }
  });

  // best-effort 감사 (운영진의 타 동아리 수정은 별도 표기)
  try {
    await recordAudit({
      actor: user,
      action: "club_update",
      targetType: "club",
      targetId: id,
      summary: isOwner ? "동아리 정보 수정" : "동아리 정보를 운영 권한으로 수정",
      ip: getClientIp(req),
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true });
}
