import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGroup, NICKNAME_RE } from "@/lib/membership";

const schema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
});

/**
 * PATCH /api/my/profile — 닉네임 / 프로필 사진 업데이트
 * 닉네임("집단-나이-이름")은 집단 기도 접근·신원 표시의 근거라서:
 * - 승인된 멤버만 변경 가능
 * - 집단·나이 부분은 가입신청서의 검증된 나이와 일치해야 함 (이름 부분만 자유)
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

    const match = parsed.data.nickname.match(NICKNAME_RE);
    if (!match) {
      return NextResponse.json(
        { ok: false, error: "닉네임은 '집단-나이-이름' 형식이어야 해요. (예: 러비아-23-홍길동)" },
        { status: 400 },
      );
    }
    const claimedGroup = match[1];
    const claimedAge = parseInt(match[2], 10);
    const verifiedGroup = user.age != null ? getGroup(user.age) : null;
    if (!user.age || !verifiedGroup || claimedAge !== user.age || claimedGroup !== verifiedGroup) {
      return NextResponse.json(
        { ok: false, error: "집단과 나이는 가입 신청서 정보와 일치해야 해요. 이름 부분만 바꿀 수 있어요." },
        { status: 400 },
      );
    }
    data.nickname = parsed.data.nickname;
  }

  if (parsed.data.avatarUrl) data.avatarUrl = parsed.data.avatarUrl;

  if (Object.keys(data).length > 0) {
    await prisma.user.update({ where: { id: user.dbUserId }, data });
  }

  return NextResponse.json({ ok: true });
}
