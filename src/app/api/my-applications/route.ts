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

// GET /api/my-applications?contact=...
export async function GET(req: NextRequest) {
  try {
    console.log("GET /api/my-applications");

    const searchParams = req.nextUrl.searchParams;
    const contact = searchParams.get("contact");

    if (!contact) {
      return NextResponse.json(
        { ok: false, error: "contact 파라미터가 필요합니다." },
        { status: 400 },
      );
    }

    const contactNormalized = normalizeContact(contact);

    const applications = await prisma.application.findMany({
      where: {
        contact: contactNormalized,
      },
      include: {
        recruitment: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      ok: true,
      items: applications.map((app) => ({
        id: app.id,
        recruitmentId: app.recruitmentId,
        recruitment: {
          id: app.recruitment.id,
          title: app.recruitment.title,
          status: app.recruitment.status,
        },
        name: app.name,
        message: app.message,
        appliedAt: app.createdAt,
      })),
    });
  } catch (e: any) {
    // Log error message only (no PII like contact)
    console.error("GET /api/my-applications failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}

