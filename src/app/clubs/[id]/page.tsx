import Link from "next/link";
import { after } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getClubDetail } from "@/lib/clubDetail";
import { prisma } from "@/lib/db";
import { ClubDetailView } from "./ClubDetailView";

type PageProps = { params: Promise<{ id: string }> | { id: string } };

// getAuthUser가 쿠키를 읽으므로 동적(이미 ƒ 라우트).
export const dynamic = "force-dynamic";

/**
 * 동아리 상세 — 서버 컴포넌트.
 * 기존: "use client" 빈 셸 → hydrate → /api/clubs/[id] 페치(getUser 네트워크+Prisma) 워터폴.
 * 변경: getAuthUser() 1회 + getClubDetail() 1패스 SSR → 첫 콘텐츠 HTML 인라인, 클라 페치 제거.
 * 상호작용(스크롤·신청·갤러리)은 ClubDetailView(클라)에 데이터 props로 주입.
 */
export default async function ClubDetailPage({ params }: PageProps) {
  const { id } = params instanceof Promise ? await params : params;

  const user = await getAuthUser();
  const data = await getClubDetail(id, user);

  /* ── 없음 / 비개설자에게 숨김 ─────────────────────────────── */
  if (!data) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="relative px-6 text-center">
          <div className="mb-6 text-5xl">🔍</div>
          <h2 className="mb-3 text-2xl font-bold text-ink">동아리를 찾을 수 없어요</h2>
          <p className="mb-8 text-sm text-ink-soft">
            삭제되었거나 아직 승인되지 않은 동아리일 수 있어요.
          </p>
          <Link href="/clubs" className="btn-gold inline-block rounded-full px-6 py-3 text-sm">
            동아리 목록으로
          </Link>
        </div>
      </div>
    );
  }

  // 조회수 증가 (개설자 본인 제외) — 응답 렌더 후 실행(렌더 비차단). 실패해도 무시.
  if (!data.isOwner) {
    after(async () => {
      try {
        await prisma.club.update({ where: { id }, data: { viewCount: { increment: 1 } } });
      } catch {
        /* best-effort 집계 */
      }
    });
  }

  return <ClubDetailView initialData={data} />;
}
