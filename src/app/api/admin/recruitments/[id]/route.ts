import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const CHURCH_CODE = process.env.CHURCH_CODE;

// Helper: Check admin session from cookie
function isAdmin(req: NextRequest): boolean {
  return req.cookies.get("admin_session")?.value === "1";
}

// PATCH /api/admin/recruitments/[id]
// Update recruitment (title, content, capacity, status only)
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("PATCH /api/admin/recruitments/[id]");

    if (!CHURCH_CODE) {
      return NextResponse.json(
        { ok: false, error: "CHURCH_CODE 가 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    if (!isAdmin(req)) {
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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const { title, content, capacity, status } = body as {
      title?: string;
      content?: string;
      capacity?: number;
      status?: string;
    };

    // Find existing recruitment
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

    // Build update data (only allowed fields)
    const updateData: {
      title?: string;
      content?: string;
      capacity?: number;
      status?: string;
    } = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return NextResponse.json(
          { ok: false, error: "제목은 빈 문자열일 수 없습니다." },
          { status: 400 },
        );
      }
      updateData.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string") {
        return NextResponse.json(
          { ok: false, error: "내용은 문자열이어야 합니다." },
          { status: 400 },
        );
      }
      updateData.content = content.trim();
    }

    if (capacity !== undefined) {
      if (typeof capacity !== "number" || capacity <= 0) {
        return NextResponse.json(
          { ok: false, error: "정원은 1 이상의 숫자여야 합니다." },
          { status: 400 },
        );
      }
      updateData.capacity = capacity;
    }

    if (status !== undefined) {
      if (status !== "open" && status !== "closed") {
        return NextResponse.json(
          { ok: false, error: "status는 'open' 또는 'closed'여야 합니다." },
          { status: 400 },
        );
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: "수정할 필드가 없습니다." },
        { status: 400 },
      );
    }

    const updated = await prisma.recruitment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        capacity: updated.capacity,
        status: updated.status,
        appliedCount: updated.appliedCount,
      },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("PATCH /api/admin/recruitments/[id] failed:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/recruitments/[id]
// Delete recruitment (only if no applications exist)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("DELETE /api/admin/recruitments/[id]");

    if (!CHURCH_CODE) {
      return NextResponse.json(
        { ok: false, error: "CHURCH_CODE 가 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    if (!isAdmin(req)) {
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

    // Find existing recruitment
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

    // Check if applications exist
    const applicationCount = await prisma.application.count({
      where: { recruitmentId: id },
    });

    if (applicationCount > 0) {
      return NextResponse.json(
        { ok: false, error: "신청자가 존재하여 글을 삭제할 수 없습니다." },
        { status: 400 },
      );
    }

    // Delete recruitment
    await prisma.recruitment.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("DELETE /api/admin/recruitments/[id] failed:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 },
    );
  }
}

// GET /api/admin/recruitments/[id]
// Get single recruitment for editing
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("GET /api/admin/recruitments/[id]");

    if (!CHURCH_CODE) {
      return NextResponse.json(
        { ok: false, error: "CHURCH_CODE 가 서버 환경에 설정되어 있지 않습니다." },
        { status: 500 },
      );
    }

    if (!isAdmin(req)) {
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

    return NextResponse.json({
      ok: true,
      item: {
        id: recruitment.id,
        title: recruitment.title,
        content: recruitment.content,
        capacity: recruitment.capacity,
        status: recruitment.status,
        appliedCount: recruitment.appliedCount,
      },
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/admin/recruitments/[id] failed:", errorMessage);
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: 500 },
    );
  }
}

