"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_RE = /^(러비아|유디코)-\d{2}-.+$/;

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setNickname(user?.user_metadata?.full_name ?? null);
      setLoading(false);
    });
  }, []);

  // 페이지 이동 시 메뉴 닫기
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const isNicknameSet = NICKNAME_RE.test(nickname ?? "");

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center border-b border-white/[0.06] bg-[#0a0a0a]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4">

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-base font-bold tracking-tight sm:text-lg">
            <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">Blue</span>
            <span className="text-white">Humanity</span>
          </span>
          <span className="text-xs text-zinc-600">×</span>
          <span className="inline-flex items-center overflow-hidden rounded-md bg-white px-1.5" style={{ height: 26 }}>
            <Image src="/dreaming-church.png" alt="꿈꾸는교회" height={18} width={60} className="object-contain" />
          </span>
        </Link>

        {/* 데스크톱 네비 */}
        <nav className="hidden sm:flex items-center gap-3 text-sm text-zinc-500">
          <Link href="/" className="whitespace-nowrap hover:text-zinc-200 transition-colors">홈</Link>
          <Link href="/clubs" className="whitespace-nowrap hover:text-zinc-200 transition-colors">목록</Link>
          {!loading && nickname && (
            <>
              <Link href="/my" className="whitespace-nowrap hover:text-zinc-200 transition-colors">내 리포트</Link>
              <Link href="/my/clubs" className="whitespace-nowrap hover:text-zinc-200 transition-colors">내 동아리</Link>
              <Link
                href="/my/profile"
                className={`whitespace-nowrap text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  isNicknameSet
                    ? "border-white/[0.07] bg-white/[0.04] text-zinc-400 hover:text-zinc-200"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-400 hover:text-amber-300"
                }`}
              >
                {isNicknameSet ? nickname : "닉네임 설정 ⚠️"}
              </Link>
              <span className="text-zinc-700">|</span>
              <button onClick={handleLogout} className="whitespace-nowrap text-zinc-500 hover:text-zinc-200 transition-colors">
                로그아웃
              </button>
            </>
          )}
          {!loading && !nickname && (
            <Link href="/login" className="whitespace-nowrap rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 btn-glow">
              로그인
            </Link>
          )}
        </nav>

        {/* 모바일: 로그인 버튼 or 햄버거 */}
        <div className="flex sm:hidden items-center gap-2" ref={menuRef}>
          {!loading && !nickname && (
            <Link href="/login" className="rounded-full bg-gradient-to-r from-violet-600 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white btn-glow">
              로그인
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="메뉴"
          >
            {menuOpen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4H14M2 8H14M2 12H14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>

          {/* 드롭다운 메뉴 */}
          {menuOpen && (
            <div className="absolute right-4 top-[3.75rem] w-56 rounded-2xl border border-white/[0.08] bg-[#111111] py-2 shadow-2xl shadow-black/50">
              <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>홈</MobileNavLink>
              <MobileNavLink href="/clubs" onClick={() => setMenuOpen(false)}>목록</MobileNavLink>
              {!loading && nickname && (
                <>
                  <div className="my-1.5 mx-4 border-t border-white/[0.06]" />
                  <MobileNavLink href="/my" onClick={() => setMenuOpen(false)}>내 리포트</MobileNavLink>
                  <MobileNavLink href="/my/clubs" onClick={() => setMenuOpen(false)}>내 동아리</MobileNavLink>
                  <MobileNavLink href="/my/profile" onClick={() => setMenuOpen(false)}>
                    <span className="flex items-center justify-between w-full">
                      <span>프로필 설정</span>
                      {!isNicknameSet && <span className="text-amber-400 text-xs">⚠️</span>}
                    </span>
                  </MobileNavLink>
                  <div className="my-1.5 mx-4 border-t border-white/[0.06]" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

function MobileNavLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex w-full items-center px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/[0.04] hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
