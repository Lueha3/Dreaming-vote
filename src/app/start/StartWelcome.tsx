"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * /start 첫 안내 처리 — 두 가지 일을 한다.
 * 1) 마운트 시 POST /api/my/start-seen으로 "안내를 봤다"를 기록한다. 홈(page.tsx)이
 *    이 기록을 보고 다음 로그인부터는 리다이렉트 없이 바로 메인을 보여준다.
 *    keepalive — 기록 직후 홈으로 이동해도 요청이 끊기지 않게.
 * 2) 홈에서 안내로 온 경우(?welcome=1)에만 환영 배너를 보여준다. 배너의 "다음에 할게요"로
 *    고르지 않고 넘어갈 길을 열어둔다(강제 관문이 아니라 1회 안내).
 *
 * useSearchParams는 Suspense 경계 안에서만 쓴다 — /start의 정적 프리렌더 유지(page.tsx).
 */
export function StartWelcome() {
  const welcome = useSearchParams().get("welcome") === "1";

  useEffect(() => {
    fetch("/api/my/start-seen", { method: "POST", keepalive: true }).catch(() => {
      /* 실패해도 화면을 막지 않는다 — 다음 홈 진입에서 한 번 더 안내될 뿐 */
    });
  }, []);

  if (!welcome) return null;

  return (
    <div className="glass-soft mb-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
      <p className="min-w-0 text-[13.5px] font-semibold leading-snug text-ink">
        🎉 가입을 환영해요!{" "}
        <span className="font-medium text-ink-soft">먼저 나에게 맞는 동아리를 찾아볼까요?</span>
      </p>
      <Link
        href="/"
        className="shrink-0 whitespace-nowrap text-[12.5px] font-semibold text-ink-faint underline underline-offset-2 hover:text-ink"
      >
        다음에 할게요
      </Link>
    </div>
  );
}
