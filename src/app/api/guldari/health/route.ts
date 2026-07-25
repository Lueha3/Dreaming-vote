import { NextResponse } from "next/server";
import { guldariDb } from "@/lib/guldariDb";

/**
 * GET /api/guldari/health
 * 굴다리 DB(별도 Supabase 프로젝트) 연결 확인 — 실제 쿼리를 날려본다.
 */
export async function GET() {
  try {
    const [venues, artistProfiles, songs] = await Promise.all([
      guldariDb.venue.count(),
      guldariDb.artistProfile.count(),
      guldariDb.song.count(),
    ]);
    return NextResponse.json({
      ok: true,
      db: "guldari",
      counts: { venues, artistProfiles, songs },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "DB_CONNECTION_FAILED",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
