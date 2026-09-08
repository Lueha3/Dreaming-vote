import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/my/privacy-consent
 * 개인정보처리방침 도입 이전 가입자의 소급 동의 — PrivacyConsentPrompt에서 호출.
 * 이미 동의했다면(privacyAgreedAt not null) 값을 덮어쓰지 않는다.
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!user.privacyAgreedAt) {
    await prisma.user.update({
      where: { id: user.dbUserId },
      data: { privacyAgreedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
