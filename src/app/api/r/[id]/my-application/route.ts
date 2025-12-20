import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contact 정규화: 이메일은 소문자, 전화번호는 숫자만 추출
 */
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }
  return trimmed.replace(/\D/g, "");
}

const patchSchema = z.object({
  contact: z.string().min(1, "contact는 필수입니다."),
  name: z.string().optional(),
  message: z.string().optional(),
});

// GET /api/r/[id]/my-application
// 현재 사용자의 신청 내역 조회 (recruitment_id + user_id + contact)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("GET /api/r/[id]/my-application");

    const resolvedParams = await context.params;
    const recruitmentId = resolvedParams?.id;

    if (!recruitmentId) {
      return NextResponse.json(
        { ok: false, error: "recruitmentId가 필요합니다." },
        { status: 400 },
      );
    }

    // 1. 사용자 인증 확인
    const userId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2. User 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 세션입니다." },
        { status: 401 },
      );
    }

    // 3. contact 파라미터 확인 (클라이언트에서 전달)
    const searchParams = req.nextUrl.searchParams;
    const contact = searchParams.get("contact");

    if (!contact) {
      return NextResponse.json({
        ok: true,
        item: null,
      });
    }

    // 4. contact 정규화
    const contactNormalized = normalizeContact(contact);

    // 5. Application 조회
    const application = await prisma.application.findUnique({
      where: {
        recruitmentId_contactNormalized: {
          recruitmentId,
          contactNormalized,
        },
      },
    });

    if (!application) {
      return NextResponse.json({
        ok: true,
        item: null,
      });
    }

    return NextResponse.json({
      ok: true,
      item: {
        id: application.id,
        recruitmentId: application.recruitmentId,
        contact: application.contactNormalized,
        name: application.name,
        message: application.message,
        createdAt: application.createdAt,
        updatedAt: application.createdAt,
      },
    });
  } catch (e: any) {
    console.error("GET /api/r/[id]/my-application failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/r/[id]/my-application
// 현재 사용자의 신청 내역 수정
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("PATCH /api/r/[id]/my-application");

    const resolvedParams = await context.params;
    const recruitmentId = resolvedParams?.id;

    if (!recruitmentId) {
      return NextResponse.json(
        { ok: false, error: "recruitmentId가 필요합니다." },
        { status: 400 },
      );
    }

    // 1. 사용자 인증 확인
    const userId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2. 입력값 검증
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "입력값 검증에 실패했습니다.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { contact, name, message } = parsed.data;

    // 3. User 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 세션입니다." },
        { status: 401 },
      );
    }

    // 4. contact 정규화
    const contactNormalized = normalizeContact(contact);

    // 5. Application 조회 및 권한 확인
    const application = await prisma.application.findUnique({
      where: {
        recruitmentId_contactNormalized: {
          recruitmentId,
          contactNormalized,
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { ok: false, error: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 6. 업데이트 (name, message만)
    const updated = await prisma.application.update({
      where: { id: application.id },
      data: {
        name: name !== undefined ? (name.trim() || null) : undefined,
        message: message !== undefined ? (message.trim() || null) : undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: updated.id,
        recruitmentId: updated.recruitmentId,
        contact: updated.contactNormalized,
        name: updated.name,
        message: updated.message,
        createdAt: updated.createdAt,
        updatedAt: updated.createdAt,
      },
    });
  } catch (e: any) {
    console.error("PATCH /api/r/[id]/my-application failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

const deleteSchema = z.object({
  contact: z.string().min(1, "contact는 필수입니다."),
});

// DELETE /api/r/[id]/my-application
// 현재 사용자의 신청 내역 삭제
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("DELETE /api/r/[id]/my-application");

    const resolvedParams = await context.params;
    const recruitmentId = resolvedParams?.id;

    if (!recruitmentId) {
      return NextResponse.json(
        { ok: false, error: "recruitmentId가 필요합니다." },
        { status: 400 },
      );
    }

    // 1. 사용자 인증 확인
    const userId = req.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요합니다." },
        { status: 401 },
      );
    }

    // 2. 입력값 검증
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const parsed = deleteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "입력값 검증에 실패했습니다.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { contact } = parsed.data;

    // 3. User 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "유효하지 않은 세션입니다." },
        { status: 401 },
      );
    }

    // 4. contact 정규화
    const contactNormalized = normalizeContact(contact);

    // 5. 트랜잭션으로 삭제 및 appliedCount 감소
    await prisma.$transaction(async (tx) => {
      // 5-1. Application 조회 및 권한 확인
      const application = await tx.application.findUnique({
        where: {
          recruitmentId_contactNormalized: {
            recruitmentId,
            contactNormalized,
          },
        },
        include: {
          recruitment: true,
        },
      });

      if (!application) {
        throw new Error("NOT_FOUND");
      }

      // 5-2. 신청 내역 삭제
      await tx.application.delete({
        where: { id: application.id },
      });

      // 5-3. appliedCount 감소 (0 이하로 내려가지 않도록)
      const currentCount = await tx.application.count({
        where: { recruitmentId },
      });

      await tx.recruitment.update({
        where: { id: recruitmentId },
        data: {
          appliedCount: Math.max(0, currentCount),
        },
      });
    });

    return NextResponse.json({
      ok: true,
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      switch (e.message) {
        case "NOT_FOUND":
          return NextResponse.json(
            { ok: false, error: "신청 내역을 찾을 수 없습니다." },
            { status: 404 },
          );
      }
    }

    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("DELETE /api/r/[id]/my-application failed:", errorMsg);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}

