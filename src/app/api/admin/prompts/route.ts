import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasAdminAreaAccess } from "@/lib/manageAuth";

/** GET /api/admin/prompts — 버전 목록 */
export async function GET() {
  if (!(await hasAdminAreaAccess("admin"))) return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });

  const items = await prisma.promptVersion.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, items });
}

/** POST /api/admin/prompts — 새 버전 생성 */
export async function POST(req: NextRequest) {
  if (!(await hasAdminAreaAccess("admin"))) return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { version, content, notes } = body as { version?: string; content?: string; notes?: string };

  if (!version?.trim() || !content?.trim()) {
    return NextResponse.json({ ok: false, error: "version과 content는 필수입니다." }, { status: 400 });
  }

  const item = await prisma.promptVersion.create({
    data: { version: version.trim(), content: content.trim(), notes: notes?.trim() },
  });

  return NextResponse.json({ ok: true, item });
}
