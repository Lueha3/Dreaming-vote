import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const NICKNAME_RE = /^(러비아|유디코)-\d{2}-.+$/;

const schema = z.object({
  nickname: z.string().regex(NICKNAME_RE, "올바른 형식이 아닙니다."),
});

/** PATCH /api/my/profile — 닉네임 업데이트 */
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.dbUserId },
    data: { nickname: parsed.data.nickname },
  });

  return NextResponse.json({ ok: true });
}
