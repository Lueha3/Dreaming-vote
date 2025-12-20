import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CHURCH_CODE = process.env.CHURCH_CODE;

// POST /api/admin/recruitments/[id]/status
// 모집글 상태 변경 (open/closed)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("POST /api/admin/recruitments/[id]/status");

    if (!ADMIN_SECRET) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_SECRET 이 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    if (!CHURCH_CODE) {
      return NextResponse.json(
        { ok: false, error: "CHURCH_CODE 가 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    // Next.js 16: params may be a Promise
    const resolvedParams =
      context.params instanceof Promise ? await context.params : context.params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    // 쿠키에서 admin session 확인
    const adminSession = req.cookies.get("admin_session")?.value;
    
    if (adminSession !== "1") {
      return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
    }

    const bodyData = body as { status?: string };

    const { status } = bodyData;

    if (status !== "open" && status !== "closed") {
      return NextResponse.json(
        { ok: false, error: "status는 'open' 또는 'closed'여야 합니다." },
        { status: 400 },
      );
    }

    const recruitment = await prisma.recruitment.findUnique({
      where: { id },
    });

    if (!recruitment) {
      return NextResponse.json(
        { ok: false, error: "해당 모집글을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // Ensure churchCode match
    if (recruitment.churchCode !== CHURCH_CODE) {
      return NextResponse.json(
        { ok: false, error: "해당 모집글에 접근할 수 없습니다." },
        { status: 403 },
      );
    }

    const updated = await prisma.recruitment.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        status: updated.status,
      },
    });
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("POST /api/admin/recruitments/[id]/status failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

