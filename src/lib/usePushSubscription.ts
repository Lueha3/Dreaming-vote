"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";
import { isIosDevice, isStandaloneDisplay } from "@/lib/displayMode";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

export type PushSupport = "checking" | "unsupported" | "ios-needs-install" | "supported";

/**
 * 휴대폰 푸시 알림 구독 상태·조작을 공유하는 훅.
 * PushNotificationToggle(프로필 설정)과 AutoPushPrompt(가입 후 자동 배너)가 함께 쓴다.
 * 브라우저 정책상 Notification.requestPermission()은 반드시 사용자 탭(제스처) 안에서
 * 호출해야 하므로, enable()은 항상 버튼 onClick 등 실제 클릭 핸들러에서 호출할 것.
 */
export function usePushSubscription() {
  const [support, setSupport] = useState<PushSupport>("checking");
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isIosDevice() && !isStandaloneDisplay()) {
      setSupport("ios-needs-install");
      return;
    }
    const ok =
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    if (!ok) {
      setSupport("unsupported");
      return;
    }
    setSupport("supported");
    setPermission(Notification.permission);
    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      })
      .catch(() => {});
  }, []);

  const enable = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("알림 권한이 허용되지 않았어요. 브라우저 설정에서 알림을 허용해주세요.");
        setLoading(false);
        return false;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setError("알림 설정이 아직 준비되지 않았어요.");
        setLoading(false);
        return false;
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
      setLoading(false);
      return true;
    } catch {
      setError("알림 켜기에 실패했어요. 잠시 후 다시 시도해주세요.");
      setLoading(false);
      return false;
    }
  }, []);

  const disable = useCallback(async (): Promise<void> => {
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
  }, []);

  return { support, permission, subscribed, loading, error, enable, disable };
}
