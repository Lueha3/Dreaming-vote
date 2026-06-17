import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> | { id: string } };

const patchSchema = z.object({
  isAnswered: z.boolean(),
  answeredNote: z.string().trim().max(300).optional(),
});

/** PATCH /api/prayers/[id] — 응답됨 표시 (작성자만) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const prayer = await prisma.prayer.findUnique({ where: { id }, select: { userId: true } });
  if (!prayer) return NextResponse.json({ ok: false, error: "기도제목을 찾을 수 없습니다." }, { status: 404 });
  if (prayer.userId !== user.dbUserId)
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "입력값 오류" }, { status: 400 });

  await prisma.prayer.update({
    where: { id },
    data: {
      isAnswered: parsed.data.isAnswered,
      answeredNote: parsed.data.isAnswered ? parsed.data.answeredNote ?? null : null,
      answeredAt: parsed.data.isAnswered ? new Date() : null,
    },
  });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/prayers/[id] — 삭제 (작성자 또는 운영진+ 모더레이션) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  if (!checkRateLimit(`del:${user.dbUserId}`, { windowMs: 60_000, max: 30 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const prayer = await prisma.prayer.findUnique({ where: { id }, select: { userId: true } });
  if (!prayer) return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  if (prayer.userId !== user.dbUserId && !hasAtLeast(user.role, "staff"))
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  // 첨부 이미지·댓글·반응은 onDelete: Cascade로 함께 정리됨 (스토리지 객체는 best-effort 미삭제)
  await prisma.prayer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
