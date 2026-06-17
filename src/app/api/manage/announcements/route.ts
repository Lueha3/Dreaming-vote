import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(120, "제목이 너무 길어요."),
  body: z.string().trim().min(1, "내용을 입력해주세요.").max(5000, "내용이 너무 길어요."),
  isPinned: z.boolean().optional(),
  isPublished: z.boolean().optional(),
});

/**
 * GET /api/manage/announcements — 운영진+ : 전체 공지(미게시 초안 포함), 고정 우선 최신순.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const rows = await prisma.announcement.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      body: true,
      isPublished: true,
      isPinned: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { nickname: true } },
    },
  });

  const items = rows.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    isPublished: a.isPublished,
    isPinned: a.isPinned,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    authorNickname: a.author?.nickname ?? null,
  }));

  return NextResponse.json({ ok: true, viewerRole: user!.role, items });
}

/**
 * POST /api/manage/announcements — 운영진+ : 공지 작성.
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const created = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body,
      isPinned: parsed.data.isPinned ?? false,
      isPublished: parsed.data.isPublished ?? true,
      authorId: user!.dbUserId,
    },
    select: { id: true },
  });

  console.info(`[announcement-create] actor=${user!.dbUserId}(${user!.role}) id=${created.id}`);
  return NextResponse.json({ ok: true, id: created.id });
}
