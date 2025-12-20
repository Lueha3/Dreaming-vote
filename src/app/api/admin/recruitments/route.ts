import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const CHURCH_CODE = process.env.CHURCH_CODE;

// POST /api/admin/recruitments
// 간단한 관리자용 모집글 생성 엔드포인트
// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/admin/recruitments");
    
    // DEV-only diagnostics: confirm env vars are loaded (without leaking secrets)
    if (process.env.NODE_ENV !== "production") {
      console.log("ADMIN_SECRET configured:", Boolean(process.env.ADMIN_SECRET), "len:", process.env.ADMIN_SECRET?.length ?? 0);
      console.log("CHURCH_CODE configured:", Boolean(process.env.CHURCH_CODE));
    }
    
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

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const { title, description, capacity } = body as {
      title?: string;
      description?: string;
      capacity?: number;
    };

    if (!title || !description || typeof capacity !== "number") {
      return NextResponse.json(
        { ok: false, error: "title, description, capacity 가 모두 필요합니다." },
        { status: 400 },
      );
    }

    if (capacity <= 0) {
      return NextResponse.json(
        { ok: false, error: "capacity 는 1 이상이어야 합니다." },
        { status: 400 },
      );
    }

    // 손상된 텍스트 검증: "???" 패턴이나 과도한 '?' 문자 감지
    function isCorrupted(text: string): boolean {
      // "???" 패턴이 있는지 확인
      if (text.includes("???")) {
        return true;
      }
      // 텍스트 길이 대비 '?' 문자의 비율이 30% 이상이면 의심
      const questionCount = (text.match(/\?/g) || []).length;
      if (text.length > 0 && questionCount / text.length > 0.3) {
        return true;
      }
      return false;
    }

    if (isCorrupted(title) || isCorrupted(description)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid encoding: text looks corrupted",
        },
        { status: 400 },
      );
    }

    const recruitment = await prisma.recruitment.create({
      data: {
        churchCode: CHURCH_CODE,
        title,
        content: description,
        capacity,
        appliedCount: 0,
        status: "open",
      },
    });

    return NextResponse.json(
      {
        ok: true,
        item: {
          id: recruitment.id,
          title: recruitment.title,
          description: recruitment.content,
          status: recruitment.status,
          capacity: recruitment.capacity,
          appliedCount: recruitment.appliedCount,
        },
      },
      { status: 200 },
    );
  } catch (e: any) {
    // Log error message only (no PII)
    console.error("POST /api/admin/recruitments failed:", e?.message ?? "Unknown error");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}


