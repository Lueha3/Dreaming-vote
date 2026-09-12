"use client";

import { useEffect, useSyncExternalStore } from "react";
import { isStandaloneDisplay } from "@/lib/displayMode";

const MARK_KEY = "home-screen-install-marked";
const noopSubscribe = () => () => {};
const readServerStandalone = () => null;

/**
 * 홈 화면에 추가한 아이콘(standalone)으로 들어왔을 때 서버에 한 번 알려
 * 운영 지표 "홈 화면 설치" 집계를 가능하게 하는 상주 컴포넌트(렌더 결과 없음).
 * 로그인 여부와 무관하게 마운트 — 서버는 비로그인이면 401로 조용히 무시한다.
 * 로컬스토리지는 중복 호출만 막을 뿐, 실제 최초 기록 판정은 서버가 한다
 * (기기를 바꾸거나 로컬스토리지가 지워져 다시 호출돼도 서버에서 no-op이라 안전).
 */
export function StandaloneTracker() {
  const standalone = useSyncExternalStore(noopSubscribe, isStandaloneDisplay, readServerStandalone);

  useEffect(() => {
    if (!standalone) return;
    if (localStorage.getItem(MARK_KEY) === "1") return;
    fetch("/api/my/mark-installed", { method: "POST" })
      .then((r) => {
        if (r.ok) localStorage.setItem(MARK_KEY, "1");
      })
      .catch(() => {
        /* best-effort — 실패하면 다음 방문 때 다시 시도 */
      });
  }, [standalone]);

  return null;
}
