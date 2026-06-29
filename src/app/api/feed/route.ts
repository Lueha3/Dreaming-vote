import { NextResponse } from "next/server";

import { getAuthUser, membershipGate } from "@/lib/auth";
import { getFeedData } from "@/lib/feed";

/**
 * GET /api/feed — 로그인 승인 멤버용 '오늘의 청년부' 활동 피드.
 * 내 동아리 다가오는 모임 + 최근 개설 동아리 + 광장 최신 글 + 응답된 기도.
 *
 * 홈(/)은 이 데이터를 서버 렌더(page.tsx)에서 직접 채워 스트리밍하므로 첫 진입은 클라 페치가 없다.
 * 이 라우트는 클라 측 재검증/폴백 경로로 유지된다(쿼리 로직은 lib/feed의 getFeedData로 공유).
 */
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate; // 미승인은 membership_required(403) → 클라가 피드를 렌더하지 않음

  const feed = await getFeedData(user.dbUserId);
  return NextResponse.json({ ok: true, ...feed });
}
