import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> | { id: string } };

const createSchema = z.object({
  content: z.string().trim().min(1, "댓글을 입력해주세요.").max(500, "댓글이 너무 깁니다."),
});

/** GET /api/prayers/[id]/comments — 댓글 목록 (공개) */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();

  const prayer = await prisma.prayer.findUnique({ where: { id }, select: { userId: true } });
  if (!prayer) return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });

  const comments = await prisma.prayerComment.findMany({
    where: { prayerId: id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: {
      id: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { nickname: true, avatarUrl: true, role: true } },
    },
  });

  const isStaff = !!user && hasAtLeast(user.role, "staff");
  const items = comments.map((c) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt,
    authorName: c.user?.nickname ?? "탈퇴한 멤버",
    authorAvatar: c.user?.avatarUrl ?? null,
    authorRole: c.user?.role ?? null,
    isMine: !!user && c.userId === user.dbUserId,
    // 작성자 본인 · 글쓴이(글 모더레이션) · 운영진+ 가 삭제 가능
    canDelete:
      !!user && (c.userId === user.dbUserId || prayer.userId === user.dbUserId || isStaff),
  }));

  return NextResponse.json({ ok: true, items, loggedIn: !!user });
}

/** POST /api/prayers/[id]/comments — 댓글 작성 (승인 멤버만) */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 20 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  const prayer = await prisma.prayer.findUnique({ where: { id }, select: { id: true } });
  if (!prayer) return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().fieldErrors.content?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }

  const comment = await prisma.prayerComment.create({
    data: { prayerId: id, userId: user.dbUserId, content: parsed.data.content },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: comment.id });
}
