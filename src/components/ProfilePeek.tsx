"use client";

import { createContext, useCallback, useContext, useState } from "react";
import Link from "next/link";
import { fetchJson } from "@/lib/http";
import { RoleBadge } from "@/components/RoleBadge";
import { NewcomerBadge } from "@/components/NewcomerBadge";
import type { Role } from "@/lib/roles";

type BuddyState =
  | "self"
  | "buddies"
  | "request_sent"
  | "request_received"
  | "i_have_buddy"
  | "target_has_buddy"
  | "i_have_pending"
  | "gender_unknown"
  | "gender_mismatch"
  | "requestable";

type PeekProfile = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: Role;
  group: string | null;
  dreamGroup: string | null;
  isNewcomer: boolean;
  catchphrase: string | null;
  traits: string[];
  activityLine: string;
  buddy: { state: BuddyState; matchId: string | null };
};

type Ctx = { open: (userId: string) => void };
const ProfilePeekContext = createContext<Ctx | null>(null);

/** 아바타 탭 → 미니 프로필 바텀시트. 어디서든 이 훅으로 열 수 있다. */
export function useProfilePeek(): Ctx {
  const ctx = useContext(ProfilePeekContext);
  if (!ctx) throw new Error("useProfilePeek는 ProfilePeekProvider 하위에서만 사용할 수 있어요.");
  return ctx;
}

/**
 * 앱 전역에 1개만 마운트(layout.tsx) — 광장 글·댓글 어디서 아바타를 탭해도
 * 같은 바텀시트 하나를 재사용한다(글마다 별도 시트를 만들지 않음).
 */
export function ProfilePeekProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PeekProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  // 짝꿍 신청 로컬 상태 — 신청 성공 시 서버 재조회 없이 버튼만 갱신.
  const [buddyState, setBuddyState] = useState<BuddyState | null>(null);
  const [buddySending, setBuddySending] = useState(false);
  const [buddyErr, setBuddyErr] = useState<string | null>(null);

  const open = useCallback((id: string) => {
    setUserId(id);
    setProfile(null);
    setNotFound(false);
    setLoading(true);
    setBuddyState(null);
    setBuddyErr(null);
    fetchJson<{ ok: true; profile: PeekProfile }>(`/api/people/${id}`)
      .then((data) => {
        setProfile(data.profile);
        setBuddyState(data.profile.buddy.state);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, []);

  const close = useCallback(() => setUserId(null), []);

  async function requestBuddy(targetId: string) {
    setBuddySending(true);
    setBuddyErr(null);
    try {
      await fetchJson("/api/buddy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId }),
      });
      setBuddyState("request_sent");
    } catch (e) {
      setBuddyErr(e instanceof Error ? e.message : "신청하지 못했어요.");
    }
    setBuddySending(false);
  }

  return (
    <ProfilePeekContext.Provider value={{ open }}>
      {children}
      {userId && (
        <div
          className="modal-fade-in fixed inset-0 z-[70] flex items-end justify-center bg-[rgba(46,110,158,.28)] backdrop-blur-[2px] sm:items-center"
          onClick={close}
        >
          <div
            className="sheet-slide-in glass-card w-full max-w-sm rounded-b-none p-5 sm:rounded-b-[24px]"
            style={{ background: "rgba(255,255,255,.96)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="멤버 미니 프로필"
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-ink-faint/30 sm:hidden" aria-hidden />

            {loading ? (
              <div className="flex items-center gap-3 py-6">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/70" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-28 animate-pulse rounded-full bg-white/70" />
                  <div className="h-3 w-20 animate-pulse rounded-full bg-white/70" />
                </div>
              </div>
            ) : notFound || !profile ? (
              <p className="py-6 text-center text-sm text-ink-soft">프로필을 불러오지 못했어요.</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {profile.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-skyx/25 text-base text-skyx-ink">
                      {profile.nickname?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{profile.nickname ?? "이름 미설정"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {profile.group && (
                        <span className="rounded-full border border-skyx/45 bg-skyx/15 px-2 py-0.5 text-[10px] font-bold text-skyx-ink">
                          {profile.group}
                        </span>
                      )}
                      <RoleBadge role={profile.role} size="sm" />
                      {profile.isNewcomer && <NewcomerBadge size="sm" />}
                    </div>
                  </div>
                </div>

                {profile.catchphrase && (
                  <p className="mt-3 text-xs leading-relaxed text-ink-soft">
                    &ldquo;{profile.catchphrase}&rdquo;
                    {profile.traits.length > 0 && (
                      <span className="text-ink-faint"> · {profile.traits.join(", ")}</span>
                    )}
                  </p>
                )}

                <div className="mt-3 rounded-xl border border-white/90 bg-white/55 px-3 py-2.5">
                  <p className="text-[11px] font-semibold text-ink-faint">최근 활동</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{profile.activityLine}</p>
                </div>

                {/* 짝꿍 신청/상태 */}
                <BuddyAction
                  state={buddyState ?? profile.buddy.state}
                  sending={buddySending}
                  error={buddyErr}
                  onRequest={() => requestBuddy(profile.id)}
                  onClose={close}
                />

                <Link
                  href="/people"
                  onClick={close}
                  className="mt-2.5 block text-center text-xs font-medium text-ink-faint hover:text-skyx-ink"
                >
                  멤버 둘러보기 →
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </ProfilePeekContext.Provider>
  );
}

/** 짝꿍 신청 버튼 + 상태별 안내. 같은 성별끼리만·1인 1짝꿍 규칙은 서버가 state로 내려준다. */
function BuddyAction({
  state,
  sending,
  error,
  onRequest,
  onClose,
}: {
  state: BuddyState;
  sending: boolean;
  error: string | null;
  onRequest: () => void;
  onClose: () => void;
}) {
  // 신청 자체가 성립하지 않는 경우(본인·성별 조건)엔 짝꿍 영역을 숨긴다.
  if (state === "self" || state === "gender_mismatch" || state === "gender_unknown") return null;

  if (state === "requestable") {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={onRequest}
          disabled={sending}
          className="btn-gold block w-full rounded-full py-2.5 text-center text-xs font-semibold disabled:opacity-50"
        >
          {sending ? "신청 중…" : "🤝 짝꿍 신청하기"}
        </button>
        {error && <p className="mt-1.5 text-center text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  const info: Record<Exclude<BuddyState, "self" | "gender_mismatch" | "gender_unknown" | "requestable">, { text: string; link?: boolean }> = {
    buddies: { text: "🤝 이미 나의 짝꿍이에요" },
    request_sent: { text: "🤝 신청함 · 응답을 기다리는 중이에요" },
    request_received: { text: "이 멤버가 나에게 짝꿍을 신청했어요", link: true },
    i_have_buddy: { text: "이미 짝꿍이 있어요. 바꾸려면 내 정보에서 해제해주세요", link: true },
    target_has_buddy: { text: "이미 짝꿍이 있는 멤버예요" },
    i_have_pending: { text: "먼저 보낸 신청의 응답을 기다리는 중이에요" },
  };
  const meta = info[state];

  return (
    <div className="mt-4 rounded-full border border-sky-line bg-white/55 px-4 py-2.5 text-center">
      <p className="text-[11px] font-medium text-ink-soft">{meta.text}</p>
      {meta.link && (
        <Link
          href="/my/profile"
          onClick={onClose}
          className="mt-0.5 inline-block text-[11px] font-bold text-skyx-ink hover:underline"
        >
          내 정보에서 관리 →
        </Link>
      )}
    </div>
  );
}
