"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

function hasAuthCookie() {
  return /sb-[a-z0-9-]+-auth-token/i.test(document.cookie);
}
function subscribeNoop() {
  return () => {};
}

const TABS = [
  { href: "/", label: "홈", emoji: "🏠", exact: true },
  { href: "/prayer", label: "광장", emoji: "🗣", exact: false },
  { href: "/clubs", label: "동아리", emoji: "🎯", exact: false },
  { href: "/people", label: "멤버", emoji: "🧑‍🤝‍🧑", exact: false },
  { href: "/my", label: "내정보", emoji: "🪪", exact: false },
] as const;

/**
 * 모바일 전용 하단 탭바 — 자주 쓰는 5곳을 엄지 닿는 자리로 꺼낸다.
 * 나머지(공지·설명서·운영관리·로그아웃)는 기존 헤더 햄버거 메뉴에 그대로 남긴다.
 * 로그인 쿠키가 없으면(비로그인 방문자) 렌더하지 않음 — Header/NotificationBell과 동일한 판정 방식.
 */
export function BottomTabBar() {
  const pathname = usePathname();
  // pathname이 바뀔 때마다 리렌더되므로(usePathname 자체가 그 역할) 별도 effect 없이
  // 렌더 시점마다 쿠키를 다시 읽어 내비게이션 직후의 로그인 상태 변화도 반영한다.
  const loggedIn = useSyncExternalStore(subscribeNoop, hasAuthCookie, () => false);

  if (!loggedIn) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex sm:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(255,255,255,.75)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
        borderTop: "1px solid rgba(255,255,255,.9)",
        boxShadow: "0 -8px 24px -12px rgba(74,144,194,.25)",
      }}
      aria-label="주요 메뉴"
    >
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`mx-1 my-1.5 flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10.5px] font-semibold transition-all ${
              active ? "bg-skyx/15 text-skyx-ink" : "text-ink-faint"
            }`}
          >
            <span
              className={`text-[19px] leading-none transition-transform ${active ? "-translate-y-0.5 scale-[1.12]" : ""}`}
              aria-hidden
            >
              {t.emoji}
            </span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
