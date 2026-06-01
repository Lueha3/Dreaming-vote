"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setNickname(user?.user_metadata?.full_name ?? null);
      setLoading(false);
    });
  }, []);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5">
          {/* BlueHumanity */}
          <span className="text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Blue
            </span>
            <span className="text-white">Humanity</span>
          </span>

          {/* 구분자 */}
          <span className="text-sm text-zinc-600">×</span>

          {/* 꿈꾸는교회 */}
          <span className="flex items-center gap-1.5">
            <DreamingChurchIcon />
            <span className="text-sm font-bold text-amber-400">꿈꾸는교회</span>
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-4 text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-200 transition-colors duration-150">
            홈
          </Link>

          {!loading && (
            <>
              {nickname ? (
                <>
                  <Link
                    href="/my"
                    className="hover:text-zinc-200 transition-colors duration-150"
                  >
                    내 리포트
                  </Link>
                  <span className="text-zinc-700">|</span>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                    >
                      로그아웃
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href="/login"
                  className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
                >
                  로그인
                </Link>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * 꿈꾸는교회 로고를 단순화한 SVG 아이콘
 * 원본: 금색 교회 건물 + 십자가 + 꼭대기 별
 */
function DreamingChurchIcon() {
  const gold = "#D97706";
  const dark = "#09090b";

  return (
    <svg width="16" height="22" viewBox="0 0 16 22" fill="none" aria-hidden>
      {/* 꼭대기 별 (4각) */}
      <path
        d="M8 0L8.9 2.6H11.7L9.4 4.2L10.3 6.8L8 5.2L5.7 6.8L6.6 4.2L4.3 2.6H7.1L8 0Z"
        fill={gold}
      />
      {/* 십자가 세로 */}
      <rect x="7" y="5.5" width="2" height="7" rx="0.3" fill={gold} />
      {/* 십자가 가로 */}
      <rect x="4" y="8" width="8" height="2" rx="0.3" fill={gold} />
      {/* 교회 건물 */}
      <rect x="1.5" y="13" width="13" height="9" rx="1" fill={gold} />
      {/* 출입문 */}
      <rect x="6" y="17" width="4" height="5" rx="0.5" fill={dark} />
      {/* 창문 왼쪽 */}
      <rect x="2.5" y="14.5" width="3" height="2.5" rx="0.5" fill={dark} opacity="0.45" />
      {/* 창문 오른쪽 */}
      <rect x="10.5" y="14.5" width="3" height="2.5" rx="0.5" fill={dark} opacity="0.45" />
    </svg>
  );
}
