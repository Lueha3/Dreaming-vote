import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { SESSION_COOKIE_NAME } from "@/lib/session";

const identifySchema = z.object({
  churchCode: z.string().min(1, "churchCode 는 필수입니다."),
  name: z.string().min(1, "name 은 비어 있을 수 없습니다.").max(100),
  phoneLast4: z
    .string()
    .regex(/^\d{4}$/, "phoneLast4 는 숫자 4자리여야 합니다."),
});

// 항상 JSON 응답을 반환하여 클라이언트가 안전하게 파싱할 수 있도록 합니다.
export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/identify");
    
    let json: unknown;

    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "유효한 JSON 본문이 아닙니다." },
        { status: 400 },
      );
    }

    const parsed = identifySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "입력값 검증에 실패했습니다.",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { churchCode, name, phoneLast4 } = parsed.data;

    // User upsert (churchCode + name + phoneLast4 조합으로 유저 식별)
    const user = await prisma.user.upsert({
      where: {
        churchCode_name_phoneLast4: {
          churchCode,
          name,
          phoneLast4,
        },
      },
      update: {},
      create: {
        churchCode,
        name,
        phoneLast4,
      },
    });

    const res = NextResponse.json(
      {
        ok: true,
        userId: user.id,
      },
      { status: 200 },
    );

    // 세션 쿠키에는 userId를 저장
    res.cookies.set(SESSION_COOKIE_NAME, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1년
    });

    return res;
  } catch (e: any) {
    console.error("POST /api/identify failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Server error" },
      { status: 500 },
    );
  }
}


