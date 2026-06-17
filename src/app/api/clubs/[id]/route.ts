import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { getClubDetail } from "@/lib/clubDetail";

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

  // 조회수 증가 (개설자 본인 조회는 제외) — 실패해도 무시
  if (!data.isOwner) {
    prisma.club.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
  }

  return NextResponse.json({ ok: true, ...data });
}
