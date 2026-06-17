import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * POST /api/admin/prompts/[id]/activate
 * 해당 버전을 활성화 (기존 활성 버전은 비활성화)
 */
export async function POST(_req: Request, { params }: Params) {
  if (!(await hasAdminAreaAccess("admin"))) {
    return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
  }

  const { id } = params instanceof Promise ? await params : params;

  await prisma.$transaction([
    prisma.promptVersion.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.promptVersion.update({ where: { id }, data: { isActive: true } }),
  ]);

  return NextResponse.json({ ok: true });
}
