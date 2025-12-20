import { NextRequest, NextResponse } from "next/server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
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

/**
 * Rate limit: IP 기반 인메모리 Map
 * 5초에 5회 이상 요청 시 429 반환
 */
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 5000; // 5초
  const maxRequests = 5;

  // 오래된 타임스탬프 제거
  const timestamps = rateLimitMap.get(ip) || [];
  const recentTimestamps = timestamps.filter((ts) => now - ts < windowMs);

  // 제한 초과 확인
  if (recentTimestamps.length >= maxRequests) {
    return false;
  }

  // 새 타임스탬프 추가
  recentTimestamps.push(now);
  rateLimitMap.set(ip, recentTimestamps);

  // 주기적으로 오래된 IP 제거 (메모리 누수 방지)
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const hasRecent = timestamps.some((ts) => now - ts < windowMs * 2);
      if (!hasRecent) {
        rateLimitMap.delete(key);
      }
    }
  }

  return true;
}

function getClientIp(req: NextRequest): string {
  // X-Forwarded-For 헤더 확인 (프록시 환경)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // X-Real-IP 헤더 확인
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // 기본값 (로컬 개발 환경)
  return "unknown";
}

// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/apply");

    // Rate limit 확인
    const clientIp = getClientIp(req);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        {
          ok: false,
          code: "RATE_LIMIT_EXCEEDED",
          error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 429 },
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

        // 3-2. 정원 확인 (appliedCount 사용)
        if (recruitment.appliedCount >= recruitment.capacity) {
          throw new Error("CAPACITY_FULL");
        }

        // 3-3. 신청 레코드 생성 (unique constraint가 중복 방지)
        const application = await tx.application.create({
          data: {
            recruitmentId,
            contact: contact.trim(), // 원본 저장
            contactNormalized, // 정규화된 값 저장 (unique constraint용)
            name: name?.trim() || null,
            message: message?.trim() || null,
          },
        });

        // 3-4. appliedCount 증가 (트랜잭션 내에서 안전하게)
        const updatedRecruitment = await tx.recruitment.update({
          where: { id: recruitmentId },
          data: {
            appliedCount: {
              increment: 1,
            },
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
            contact: result.application.contactNormalized,
          },
        },
        { status: 200 },
      );
    } catch (error: unknown) {
      // Prisma unique constraint 실패 처리 (P2002)
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        // unique constraint 위반 = 이미 신청함
        return NextResponse.json(
          {
            ok: false,
            code: "ALREADY_APPLIED",
            error: "이미 신청했습니다.",
          },
          { status: 409 },
        );
      }

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
