import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminRequest } from "@/lib/adminAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

function requireAdmin(req: NextRequest) {
  return isAdminRequest(req);
}

/** PUT /api/admin/prompts/[id] — 수정 */
export async function PUT(req: NextRequest, { params }: Params) {
  if (!requireAdmin(req)) return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });

  const { id } = params instanceof Promise ? await params : params;
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { content, notes } = body as { content?: string; notes?: string };
  if (!content?.trim()) return NextResponse.json({ ok: false, error: "content는 필수입니다." }, { status: 400 });

  const item = await prisma.promptVersion.update({
    where: { id },
    data: { content: content.trim(), notes: notes?.trim() ?? null },
  });

  return NextResponse.json({ ok: true, item });
}

/** DELETE /api/admin/prompts/[id] — 삭제 (비활성 버전만) */
export async function DELETE(req: NextRequest, { params }: Params) {
  if (!requireAdmin(req)) return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });

  const { id } = params instanceof Promise ? await params : params;
  const item = await prisma.promptVersion.findUnique({ where: { id } });

  if (!item) return NextResponse.json({ ok: false, error: "찾을 수 없습니다." }, { status: 404 });
  if (item.isActive) return NextResponse.json({ ok: false, error: "활성 버전은 삭제할 수 없습니다." }, { status: 409 });

  await prisma.promptVersion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
