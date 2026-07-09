import { Suspense } from "react";

import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ChurchLineArt } from "@/components/ChurchLineArt";
import { HomeFeed, type HomeView } from "@/components/HomeFeed";
import { HomeShowcase, type ShowcaseStatus } from "@/components/home/HomeShowcase";
import { getAuthUser } from "@/lib/auth";
import { getFeedData } from "@/lib/feed";
import { hasAtLeast } from "@/lib/roles";

// 승인 멤버용 — 피드 데이터를 서버에서 채워 스트리밍(Suspense).
async function ApprovedFeedSection({ userId }: { userId: string }) {
  const initial: HomeView = { kind: "approved", feed: await getFeedData(userId) };
  return <HomeFeed initial={initial} />;
}

/**
 * 홈(/) — 게이트 상태별 분기.
 *  - 비로그인·미가입·반려·승인대기: 방문자용 쇼케이스 랜딩(스크롤 시연 슬라이드 포함)
 *  - 승인 멤버(운영진 포함): 기존 피드 우선 홈 (콤팩트 히어로 + 활동 피드 스트리밍)
 */
export default async function Home() {
  const user = await getAuthUser();
  const isApprovedMember =
    !!user && (hasAtLeast(user.role, "staff") || user.membershipStatus === "approved");

  if (!isApprovedMember) {
    const status: ShowcaseStatus = !user
      ? "visitor"
      : user.membershipStatus === "pending"
        ? "pending"
        : "apply"; // none · rejected
    return <HomeShowcase status={status} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <main className="relative mx-auto max-w-2xl px-4 py-12">
        {/* 전체 공지 배너 (최신 게시 1건, 닫기 가능) */}
        <AnnouncementBanner />

        {/* 뱃지 */}
        <div className="mb-5 flex justify-center">
          <span className="glass-soft inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-skyx-ink shadow-[0_8px_24px_-8px_rgba(74,144,194,.22)]">
            <span
              className="h-[7px] w-[7px] rounded-full bg-teal"
              style={{ boxShadow: "0 0 0 4px rgba(53,195,180,.18), 0 0 10px rgba(53,195,180,.7)" }}
            />
            꿈꾸는교회 청년부
          </span>
        </div>

        {/* Hero — 피드 우선 정체성. '성격유형 고르기'는 헤더 메뉴(🧭)로 이동. */}
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-[34px] sm:text-[42px] font-extrabold tracking-tight leading-[1.2] text-ink">
            오늘의 <em className="not-italic gradient-text">청년부</em>
          </h1>
          <p className="text-[15px] sm:text-base text-ink-soft font-medium leading-relaxed">
            우리 청년부의 새 소식과 모임이 모이는 곳이에요.
          </p>
        </div>

        {/* 홈 본문: 피드를 서버에서 채워 스트리밍(Suspense).
            셸(히어로 등)은 즉시 표시되고, 피드는 준비되는 대로 같은 응답에 흘려보낸다. */}
        <Suspense fallback={<HomeFeed initial={{ kind: "loading" }} />}>
          <ApprovedFeedSection userId={user.dbUserId} />
        </Suspense>

        {/* 하단 교회 라인아트 (로고 오마주) */}
        <div className="mt-16 flex justify-center sm:mt-20" aria-hidden>
          <ChurchLineArt />
        </div>

        <p className="pb-6 pt-7 text-center text-[12.5px] font-medium text-ink/55">
          Dreaming Church <span className="mx-1 text-ink/30">·</span> 꿈꾸는교회 청년부{" "}
          <span className="mx-1 text-ink/30">·</span> BlueHumanity
        </p>
      </main>
    </div>
  );
}
