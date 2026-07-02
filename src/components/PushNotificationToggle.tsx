"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type IosNavigator = Navigator & { standalone?: boolean };

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as IosNavigator).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

/**
 * 휴대폰 푸시 알림 켜기/끄기 토글 — /my/profile에 배치.
 * 아이폰은 "홈 화면에 추가"(standalone) 상태가 아니면 웹 푸시 자체가 불가하므로
 * 그 경우 구독 UI 대신 설치 안내만 보여준다(iOS 16.4+ 제약).
 */
export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [needsIosInstall, setNeedsIosInstall] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isIosDevice() && !isStandaloneDisplay()) {
      setNeedsIosInstall(true);
      return;
    }
    const ok =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (!ok) return;

    setPermission(Notification.permission);
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  async function handleEnable() {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("알림 권한이 허용되지 않았어요. 브라우저 설정에서 알림을 허용해주세요.");
        setLoading(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("알림 설정이 아직 준비되지 않았어요.");
        setLoading(false);
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetchJson("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setSubscribed(true);
    } catch {
      setError("알림 켜기에 실패했어요. 잠시 후 다시 시도해주세요.");
    }
    setLoading(false);
  }

  async function handleDisable() {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetchJson("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {
      setError("알림 끄기에 실패했어요.");
    }
    setLoading(false);
  }

  if (needsIosInstall) {
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

  if (!supported) return null;

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
          onClick={subscribed ? handleDisable : handleEnable}
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
