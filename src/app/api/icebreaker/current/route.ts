import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWeekMonday } from "@/lib/week";

/** GET /api/icebreaker/current — 이번 주 아이스브레이커 질문(없으면 null). 공개(로그인 불필요). */
export async function GET() {
  const weekOf = getWeekMonday(new Date());
  const prompt = await prisma.icebreakerPrompt.findUnique({
    where: { weekOf },
    select: { id: true, question: true, _count: { select: { answers: true } } },
  });

  if (!prompt) return NextResponse.json({ ok: true, prompt: null });

  return NextResponse.json({
    ok: true,
    prompt: { id: prompt.id, question: prompt.question, answerCount: prompt._count.answers },
  });
}
