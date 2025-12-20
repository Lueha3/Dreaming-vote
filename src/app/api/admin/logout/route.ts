import { NextResponse } from "next/server";

// POST /api/admin/logout
// 관리자 세션 쿠키를 삭제합니다.
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("admin_session");
  return res;
}

