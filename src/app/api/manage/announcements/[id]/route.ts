import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> | { id: string } };

const updateSchema = z
  .object({
    title: z.string().trim().min(1, "제목을 입력해주세요.").max(120, "제목이 너무 길어요.").optional(),
    body: z.string().trim().min(1, "내용을 입력해주세요.").max(5000, "내용이 너무 길어요.").optional(),
    isPinned: z.boolean().optional(),
    isPublished: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "변경할 내용이 없습니다." });

/**
 * PATCH /api/manage/announcements/[id] — 운영진+ : 공지 수정(부분 갱신·게시/고정 토글).
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const { id } = params instanceof Promise ? await params : params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "공지를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.announcement.update({ where: { id }, data: parsed.data });
  console.info(`[announcement-update] actor=${user!.dbUserId}(${user!.role}) id=${id}`);
  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/manage/announcements/[id] — 운영진+ : 공지 삭제.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const { id } = params instanceof Promise ? await params : params;

  const existing = await prisma.announcement.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ ok: false, error: "공지를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.announcement.delete({ where: { id } });
  console.info(`[announcement-delete] actor=${user!.dbUserId}(${user!.role}) id=${id}`);
  return NextResponse.json({ ok: true });
}
