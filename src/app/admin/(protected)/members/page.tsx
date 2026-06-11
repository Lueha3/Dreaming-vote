"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type AdminMember = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  createdAt: string;
  membershipStatus: "none" | "pending" | "approved" | "rejected";
  realName: string | null;
  age: number | null;
  gender: string | null;
  dreamGroup: string | null;
  phone: string | null;
  membershipAppliedAt: string | null;
  membershipDecidedAt: string | null;
  membershipNote: string | null;
};

const STATUS_BADGE: Record<
  AdminMember["membershipStatus"],
  { label: string; cls: string }
> = {
  pending: {
    label: "승인 대기",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  approved: {
    label: "승인됨",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  },
  rejected: {
    label: "거절됨",
    cls: "border-red-500/30 bg-red-500/10 text-red-400",
  },
  none: {
    label: "미신청",
    cls: "border-zinc-600/40 bg-zinc-700/20 text-zinc-400",
  },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function AdminMembersPage() {
  const [items, setItems] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{ ok: true; items: AdminMember[] }>("/api/admin/members");
      setItems(data.items ?? []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }

  async function approve(id: string) {
    setBusyId(id);
    try {
      await fetchJson(`/api/admin/members/${id}/approve`, { method: "POST" });
      await load();
    } catch {
      /* ignore */
    }
    setBusyId(null);
  }

  async function reject(id: string) {
    const reason = window.prompt("거절 사유 (신청자에게 표시돼요. 비워도 됩니다.)");
    if (reason === null) return; // 취소 → 거절 중단
    setBusyId(id);
    try {
      await fetchJson(`/api/admin/members/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      await load();
    } catch {
      /* ignore */
    }
    setBusyId(null);
  }

  const pendingCount = items.filter((i) => i.membershipStatus === "pending").length;
  const visible =
    filter === "pending" ? items.filter((i) => i.membershipStatus === "pending") : items;

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">멤버 가입 승인</h2>
        <p className="mt-1 text-sm text-zinc-500">
          가입 신청서(이름·나이·성별·꿈터·전화번호)를 확인하고 승인합니다. 승인하면 닉네임이
          &ldquo;집단-나이-이름&rdquo;으로 자동 설정됩니다.
        </p>
      </div>

      {/* 필터 탭 */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
            filter === "pending"
              ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
              : "bg-white/5 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          승인 대기
          {pendingCount > 0 && (
            <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-300">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-violet-500/15 text-violet-200 ring-1 ring-violet-500/40"
              : "bg-white/5 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          전체 ({items.length})
        </button>
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-white/[0.07] bg-[#111111] p-5"
            >
              <div className="mb-3 h-4 w-32 rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#111111] px-8 py-14 text-center">
          <p className="text-zinc-400">
            {filter === "pending" ? "승인 대기 중인 신청이 없습니다." : "사용자가 없습니다."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((m) => {
            const badge = STATUS_BADGE[m.membershipStatus];
            return (
              <li
                key={m.id}
                className={`rounded-2xl border bg-[#111111] p-5 transition-all ${
                  m.membershipStatus === "pending"
                    ? "border-amber-500/30 bg-amber-500/[0.03]"
                    : m.membershipStatus === "approved"
                      ? "border-emerald-500/25"
                      : "border-white/[0.07]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* 이름 + 상태 */}
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs text-zinc-500">
                          {(m.realName ?? m.nickname ?? "?")[0]}
                        </div>
                      )}
                      <span className="font-semibold text-white">
                        {m.realName ?? m.nickname ?? "이름 미입력"}
                      </span>
                      {m.age != null && m.gender && (
                        <span className="text-sm text-zinc-400">
                          {m.age}세 · {m.gender}
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    {/* 신청 정보 */}
                    <div className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400">
                      <span>
                        꿈터 <span className="text-zinc-200">{m.dreamGroup ?? "-"}</span>
                      </span>
                      <span>
                        전화{" "}
                        {m.phone ? (
                          <a href={`tel:${m.phone}`} className="text-zinc-200 hover:text-violet-300">
                            {m.phone}
                          </a>
                        ) : (
                          <span className="text-zinc-200">-</span>
                        )}
                      </span>
                      <span>
                        닉네임 <span className="text-zinc-200">{m.nickname ?? "-"}</span>
                      </span>
                    </div>

                    {m.membershipStatus === "rejected" && m.membershipNote && (
                      <p className="mb-2 text-xs text-red-400/80">거절 사유: {m.membershipNote}</p>
                    )}

                    <p className="text-xs text-zinc-600">
                      가입 {fmtDate(m.createdAt)}
                      {m.membershipAppliedAt && <> · 신청 {fmtDate(m.membershipAppliedAt)}</>}
                      {m.membershipDecidedAt && <> · 처리 {fmtDate(m.membershipDecidedAt)}</>}
                    </p>
                  </div>

                  {/* 액션 버튼 */}
                  {m.membershipStatus !== "none" && (
                    <div className="flex flex-col gap-2">
                      {m.membershipStatus !== "approved" && (
                        <button
                          onClick={() => approve(m.id)}
                          disabled={busyId === m.id}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-40"
                        >
                          {busyId === m.id ? "처리 중..." : "승인"}
                        </button>
                      )}
                      {m.membershipStatus === "pending" && (
                        <button
                          onClick={() => reject(m.id)}
                          disabled={busyId === m.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-red-500/30 hover:text-red-400 disabled:opacity-40"
                        >
                          거절
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
