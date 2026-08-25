"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { SESSION_TIMEOUT_CODE } from "@/lib/sessionTimeout";

/**
 * 자동 로그아웃의 클라이언트 절반 — 서버(미들웨어)는 '요청이 올 때' 끊지만, 그것만으로는
 * 화면을 켜둔 채 자리를 뜬 사람이 다시 요청을 보내기 전까지 로그인된 화면이 그대로 남는다.
 * 그래서 여기서 만료 시각까지 타이머를 걸어두고, 시각이 되면 스스로 로그아웃시킨다.
 *
 * 유휴 시계를 되감는 신호는 '사람이 만든 입력'뿐이다. 하단 탭바의 45초 배지 폴링이나
 * 페이지가 스스로 하는 데이터 페치는 여기에 걸리지 않는다 — 걸렸다면 앱을 켜둔 것만으로
 * 유휴 판정이 영원히 성립하지 않는다.
 *
 * 만료 시각은 서버가 알려준 값만 믿는다(쿠키가 httpOnly라 클라이언트가 직접 못 읽는다).
 * 로컬에서 임의로 늘리지 않으므로, 이 컴포넌트를 통째로 막아도 만료 시각이 미뤄지지 않는다.
 */

/** 사람 손이 닿아야만 발생하는 이벤트들. scroll은 코드가 만드는 경우가 많아 뺐다. */
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel", "touchstart"] as const;

/** 활동 중일 때 서버로 보내는 최소 간격 — 2시간 창에서 1분 오차는 무의미하다. */
const HEARTBEAT_THROTTLE_MS = 60_000;

/**
 * 타이머 1회 최대 대기. 백그라운드 탭에서 setTimeout이 늘어지거나 기기가 잠들면 예약이
 * 크게 밀리므로, 길게 한 번 걸지 않고 잘라 걸어 매번 실제 시각을 다시 확인한다.
 */
const MAX_TIMER_MS = 5 * 60_000;

function hasAuthCookie() {
  return /sb-[a-z0-9-]+-auth-token/i.test(document.cookie);
}

export function SessionTimeoutGuard() {
  // 로그인/로그아웃 직후 상태 변화를 알아채기 위해 경로 변화마다 다시 판정한다(탭바와 같은 방식).
  const pathname = usePathname();
  const deadlineRef = useRef(Number.POSITIVE_INFINITY);
  const lastSentRef = useRef(0);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    if (!hasAuthCookie()) return;

    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function forceLogout() {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      try {
        // 쿠키만 지우면 refresh token은 서버에 살아있다. 진짜 signOut까지 태운다.
        await fetch("/api/auth/logout", { method: "POST", redirect: "manual", cache: "no-store" });
      } catch {
        // 오프라인이어도 화면은 반드시 로그인으로 보낸다 — 다음 요청에서 미들웨어가 마무리한다.
      }
      // 미들웨어 만료 처리와 같은 목적지 — 로그인 폼이 아니라 방문자 홈.
      window.location.replace("/?logout=idle");
    }

    function schedule() {
      if (disposed || loggingOutRef.current) return;
      if (!Number.isFinite(deadlineRef.current)) return;
      const wait = Math.min(MAX_TIMER_MS, Math.max(1_000, deadlineRef.current - Date.now()));
      clearTimeout(timer);
      timer = setTimeout(check, wait);
    }

    function check() {
      if (disposed || loggingOutRef.current) return;
      if (Date.now() >= deadlineRef.current) void forceLogout();
      else schedule();
    }

    /** extend=true면 "사용자가 조작했다"는 신호(POST), false면 남은 시간만 읽는다(GET). */
    async function sync(extend: boolean) {
      if (disposed || loggingOutRef.current) return;
      try {
        const res = await fetch("/api/auth/heartbeat", {
          method: extend ? "POST" : "GET",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (disposed) return;

        if (res.status === 401 && data?.code === SESSION_TIMEOUT_CODE) {
          void forceLogout();
          return;
        }
        if (!data?.ok || typeof data.idleDeadline !== "number") return;

        deadlineRef.current = data.idleDeadline;
        check();
      } catch {
        // 네트워크 실패 — 이미 받아둔 만료 시각은 그대로 유효하므로 타이머만 유지한다.
      }
    }

    function onActivity() {
      if (disposed || loggingOutRef.current) return;
      const now = Date.now();
      // 이미 만료된 뒤의 조작은 되감기 신호가 아니라 만료 확인 신호다.
      if (now >= deadlineRef.current) {
        check();
        return;
      }
      if (now - lastSentRef.current < HEARTBEAT_THROTTLE_MS) return;
      lastSentRef.current = now;
      void sync(true);
    }

    /** 탭 복귀·bfcache 복원 — 사용자 조작이 아니므로 되감지 않고, 만료됐는지만 확인한다. */
    function onResume() {
      if (document.visibilityState === "hidden") return;
      check();
      void sync(false);
    }

    void sync(false);
    for (const type of ACTIVITY_EVENTS) {
      window.addEventListener(type, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);

    return () => {
      disposed = true;
      clearTimeout(timer);
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, [pathname]);

  return null;
}
