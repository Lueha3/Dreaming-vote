import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/**
 * 신청 목록 응답 포맷
 */
function formatApplications(applications: any[]) {
  return applications.map((app) => ({
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
  }));
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

    try {
      // 먼저 contactNormalized로 조회 시도
      const applications = await prisma.application.findMany({
        where: {
          contactNormalized,
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
        items: formatApplications(applications),
      });
    } catch (prismaError: any) {
      // P2022: 컬럼이 존재하지 않음 - contact 필드로 fallback
      const isPrismaError = prismaError instanceof Prisma.PrismaClientKnownRequestError;
      const isMissingColumn = 
        isPrismaError && prismaError.code === "P2022" ||
        prismaError?.message?.includes("contactNormalized") ||
        prismaError?.message?.includes("does not exist");

      if (isMissingColumn) {
        console.warn("contactNormalized column missing, falling back to contact field");
        
        // contact 필드로 fallback 조회
        const applications = await prisma.application.findMany({
          where: {
            contact: {
              contains: contactNormalized,
              mode: "insensitive",
            },
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
          items: formatApplications(applications),
          fallback: true,
        });
      }

      // 다른 Prisma 에러는 다시 throw
      throw prismaError;
    }
  } catch (e: any) {
    // Log error message only (no PII like contact)
    console.error("GET /api/my-applications failed:", e?.message ?? "Unknown error");
    // 사용자에게는 일반적인 메시지만 표시 (DB 상세 에러 숨김)
    return NextResponse.json(
      { ok: false, error: "조회 실패. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}

