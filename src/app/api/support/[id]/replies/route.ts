import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate, type AuthUser } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> | { id: string } };

const createSchema = z.object({
  content: z.string().trim().min(1, "답글을 입력해주세요.").max(2000, "답글이 너무 깁니다."),
});

/**
 * 요청자가 이 문의를 볼 권한이 있는지 — GET /api/support의 목록 노출 규칙과 동일해야 한다.
 * 어긋나면 목록에서는 안 보이던 비밀글의 답글을 URL만 알면 읽을 수 있는 구멍이 생긴다.
 */
function canSeeTicket(ticket: { userId: string; isSecret: boolean }, user: AuthUser | null): boolean {
  if (!user) return false;
  if (hasAtLeast(user.role, "staff")) return true;
  if (ticket.userId === user.dbUserId) return true;
  if (ticket.isSecret) return false;
  return user.membershipStatus === "approved";
}

/** GET /api/support/[id]/replies — 문의에 달린 운영진 답글 목록. */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    select: { userId: true, isSecret: true },
  });
  if (!ticket) return NextResponse.json({ ok: false, error: "문의를 찾을 수 없습니다." }, { status: 404 });

  // 비밀글을 볼 권한이 없으면 문의 자체가 없는 것처럼 404 — 403은 "존재는 한다"를 알려준다.
  if (!canSeeTicket(ticket, user)) {
    return NextResponse.json({ ok: false, error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const isStaff = !!user && hasAtLeast(user.role, "staff");

  const replies = await prisma.supportReply.findMany({
    where: { ticketId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      content: true,
      createdAt: true,
      staffId: true,
      staff: { select: { nickname: true } },
    },
  });

  const items = replies.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.createdAt,
    // 문의 당사자에게는 항상 "운영진"으로만 — 개별 운영진이 답변 때문에 특정 민원의
    // 표적이 되지 않도록 한다. 운영진끼리는 서로 조율할 수 있어야 하니 실명을 보여준다.
    staffName: isStaff ? (r.staff?.nickname ?? "탈퇴한 운영진") : "운영진",
    canDelete: isStaff,
  }));

  return NextResponse.json({ ok: true, items });
}

/** POST /api/support/[id]/replies — 답글 작성(운영진 전용). */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const ip = getClientIp(req);
  if (!checkRateLimit(`support-reply:${ip}`, { windowMs: 60_000, max: 20 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id }, select: { userId: true } });
  if (!ticket) return NextResponse.json({ ok: false, error: "문의를 찾을 수 없습니다." }, { status: 404 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().fieldErrors.content?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }

  const reply = await prisma.supportReply.create({
    data: { ticketId: id, staffId: user!.dbUserId, content: parsed.data.content },
    select: { id: true },
  });

  // 문의 작성자에게 알림 — best-effort. 어떤 운영진이 답했는지는 알리지 않는다(위와 동일 원칙).
  try {
    await createNotification({
      userId: ticket.userId,
      type: "support_reply",
      title: "내 고객센터 문의에 답글이 달렸어요",
      body: "운영진이 답변을 남겼어요.",
      link: `/support#${id}`,
    });
  } catch {
    /* best-effort */
  }

  return NextResponse.json({ ok: true, id: reply.id });
}
