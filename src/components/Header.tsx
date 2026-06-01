"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setNickname(user?.user_metadata?.full_name ?? null);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-lg font-bold tracking-tight">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
              Blue
            </span>
            <span className="text-white">Humanity</span>
          </span>
          <span className="text-sm text-zinc-600">×</span>
          <span className="inline-flex items-center overflow-hidden rounded-md bg-white px-2" style={{ height: 28 }}>
            <Image
              src="/dreaming-church.png"
              alt="꿈꾸는교회"
              height={20}
              width={66}
              className="object-contain"
            />
          </span>
        </Link>

        {/* 네비게이션 */}
        <nav className="flex items-center gap-3 text-sm text-zinc-500">
          <Link href="/" className="hidden sm:block whitespace-nowrap hover:text-zinc-200 transition-colors duration-150">
            홈
          </Link>
          <Link href="/clubs" className="whitespace-nowrap hover:text-zinc-200 transition-colors duration-150">
            목록
          </Link>

          {!loading && (
            <>
              {nickname ? (
                <>
                  <Link href="/my" className="hidden sm:block whitespace-nowrap hover:text-zinc-200 transition-colors duration-150">
                    내 리포트
                  </Link>
                  <Link href="/my/clubs" className="whitespace-nowrap hover:text-zinc-200 transition-colors duration-150">
                    내 동아리
                  </Link>
                  <span className="text-zinc-700">|</span>
                  <button
                    onClick={handleLogout}
                    className="whitespace-nowrap text-zinc-500 hover:text-zinc-200 transition-colors duration-150"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 btn-glow"
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
