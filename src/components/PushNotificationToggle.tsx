"use client";

import { usePushSubscription } from "@/lib/usePushSubscription";

/**
 * 휴대폰 푸시 알림 켜기/끄기 토글 — /my/profile에 배치.
 * 아이폰은 "홈 화면에 추가"(standalone) 상태가 아니면 웹 푸시 자체가 불가하므로
 * 그 경우 구독 UI 대신 설치 안내만 보여준다(iOS 16.4+ 제약).
 */
export function PushNotificationToggle() {
  const { support, permission, subscribed, loading, error, enable, disable } = usePushSubscription();

  if (support === "ios-needs-install") {
    return (
      <div className="glass-card p-5">
        <p className="mb-1.5 text-xs font-semibold text-ink">📲 휴대폰 알림</p>
        <p className="text-xs leading-relaxed text-ink-soft">
          아이폰에서 알림을 받으려면 먼저 Safari 공유 버튼 →{" "}
          <strong className="text-ink">홈 화면에 추가</strong>로 앱을 설치해주세요. 설치한 아이콘으로
          열면 알림을 켤 수 있어요.
        </p>
      </div>
    );
  }

  if (support !== "supported") return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink">📲 휴대폰 알림</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {subscribed
              ? "댓글·모임 공지 등 새 알림을 휴대폰으로 받고 있어요."
              : "댓글·모임 공지 등 새 알림을 휴대폰으로 받아보세요."}
          </p>
        </div>
        <button
          type="button"
          onClick={subscribed ? disable : enable}
          disabled={loading || permission === "denied"}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-all disabled:opacity-40 ${
            subscribed ? "glass-soft text-ink-soft hover:bg-white/90 hover:text-ink" : "btn-gold btn-glow"
          }`}
        >
          {loading ? "처리 중..." : subscribed ? "끄기" : "켜기"}
        </button>
      </div>
      {permission === "denied" && (
        <p className="mt-2 text-[11px] text-red-500">
          브라우저에서 알림이 차단돼 있어요. 브라우저 설정에서 알림 권한을 허용해주세요.
        </p>
      )}
      {error && <p className="mt-2 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
