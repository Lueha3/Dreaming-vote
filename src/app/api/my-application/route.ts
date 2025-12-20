import { NextRequest, NextResponse } from "next/server";

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

// GET /api/my-application?recruitmentId=...&contact=...
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/my-application");

    const searchParams = req.nextUrl.searchParams;
    const recruitmentId = searchParams.get("recruitmentId");
    const contact = searchParams.get("contact");

    if (!recruitmentId) {
      return NextResponse.json(
        { ok: false, error: "recruitmentId 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    if (!contact) {
      return NextResponse.json(
        { ok: false, error: "contact 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const contactNormalized = normalizeContact(contact);

    // 신청 내역 조회 (unique by recruitmentId + contact)
    const application = await prisma.application.findUnique({
      where: {
        recruitmentId_contact: {
          recruitmentId,
          contact: contactNormalized,
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
        contact: application.contact,
        name: application.name,
        message: application.message,
        createdAt: application.createdAt,
        updatedAt: application.createdAt, // Application 모델에 updatedAt이 없으므로 createdAt 사용
      },
    });
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("GET /api/my-application failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

