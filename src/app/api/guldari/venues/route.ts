import { NextResponse } from "next/server";
import { guldariDb } from "@/lib/guldariDb";

/**
 * GET /api/guldari/venues
 * 공연장 티어 목록 — 06-venues-and-discovery.md §4 "길 위 → 스타디움" 리스킨.
 * 인증 없이 공개(성장 사다리는 앱 밖에서도 보여줄 마케팅 콘텐츠라 무료 공개 전제).
 */
export async function GET() {
  const venues = await guldariDb.venue.findMany({
    orderBy: { capacity: "asc" },
  });
  return NextResponse.json({ ok: true, venues });
}
