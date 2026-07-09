"use client";

import { useEffect, useState } from "react";
import { usePushSubscription } from "@/lib/usePushSubscription";

const DISMISS_KEY = "push-prompt-dismissed";

/**
 * 가입 승인된 회원이라면 프로필 설정을 따로 찾아가지 않아도 알림을 켤 수 있도록,
 * 앱을 열자마자 자동으로 뜨는 전역 배너. 브라우저 정책상 알림 권한은 서버가 대신
 * 켜줄 수 없어(반드시 사용자 탭이 있어야 함) 이 배너의 버튼 탭이 그 역할을 한다.
 * 이미 허용/거부했거나 구독 중이거나 직접 닫았으면 다시 뜨지 않는다.
 */
export function AutoPushPrompt() {
  const [approved, setApproved] = useState(false);
  const [dismissed, setDismissed] = useState(true); // 초기값 true — localStorage 확인 전 깜빡임 방지
  const { support, permission, subscribed, loading, error, enable } = usePushSubscription();

  useEffect(() => {
    if (!/sb-[a-z0-9-]+-auth-token/i.test(document.cookie)) return;
    fetch("/api/membership?fields=summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok && j.membership.membershipStatus === "approved") setApproved(true);
      })
      .catch(() => {});
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (!approved || dismissed) return null;
  if (support === "supported" && (permission !== "default" || subscribed)) return null;
  if (support !== "supported" && support !== "ios-needs-install") return null;

  const isIosInstall = support === "ios-needs-install";

  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-3 pb-3 sm:bottom-0"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
    >
      <div className="glass-card card-slide-in flex w-full max-w-sm items-start gap-3 p-4">
        <span className="text-xl">{isIosInstall ? "📲" : "🔔"}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink">
            {isIosInstall ? "홈 화면에 추가하면 알림을 받을 수 있어요" : "새 소식을 알림으로 받아보세요"}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">
            {isIosInstall
              ? "Safari 공유 버튼 → 홈 화면에 추가 후 그 아이콘으로 열어주세요."
              : "댓글, 모임 공지 같은 새 소식을 놓치지 않아요."}
          </p>
          {error && <p className="mt-1.5 text-[11px] text-red-500">{error}</p>}
          <div className="mt-2.5 flex gap-2">
            {isIosInstall ? (
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
              onClick={dismiss}
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
