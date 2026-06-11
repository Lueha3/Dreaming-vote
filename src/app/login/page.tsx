"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="glass-card glass-ribbon relative overflow-hidden px-6 py-10">
          {/* 로고 */}
          <div className="mb-8 text-center">
            <Link href="/" className="text-2xl font-bold tracking-tight">
              <span className="text-ink">Blue</span>
              <span className="bg-gradient-to-r from-skyx-deep to-teal bg-clip-text text-transparent">
                Humanity
              </span>
            </Link>
            <p className="mt-3 text-sm text-ink-soft">로그인하고 함께 시작해볼까요?</p>
          </div>

          {/* Google 로그인 버튼 */}
          <a
            href={`/api/auth/login?next=${encodeURIComponent(next)}`}
            className="glass-soft flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-ink shadow-[0_8px_24px_-10px_rgba(74,144,194,.3)] transition-colors hover:bg-white/95"
          >
            {/* Google 로고 */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Google로 로그인
          </a>

          <p className="mt-6 text-center text-xs text-ink-faint">
            청년부 구성원만 이용할 수 있어요
          </p>
        </div>
      </div>
    </div>
  );
}
