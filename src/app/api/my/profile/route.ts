import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * PATCH /api/my/profile — 닉네임 / 프로필 사진 업데이트
 * 닉네임은 승인된 멤버만 변경 가능.
 * 프로필 사진은 로그인만으로 변경 가능.
 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data: { nickname?: string; avatarUrl?: string } = {};

  if (parsed.data.nickname) {
    const gate = membershipGate(user);
    if (gate) return gate;

    data.nickname = parsed.data.nickname;
  }

  if (parsed.data.avatarUrl) data.avatarUrl = parsed.data.avatarUrl;

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: user.dbUserId }, data });
  }

  return NextResponse.json({ ok: true });
}
