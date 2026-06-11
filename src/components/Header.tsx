"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NICKNAME_RE } from "@/lib/membership";



export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setNickname(user?.user_metadata?.full_name ?? null);
      setLoading(false);
      if (user) {
        fetch("/api/membership", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((json) => {
            if (json?.ok) {
              setMembershipStatus(json.membership.membershipStatus);
              // 승인 시 자동 생성되는 Prisma 닉네임이 진실 — 형식 통과한 값만 표시 교체
              const raw = json.membership.nickname;
              if (raw && NICKNAME_RE.test(raw)) setNickname(raw);
            }
          })
          .catch(() => {});
      }
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
          <span className="block text-lg font-extrabold tracking-tight sm:text-xl">
            <span className="text-ink">Blue</span>
            <span className="bg-gradient-to-r from-[#4A90D9] to-[#3FC8B7] bg-clip-text text-transparent">Humanity</span>
          </span>
          <span className="text-ink-soft/40 text-sm font-light mt-0.5">×</span>
          <div className="bg-white rounded-md px-2 py-1 shadow-sm border border-white/80 flex items-center justify-center">
            <img src="/dreaming-church.png" alt="꿈꾸는교회" className="h-5 sm:h-6 w-auto" />
          </div>
        </Link>

        {/* 데스크톱 네비 */}
        <nav className="hidden sm:flex items-center gap-0.5 text-sm font-semibold text-ink-soft">
          <Link href="/" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">홈</Link>
          <Link href="/prayer" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">기도</Link>
          <Link href="/clubs" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">목록</Link>
          {!loading && nickname && membershipStatus && membershipStatus !== "approved" && (
            <Link
              href="/join"
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                membershipStatus === "pending"
                  ? "border-skyx/45 bg-skyx/15 text-skyx-ink hover:bg-skyx/25"
                  : "border-gold/45 bg-gold/15 text-gold-ink hover:bg-gold/25"
              }`}
            >
              {membershipStatus === "pending" ? "승인 대기 중 ⏳" : "청년부 가입 신청"}
            </Link>
          )}
          {!loading && nickname && (
            <>
              <Link href="/my" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">내 성향 카드</Link>
              <Link href="/my/clubs" className="whitespace-nowrap rounded-full px-2.5 py-1.5 transition-colors hover:bg-white/75 hover:text-skyx-ink">내 동아리</Link>
              <Link
                href="/my/profile"
                className="ml-1 whitespace-nowrap rounded-full border border-white/90 bg-white/60 px-3 py-1.5 text-xs font-bold text-ink-soft transition-all hover:bg-white/90 hover:text-ink"
              >
                {isNicknameSet ? nickname : "프로필"}
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
              {!loading && nickname && membershipStatus && membershipStatus !== "approved" && (
                <MobileNavLink href="/join" onClick={() => setMenuOpen(false)}>
                  <span className="flex items-center justify-between w-full">
                    <span>{membershipStatus === "pending" ? "가입 승인 대기 중" : "청년부 가입 신청"}</span>
                    <span className="text-xs">{membershipStatus === "pending" ? "⏳" : "✋"}</span>
                  </span>
                </MobileNavLink>
              )}
              {!loading && nickname && (
                <>
                  <div className="my-1.5 mx-4 border-t border-sky-line" />
                  <MobileNavLink href="/my" onClick={() => setMenuOpen(false)}>내 성향 카드</MobileNavLink>
                  <MobileNavLink href="/my/clubs" onClick={() => setMenuOpen(false)}>내 동아리</MobileNavLink>
                  <MobileNavLink href="/my/profile" onClick={() => setMenuOpen(false)}>
                    프로필 설정
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
