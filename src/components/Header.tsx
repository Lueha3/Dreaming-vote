"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NICKNAME_RE = /^(러비아|유디코)-\d{2}-.+$/;

/* 꿈꾸는교회 미니 로고 — 교회 + 십자가 + 골드 별 + 민트 포인트 */
function ChurchBadge() {
  return (
    <span
      className="flex h-9 w-9 flex-none items-center justify-center rounded-xl"
      style={{
        background: "linear-gradient(140deg, #7FBDE4 0%, #4A90C2 100%)",
        boxShadow: "0 4px 12px -2px rgba(74,144,194,.45), inset 0 1px 0 rgba(255,255,255,.45)",
      }}
      aria-hidden
    >
      <svg width="26" height="26" viewBox="0 0 40 40" fill="none">
        <g stroke="rgba(255,255,255,.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 2.5 V7.5 M17 4.8 H23" />
          <path d="M14 16 L20 8.5 L26 16 Z" />
          <path d="M15 16 V26 H25 V16" />
          <path d="M8 26 H32 V34 H8 Z" />
          <path d="M18 34 V30.5 A2 2 0 0 1 22 30.5 V34" />
        </g>
        <path
          d="M31,7 C31.5,9.6 32.4,10.5 35,11 C32.4,11.5 31.5,12.4 31,15 C30.5,12.4 29.6,11.5 27,11 C29.6,10.5 30.5,9.6 31,7 Z"
          fill="#F0B429"
        />
        <rect x="9.4" y="20.4" width="3" height="3" rx=".7" fill="#35C3B4" transform="rotate(12 10.9 21.9)" />
      </svg>
    </span>
  );
}

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
    <header
      className="sticky top-0 z-50 border-b border-white/70"
      style={{
        background: "rgba(255,255,255,.52)",
        backdropFilter: "blur(18px) saturate(1.5)",
        WebkitBackdropFilter: "blur(18px) saturate(1.5)",
        boxShadow: "0 4px 24px -12px rgba(74,144,194,.25)",
      }}
    >
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2.5">

        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2.5">
          <ChurchBadge />
          <span>
            <span className="block text-base font-extrabold tracking-tight text-ink sm:text-lg">
              Blue
              <span className="bg-gradient-to-r from-skyx-deep to-teal bg-clip-text text-transparent">
                Humanity
              </span>
            </span>
            <span className="block text-[10px] font-semibold leading-none text-ink-faint">
              꿈꾸는교회 청년부
            </span>
          </span>
        </Link>

        {/* 데스크톱 네비 */}
        <nav className="hidden sm:flex items-center gap-0.5 text-sm font-semibold text-ink-soft">
          <Link href="/" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">홈</Link>
          <Link href="/prayer" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">기도</Link>
          <Link href="/clubs" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">목록</Link>
          {!loading && nickname && (
            <>
              <Link href="/my" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">내 성향 카드</Link>
              <Link href="/my/clubs" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">내 동아리</Link>
              <Link
                href="/my/profile"
                className={`ml-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  isNicknameSet
                    ? "border-white/90 bg-white/60 text-ink-soft hover:bg-white/90 hover:text-ink"
                    : "border-gold/45 bg-gold/15 text-gold-ink hover:bg-gold/25"
                }`}
              >
                {isNicknameSet ? nickname : "닉네임 설정 ⚠️"}
              </Link>
              <span className="mx-2 h-[18px] w-px bg-sky-line" aria-hidden />
              <button
                onClick={handleLogout}
                className="whitespace-nowrap rounded-full px-2.5 py-1.5 font-semibold text-ink-faint transition-colors hover:bg-white/75 hover:text-ink"
              >
                로그아웃
              </button>
            </>
          )}
          {!loading && !nickname && (
            <Link href="/login" className="btn-gold whitespace-nowrap rounded-full px-4 py-1.5 text-xs">
              로그인
            </Link>
          )}
        </nav>

        {/* 모바일: 로그인 버튼 or 햄버거 */}
        <div className="flex sm:hidden items-center gap-2" ref={menuRef}>
          {!loading && !nickname && (
            <Link href="/login" className="btn-gold rounded-full px-3.5 py-1.5 text-xs">
              로그인
            </Link>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="glass-soft flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft transition-colors hover:text-skyx-ink"
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
            <div className="glass-card absolute right-4 top-[3.75rem] w-56 py-2" style={{ background: "rgba(255,255,255,.92)" }}>
              <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>홈</MobileNavLink>
              <MobileNavLink href="/prayer" onClick={() => setMenuOpen(false)}>🙏 기도</MobileNavLink>
              <MobileNavLink href="/clubs" onClick={() => setMenuOpen(false)}>목록</MobileNavLink>
              {!loading && nickname && (
                <>
                  <div className="my-1.5 mx-4 border-t border-sky-line" />
                  <MobileNavLink href="/my" onClick={() => setMenuOpen(false)}>내 성향 카드</MobileNavLink>
                  <MobileNavLink href="/my/clubs" onClick={() => setMenuOpen(false)}>내 동아리</MobileNavLink>
                  <MobileNavLink href="/my/profile" onClick={() => setMenuOpen(false)}>
                    <span className="flex items-center justify-between w-full">
                      <span>프로필 설정</span>
                      {!isNicknameSet && <span className="text-gold-ink text-xs">⚠️</span>}
                    </span>
                  </MobileNavLink>
                  <div className="my-1.5 mx-4 border-t border-sky-line" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-ink-faint transition-colors hover:bg-white/80 hover:text-ink"
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
      className="flex w-full items-center px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-white/80 hover:text-ink"
    >
      {children}
    </Link>
  );
}
