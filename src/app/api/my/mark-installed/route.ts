import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

/**
 * POST /api/my/mark-installed — 홈 화면에 추가한 아이콘(standalone)으로 처음 들어왔다고 기록.
 * "홈 화면에 추가했는지"는 브라우저만 아는 정보(display-mode: standalone)라 서버가 스스로
 * 알 방법이 없다 — StandaloneTracker가 감지될 때마다 호출하며, 여기서 최초 1회만 반영한다.
 */
export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 이미 기록돼 있으면 no-op — 최초 시각을 보존한다.
  await prisma.user.updateMany({
    where: { id: user.dbUserId, homeScreenAddedAt: null },
    data: { homeScreenAddedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
