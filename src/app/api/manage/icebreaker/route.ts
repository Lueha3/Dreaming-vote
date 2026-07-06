import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";
import { getWeekMonday } from "@/lib/week";

const schema = z.object({
  question: z.string().trim().min(1, "질문을 입력해주세요.").max(200, "질문이 너무 길어요."),
});

/**
 * GET /api/manage/icebreaker — 운영진+ : 최근 8주 질문 목록(이번 주가 맨 위).
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const rows = await prisma.icebreakerPrompt.findMany({
    orderBy: { weekOf: "desc" },
    take: 8,
    select: {
      id: true,
      weekOf: true,
      question: true,
      createdBy: { select: { nickname: true } },
      _count: { select: { answers: true } },
    },
  });

  const items = rows.map((r) => ({
    id: r.id,
    weekOf: r.weekOf.toISOString(),
    question: r.question,
    createdByNickname: r.createdBy?.nickname ?? null,
    answerCount: r._count.answers,
  }));

  return NextResponse.json({ ok: true, items, thisWeek: getWeekMonday(new Date()).toISOString() });
}

/**
 * POST /api/manage/icebreaker — 운영진+ : 이번 주 질문 설정(있으면 덮어쓰기).
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const weekOf = getWeekMonday(new Date());
  const saved = await prisma.icebreakerPrompt.upsert({
    where: { weekOf },
    update: { question: parsed.data.question, createdById: user!.dbUserId },
    create: { weekOf, question: parsed.data.question, createdById: user!.dbUserId },
    select: { id: true, weekOf: true, question: true },
  });

  return NextResponse.json({ ok: true, item: { ...saved, weekOf: saved.weekOf.toISOString() } });
}
