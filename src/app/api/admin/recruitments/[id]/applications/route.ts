import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CHURCH_CODE = process.env.CHURCH_CODE;

// GET /api/admin/recruitments/[id]/applications
// 모집글의 신청자 목록 조회
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("GET /api/admin/recruitments/[id]/applications");

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

    // 쿠키에서 admin session 확인
    const adminSession = req.cookies.get("admin_session")?.value;
    
    if (adminSession !== "1") {
      return NextResponse.json({ ok: false, error: "NOT_ADMIN" }, { status: 401 });
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

    // 모집글 존재 확인
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

    // 신청자 목록 조회
    const applications = await prisma.application.findMany({
      where: { recruitmentId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        contact: true,
        name: true,
        message: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      items: applications.map((app) => ({
        id: app.id,
        contact: app.contact,
        name: app.name,
        message: app.message,
        createdAt: app.createdAt,
      })),
    });
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("GET /api/admin/recruitments/[id]/applications failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

