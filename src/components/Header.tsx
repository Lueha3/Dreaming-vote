"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RoleBadge } from "@/components/RoleBadge";
import { displayRoles, type Role } from "@/lib/roles";



export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [membershipStatus, setMembershipStatus] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isClubLeader, setIsClubLeader] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 로그인 여부·닉네임·멤버십 상태를 /api/membership 한 번으로 확정한다.
    // (예전: 클라 supabase.auth.getUser() → /api/membership 직렬 2왕복.
    //  membership 응답이 로그인 여부와 Prisma 닉네임을 모두 담으므로 클라 getUser 홉 제거.)
    let alive = true;
    fetch("/api/membership", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!alive) return;
        if (json?.ok) {
          setMembershipStatus(json.membership.membershipStatus);
          setRole(json.membership.role ?? null);
          setIsClubLeader(!!json.membership.isClubLeader);
          // 닉네임은 가입 승인 시 자동 생성되는 Prisma 값이 진실.
          // 미승인 유저의 Prisma 닉네임은 첫 로그인 시 저장된 표시명(full_name) 폴백.
          setNickname(json.membership.nickname ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
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
          <div className="rounded-md border border-sky-line bg-white px-2.5 py-1.5 shadow-sm">
            <img
              src="/dreaming-church.png"
              alt="꿈꾸는교회"
              style={{ height: 28, width: "auto", display: "block", maxWidth: 96 }}
            />
          </div>
        </Link>

        {/* 햄버거 — 모든 화면 크기 공통 */}
        <div className="relative flex items-center gap-2" ref={menuRef}>
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
            <div className="glass-card absolute right-0 top-[calc(100%+0.5rem)] w-56 py-2" style={{ background: "rgba(255,255,255,.92)" }}>
              {!loading && nickname && (
                <div className="mb-1 flex flex-wrap items-center gap-1.5 border-b border-sky-line px-4 pb-2">
                  <span className="truncate text-sm font-semibold text-ink">{nickname}</span>
                  {displayRoles(role, { isClubLeader }).map((r) => (
                    <RoleBadge key={r} role={r} size="sm" />
                  ))}
                </div>
              )}
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
