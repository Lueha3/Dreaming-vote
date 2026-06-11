import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string; appId: string }> | { id: string; appId: string };
};

const actionSchema = z.object({ action: z.enum(["accept", "reject"]) });

/**
 * POST /api/clubs/[id]/applications/[appId]
 * 가입 신청 수락/반려 (개설자 본인만). body: { action: "accept" | "reject" }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const { id, appId } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { action } = parsed.data;

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      id: true,
      ownerUserId: true,
      maxMembers: true,
      _count: { select: { applications: { where: { status: "accepted" } } } },
    },
  });
  if (!club) {
    return NextResponse.json({ ok: false, error: "동아리를 찾을 수 없습니다." }, { status: 404 });
  }
  if (club.ownerUserId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });
  }

  const app = await prisma.clubApplication.findUnique({
    where: { id: appId },
    select: { id: true, clubId: true, status: true },
  });
  if (!app || app.clubId !== id) {
    return NextResponse.json({ ok: false, error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }

  if (action === "accept") {
    // 이미 수락된 건 그대로
    if (app.status !== "accepted" && club.maxMembers && club._count.applications >= club.maxMembers) {
      return NextResponse.json({ ok: false, error: "정원이 가득 찼습니다." }, { status: 409 });
    }
    await prisma.clubApplication.update({ where: { id: appId }, data: { status: "accepted" } });
  } else {
    await prisma.clubApplication.update({ where: { id: appId }, data: { status: "rejected" } });
  }

  return NextResponse.json({ ok: true });
}
