"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "@/lib/http";
import { RoleBadge } from "@/components/RoleBadge";
import { canForceWithdraw, displayRoles, type Role } from "@/lib/roles";

type Member = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: Role;
  membershipStatus: string;
  createdAt: string;
};

const MEMBERSHIP_LABEL: Record<string, string> = {
  approved: "승인",
  pending: "대기",
  rejected: "거절",
  none: "미신청",
};

export default function ManageMembersPage() {
  const [items, setItems] = useState<Member[]>([]);
  const [viewerRole, setViewerRole] = useState<Role | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{
        ok: true;
        viewerRole: Role;
        viewerId: string;
        items: Member[];
      }>("/api/manage/members");
      setItems(data.items);
      setViewerRole(data.viewerRole);
      setViewerId(data.viewerId);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요.");
    }
    setLoading(false);
  }

  async function withdraw(u: Member) {
    const ok = window.confirm(
      `${u.nickname ?? "이 멤버"}를 강제 탈퇴시킬까요?\n프로필·가입 정보가 즉시 삭제되고, 7일간 재가입이 불가합니다. 되돌릴 수 없어요.`,
    );
    if (!ok) return;
    setBusyId(u.id);
    setError(null);
    try {
      await fetchJson(`/api/manage/members/${u.id}/withdraw`, { method: "POST" });
      setItems((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "탈퇴 처리에 실패했어요.");
    }
    setBusyId(null);
  }

  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((u) => u.nickname?.includes(q));
  }, [items, query]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        운영진 이상이 멤버를 강제 탈퇴시킬 수 있어요. 동료 운영진·관리자는 권한 등급상 탈퇴시킬 수 없어요.
      </p>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="닉네임으로 검색"
        className="mb-4 w-full rounded-xl border border-white/95 bg-white/70 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none sm:max-w-xs"
      />

      {error && (
        <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-ink-soft">
          {query ? "검색 결과가 없어요." : "표시할 멤버가 없어요."}
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((u) => {
            const isSelf = u.id === viewerId;
            const allowed = !isSelf && !!viewerRole && canForceWithdraw(viewerRole, u.role);
            return (
              <li key={u.id} className="glass-card flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-skyx/25 text-sm">
                      👤
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-ink">
                        {u.nickname ?? "(닉네임 없음)"}
                      </span>
                      {displayRoles(u.role).map((r) => (
                        <RoleBadge key={r} role={r} size="sm" />
                      ))}
                      {isSelf && <span className="text-[10px] text-ink-faint">나</span>}
                    </div>
                    <span className="text-[11px] text-ink-faint">
                      {MEMBERSHIP_LABEL[u.membershipStatus] ?? u.membershipStatus}
                    </span>
                  </div>
                </div>

                {allowed && (
                  <button
                    onClick={() => withdraw(u)}
                    disabled={busyId === u.id}
                    className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                  >
                    {busyId === u.id ? "처리 중…" : "강제 탈퇴"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
