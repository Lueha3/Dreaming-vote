"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePushSubscription } from "@/lib/usePushSubscription";
import { isStandaloneDisplay } from "@/lib/displayMode";

// standalone 여부는 window API라 SSR 스냅샷이 없다 — effect+setState 대신
// useSyncExternalStore로 읽어 "이펙트 안 동기 setState" 린트를 피한다(AppLinkBox와 동일 패턴).
const noopSubscribe = () => () => {};
const readServerStandalone = () => null;

/**
 * 가입 승인된 회원이라면 프로필 설정을 따로 찾아가지 않아도 알림을 켤 수 있도록,
 * 앱을 열자마자 자동으로 뜨는 전역 배너. 브라우저 정책상 알림 권한은 서버가 대신
 * 켜줄 수 없어(반드시 사용자 탭이 있어야 함) 이 배너의 버튼 탭이 그 역할을 한다.
 *
 * "홈 화면에 추가" 안내는 카톡 인앱·사파리·크롬 등 브라우저 종류나 OS와 무관하게
 * 홈 화면에 설치된 앱(standalone)으로 들어온 게 아니면 항상 노출한다 — 예전엔 iOS만
 * 이 안내를 보고 안드로이드 브라우저 탭은 곧장 "알림 받기" 배너로 갔는데, 그러면
 * 카톡 인앱처럼 알림 API 자체가 막힌 곳(support==="unsupported")에서는 배너가 통째로
 * 사라져 아무 안내도 못 받는 사각지대가 생겼다. 영구 닫기는 두지 않는다(이번 방문에서만
 * 닫히고, 다음 방문에 설치 전이면 다시 뜬다) — "항시 노출"이 요구사항이라 로컬스토리지로
 * 영영 숨기면 안 된다.
 */
export function AutoPushPrompt() {
  const [approved, setApproved] = useState(false);
  const [dismissedNow, setDismissedNow] = useState(false);
  const standalone = useSyncExternalStore(noopSubscribe, isStandaloneDisplay, readServerStandalone);
  const { permission, subscribed, loading, error, enable } = usePushSubscription();

  useEffect(() => {
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) return;
    fetch("/api/membership?fields=summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok && j.membership.membershipStatus === "approved") setApproved(true);
      })
      .catch(() => {});
  }, []);

  if (!approved || dismissedNow || standalone === null) return null;
  // 이미 홈 화면 아이콘으로 들어와 있고 알림도 켜져 있다면 더 보여줄 필요 없다.
  if (standalone && subscribed) return null;
  // 브라우저에서 알림을 이미 차단했다면 배너로 유도해도 실패만 반복된다 — 브라우저 설정에서
  // 직접 풀어야 하는 문제라 여기서는 조용히 접는다("홈 화면에 추가" 안내와는 무관).
  if (standalone && permission === "denied") return null;

  const needsInstall = !standalone;

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 pb-3 sm:bottom-0"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="glass-card card-slide-in flex w-full max-w-sm items-start gap-3 p-4">
        <span className="text-xl">{needsInstall ? "📲" : "🔔"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            {needsInstall ? "홈 화면에 추가하면 알림을 받을 수 있어요" : "새 소식을 알림으로 받아보세요"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            {needsInstall
              ? "오른쪽 위 공유 아이콘 → 홈 화면에 추가 후, 그 아이콘으로 들어오면 알림을 받을 수 있어요."
              : "댓글, 모임 공지 같은 새 소식을 놓치지 않아요."}
          </p>
          {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
          <div className="mt-2.5 flex gap-2">
            {needsInstall ? (
              <a
                href="/guide#home-screen"
                className="btn-gold rounded-full px-4 py-1.5 text-xs font-semibold btn-glow"
              >
                방법 보기
              </a>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await enable();
                }}
                disabled={loading}
                className="btn-gold rounded-full px-4 py-1.5 text-xs font-semibold disabled:opacity-40 btn-glow"
              >
                {loading ? "처리 중..." : "알림 받기"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissedNow(true)}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
