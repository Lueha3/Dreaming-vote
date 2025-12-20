import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";

const applySchema = z.object({
  recruitmentId: z.string().min(1, "recruitmentId 는 필수입니다."),
  contact: z.string().min(1, "contact는 필수입니다."),
  name: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Contact 정규화: 이메일은 소문자, 전화번호는 숫자만 추출
 */
function normalizeContact(contact: string): string {
  const trimmed = contact.trim();

  // 이메일 형식인지 확인 (간단한 체크)
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  // 전화번호: 모든 숫자가 아닌 문자 제거 (공백, 하이픈, 괄호 등)
  return trimmed.replace(/\D/g, "");
}

/**
 * Contact 유효성 검사
 */
function isValidContact(contact: string): boolean {
  const normalized = normalizeContact(contact);

  // 이메일 형식
  if (normalized.includes("@")) {
    // 간단한 이메일 형식 체크
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  // 전화번호: 최소 10자리 이상 (한국 전화번호 기준)
  return normalized.length >= 10;
}

// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/apply");

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

    const parsed = applySchema.safeParse(body);

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

    const { recruitmentId, contact, name, message } = parsed.data;

    // 2. Contact 정규화 및 유효성 검사
    const contactNormalized = normalizeContact(contact);

    if (!isValidContact(contactNormalized)) {
      return NextResponse.json(
        {
          ok: false,
          error: "유효한 이메일 또는 전화번호를 입력해주세요.",
          fieldErrors: { contact: ["유효한 이메일 또는 전화번호가 아닙니다."] },
        },
        { status: 400 },
      );
    }

    // 3. 비즈니스 규칙 검증 및 신청 생성 (트랜잭션)
    try {
      const result = await prisma.$transaction(async (tx) => {
        // 3-1. 모집글 존재/OPEN 여부 확인
        const recruitment = await tx.recruitment.findUnique({
          where: { id: recruitmentId },
        });

        if (!recruitment) {
          throw new Error("NOT_FOUND");
        }

        if (recruitment.status !== "open") {
          throw new Error("RECRUITMENT_CLOSED");
        }

        // 3-2. 중복 신청 확인
        const existingApplication = await tx.application.findUnique({
          where: {
            recruitmentId_contact: {
              recruitmentId,
              contact: contactNormalized,
            },
          },
        });

        if (existingApplication) {
          throw new Error("ALREADY_APPLIED");
        }

        // 3-3. 정원 확인 (실제 신청 수로 계산)
        const applicationCount = await tx.application.count({
          where: { recruitmentId },
        });

        if (applicationCount >= recruitment.capacity) {
          throw new Error("CAPACITY_FULL");
        }

        // 3-4. 신청 레코드 생성
        const application = await tx.application.create({
          data: {
            recruitmentId,
            contact: contactNormalized,
            name: name?.trim() || null,
            message: message?.trim() || null,
          },
        });

        // 3-5. appliedCount 업데이트 (실제 카운트로 재계산)
        const updatedRecruitment = await tx.recruitment.update({
          where: { id: recruitmentId },
          data: {
            appliedCount: applicationCount + 1,
          },
        });

        return { application, recruitment: updatedRecruitment };
      });

      return NextResponse.json(
        {
          ok: true,
          application: {
            id: result.application.id,
            recruitmentId,
            contact: result.application.contact,
          },
        },
        { status: 200 },
      );
    } catch (error: unknown) {
      if (error instanceof Error) {
        // 트랜잭션 내에서 던진 커스텀 에러코드 처리
        switch (error.message) {
          case "NOT_FOUND":
            return NextResponse.json(
              {
                ok: false,
                code: "NOT_FOUND",
                error: "Recruitment not found",
              },
              { status: 404 },
            );
          case "RECRUITMENT_CLOSED":
            return NextResponse.json(
              {
                ok: false,
                code: "RECRUITMENT_CLOSED",
                error: "모집이 마감되었습니다.",
              },
              { status: 409 },
            );
          case "CAPACITY_FULL":
            return NextResponse.json(
              {
                ok: false,
                code: "CAPACITY_FULL",
                error: "정원이 꽉 찼습니다.",
              },
              { status: 409 },
            );
          case "ALREADY_APPLIED":
            return NextResponse.json(
              {
                ok: false,
                code: "ALREADY_APPLIED",
                error: "이미 신청했습니다.",
              },
              { status: 409 },
            );
        }
      }

      // 알 수 없는 예외
      // Log error message only (no PII)
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("POST /api/apply transaction error:", errorMsg);
      return NextResponse.json(
        {
          ok: false,
          code: "SERVER_ERROR",
          error: "신청 처리 중 오류가 발생했습니다.",
        },
        { status: 500 },
      );
    }
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("POST /api/apply failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      {
        ok: false,
        code: "SERVER_ERROR",
        error: e?.message ?? "Server error",
      },
      { status: 500 },
    );
  }
}
