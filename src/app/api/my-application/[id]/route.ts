import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

/**
 * Contact 정규화: 이메일은 소문자, 전화번호는 숫자만 추출
 */
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // 이메일 형식인지 확인
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // 전화번호: 모든 숫자가 아닌 문자 제거 (공백, 하이픈, 괄호 등)
  return trimmed.replace(/\D/g, "");
}

const patchSchema = z.object({
  contact: z.string().min(1, "contact는 필수입니다."),
  name: z.string().optional(),
  message: z.string().optional(),
});

const deleteSchema = z.object({
  contact: z.string().min(1, "contact는 필수입니다."),
});

// PATCH /api/my-application/[id]
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("PATCH /api/my-application/[id]");

    const resolvedParams = await context.params;
    const applicationId = resolvedParams?.id;

    if (!applicationId) {
      return NextResponse.json(
        { ok: false, error: "applicationId가 필요합니다." },
        { status: 400 },
      );
    }

    // 1. 입력값 검증
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

    // 2. Contact 정규화
    const contactNormalized = normalizeContact(contact);

    // 3. 신청 내역 조회 및 권한 확인
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return NextResponse.json(
        { ok: false, error: "신청 내역을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    // 4. Contact 일치 확인
    if (application.contact !== contactNormalized) {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 },
      );
    }

    // 5. 업데이트 (name, message만)
    const updated = await prisma.application.update({
      where: { id: applicationId },
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
        contact: updated.contact,
        name: updated.name,
        message: updated.message,
        createdAt: updated.createdAt,
        updatedAt: updated.createdAt,
      },
    });
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("PATCH /api/my-application/[id] failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/my-application/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } | { params: { id: string } },
) {
  try {
    console.log("DELETE /api/my-application/[id]");

    const resolvedParams = await context.params;
    const applicationId = resolvedParams?.id;

    if (!applicationId) {
      return NextResponse.json(
        { ok: false, error: "applicationId가 필요합니다." },
        { status: 400 },
      );
    }

    // 1. 입력값 검증
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

    // 2. Contact 정규화
    const contactNormalized = normalizeContact(contact);

    // 3. 트랜잭션으로 삭제 및 appliedCount 감소
    await prisma.$transaction(async (tx) => {
      // 3-1. 신청 내역 조회 및 권한 확인
      const application = await tx.application.findUnique({
        where: { id: applicationId },
        include: {
          recruitment: true,
        },
      });

      if (!application) {
        throw new Error("NOT_FOUND");
      }

      // 3-2. Contact 일치 확인
      if (application.contact !== contactNormalized) {
        throw new Error("FORBIDDEN");
      }

      // 3-3. 신청 내역 삭제
      await tx.application.delete({
        where: { id: applicationId },
      });

      // 3-4. appliedCount 감소 (0 이하로 내려가지 않도록)
      const currentCount = await tx.application.count({
        where: { recruitmentId: application.recruitmentId },
      });

      await tx.recruitment.update({
        where: { id: application.recruitmentId },
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
      // 커스텀 에러 처리
      switch (e.message) {
        case "NOT_FOUND":
          return NextResponse.json(
            { ok: false, error: "신청 내역을 찾을 수 없습니다." },
            { status: 404 },
          );
        case "FORBIDDEN":
          return NextResponse.json(
            { ok: false, error: "FORBIDDEN" },
            { status: 403 },
          );
      }
    }

    // Log error message only (no PII)
    const errorMsg = e instanceof Error ? e.message : String(e);
    console.error("DELETE /api/my-application/[id] failed:", errorMsg);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}

