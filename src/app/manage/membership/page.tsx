"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type MembershipUser = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: string;
  membershipStatus: string;
  realName: string | null;
  age: number | null;
  gender: string | null;
  dreamGroup: string | null;
  phone?: string | null;
  membershipAppliedAt: string | null;
  membershipDecidedAt: string | null;
  membershipNote: string | null;
  buddyId: string | null;
  buddyNickname: string | null;
};

type BuddyCandidate = {
  id: string;
  nickname: string | null;
  avatarUrl: string | null;
  dreamGroup: string | null;
  group: string | null;
  sameGroup: boolean;
  sameDreamGroup: boolean;
  traitOverlap: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "border-gold/35 bg-gold/10 text-gold-ink",
  approved: "border-teal/35 bg-teal/10 text-teal-ink",
  rejected: "border-red-200 bg-red-50 text-red-600",
};

function fmtDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

export default function ManageMembershipPage() {
  const [items, setItems] = useState<MembershipUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [buddyPickerId, setBuddyPickerId] = useState<string | null>(null);
  const [buddyCandidates, setBuddyCandidates] = useState<BuddyCandidate[]>([]);
  const [buddyLoading, setBuddyLoading] = useState(false);
  const [buddyAssigning, setBuddyAssigning] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [filter]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{ ok: true; items: MembershipUser[] }>(
        `/api/manage/membership?status=${filter}`,
      );
      setItems(data.items ?? []);
      setSelected(new Set());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했어요. 다시 시도해주세요.");
    }
    setLoading(false);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkApprove() {
    const ids = [...selected];
    if (ids.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError(null);
    try {
      await fetchJson("/api/manage/membership/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "일괄 승인에 실패했어요. 다시 시도해주세요.");
    }
    setBulkBusy(false);
  }

  // CSV는 fetch→blob로 내려받는다. 평범한 <a>로 열면 세션 만료 시 JSON 에러 문서로
  // 네비게이션돼 관리 화면을 벗어나므로, 실패는 인앱 에러 배너로 처리한다.
  async function downloadCsv() {
    setError(null);
    try {
      const res = await fetch("/api/manage/membership/export");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        setError(j?.error ?? "명단을 내보내지 못했어요.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("명단을 내보내지 못했어요.");
    }
  }

  async function decide(id: string, action: "approve" | "reject", note?: string) {
    setBusyId(id);
    setError(null);
    try {
      await fetchJson(`/api/manage/membership/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      setRejectingId(null);
      setRejectNote("");
      await load();
    } catch (e) {
      const verb = action === "approve" ? "승인" : "반려";
      setError(e instanceof Error ? e.message : `${verb} 처리에 실패했어요. 다시 시도해주세요.`);
    }
    setBusyId(null);
  }

  async function openBuddyPicker(id: string) {
    if (buddyPickerId === id) {
      setBuddyPickerId(null);
      return;
    }
    setBuddyPickerId(id);
    setBuddyLoading(true);
    setBuddyCandidates([]);
    try {
      const data = await fetchJson<{ ok: true; items: BuddyCandidate[] }>(
        `/api/manage/membership/${id}/buddy-candidates`,
      );
      setBuddyCandidates(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "짝꿍 후보를 불러오지 못했어요.");
    }
    setBuddyLoading(false);
  }

  async function assignBuddy(newcomerId: string, buddyId: string) {
    setBuddyAssigning(buddyId);
    setError(null);
    try {
      await fetchJson(`/api/manage/membership/${newcomerId}/buddy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buddyId }),
      });
      setBuddyPickerId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "짝꿍 지정에 실패했어요.");
    }
    setBuddyAssigning(null);
  }

  const pendingCount = items.filter((u) => u.membershipStatus === "pending").length;
  const visible =
    filter === "pending" ? items.filter((u) => u.membershipStatus === "pending") : items;

  const selectableIds = filter === "pending" ? visible.map((u) => u.id) : [];
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className="text-sm text-ink-soft">
          청년부 가입 신청을 검토하고 승인 또는 반려 처리합니다.
        </p>
        <button
          onClick={downloadCsv}
          className="glass-soft shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-all hover:text-ink"
        >
          📄 명단 CSV
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 필터 */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setFilter("pending")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            filter === "pending"
              ? "bg-gold/15 text-gold-ink ring-1 ring-gold/40"
              : "glass-soft text-ink-soft hover:text-ink"
          }`}
        >
          승인 대기
          {pendingCount > 0 && (
            <span className="ml-1.5 rounded-full bg-gold/20 px-1.5 py-0.5 text-xs text-gold-ink">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            filter === "all"
              ? "bg-skyx/15 text-skyx-ink ring-1 ring-skyx/40"
              : "glass-soft text-ink-soft hover:text-ink"
          }`}
        >
          전체 처리 내역 ({items.length})
        </button>
      </div>

      {/* 일괄 선택/승인 (대기 목록에서만) */}
      {filter === "pending" && !loading && visible.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="glass-soft rounded-full px-3 py-1.5 text-xs text-ink-soft transition-colors hover:text-ink"
          >
            {allSelected ? "선택 해제" : "전체 선택"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={bulkApprove}
              disabled={bulkBusy}
              className="rounded-full border border-teal/40 bg-teal/10 px-3.5 py-1.5 text-xs font-medium text-teal-ink transition-all hover:bg-teal/20 disabled:opacity-50"
            >
              {bulkBusy ? "승인 중…" : `선택 ${selected.size}건 승인`}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card animate-pulse p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-ink/5" />
                <div className="h-4 w-32 rounded bg-ink/5" />
              </div>
              <div className="h-3 w-full rounded bg-ink/5" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="glass-card px-6 py-12 text-center text-sm text-ink-soft">
          {filter === "pending" ? "승인 대기 중인 가입 신청이 없어요." : "처리된 가입 신청이 없어요."}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((u) => (
            <li
              key={u.id}
              className={`glass-card p-5 transition-all ${
                u.membershipStatus === "pending" ? "ring-1 ring-gold/30" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* 좌측: 신청자 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex items-center gap-2.5">
                    {filter === "pending" && u.membershipStatus === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        aria-label="일괄 승인 선택"
                        className="h-4 w-4 shrink-0 accent-teal-600"
                      />
                    )}
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-sm text-skyx-ink">
                        {u.nickname?.[0] ?? "?"}
                      </div>
                    )}
                    <div>
                      <span className="font-semibold text-ink">{u.nickname ?? "닉네임 없음"}</span>
                      <span
                        className={`ml-2 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[u.membershipStatus] ?? ""}`}
                      >
                        {STATUS_LABEL[u.membershipStatus] ?? u.membershipStatus}
                      </span>
                    </div>
                  </div>

                  {/* 신청 세부 정보 */}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
                    {u.realName && (
                      <>
                        <dt className="text-ink-faint">실명</dt>
                        <dd className="text-ink sm:col-span-2">{u.realName}</dd>
                      </>
                    )}
                    {u.age && (
                      <>
                        <dt className="text-ink-faint">나이</dt>
                        <dd className="text-ink">{u.age}세</dd>
                      </>
                    )}
                    {u.gender && (
                      <>
                        <dt className="text-ink-faint">성별</dt>
                        <dd className="text-ink">{u.gender}</dd>
                      </>
                    )}
                    {u.dreamGroup && (
                      <>
                        <dt className="text-ink-faint">꿈터</dt>
                        <dd className="text-ink">{u.dreamGroup}</dd>
                      </>
                    )}
                    {u.phone && (
                      <>
                        <dt className="text-ink-faint">연락처</dt>
                        <dd className="text-ink">{u.phone}</dd>
                      </>
                    )}
                    <dt className="text-ink-faint">신청일</dt>
                    <dd className="text-ink">{fmtDate(u.membershipAppliedAt)}</dd>
                    {u.membershipDecidedAt && (
                      <>
                        <dt className="text-ink-faint">처리일</dt>
                        <dd className="text-ink">{fmtDate(u.membershipDecidedAt)}</dd>
                      </>
                    )}
                  </dl>

                  {u.membershipNote && (
                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50/60 px-3 py-2 text-xs text-red-600">
                      반려 사유: {u.membershipNote}
                    </p>
                  )}

                  {/* 환영 짝꿍 지정 — 승인된 멤버만 */}
                  {u.membershipStatus === "approved" && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {u.buddyNickname && (
                        <span className="rounded-full border border-teal/35 bg-teal/10 px-2.5 py-1 text-xs font-medium text-teal-ink">
                          🤝 짝꿍: {u.buddyNickname}
                        </span>
                      )}
                      <button
                        onClick={() => openBuddyPicker(u.id)}
                        className="rounded-full border border-sky-line bg-white/55 px-3 py-1 text-xs font-medium text-ink-soft transition-all hover:bg-white/85 hover:text-ink"
                      >
                        {u.buddyNickname ? "🤝 재지정" : "🤝 짝꿍 지정"}
                      </button>
                    </div>
                  )}

                  {/* 짝꿍 후보 선택 패널 */}
                  {buddyPickerId === u.id && (
                    <div className="mt-3 rounded-xl border border-sky-line bg-white/60 p-3">
                      {buddyLoading ? (
                        <p className="text-xs text-ink-faint">후보를 불러오는 중...</p>
                      ) : buddyCandidates.length === 0 ? (
                        <p className="text-xs text-ink-faint">추천할 후보가 없어요.</p>
                      ) : (
                        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                          {buddyCandidates.map((c) => (
                            <li key={c.id}>
                              <button
                                onClick={() => assignBuddy(u.id, c.id)}
                                disabled={buddyAssigning === c.id}
                                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-white/90 disabled:opacity-50"
                              >
                                {c.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={c.avatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-[10px] text-skyx-ink">
                                    {c.nickname?.[0] ?? "?"}
                                  </div>
                                )}
                                <span className="min-w-0 flex-1 truncate font-medium text-ink">
                                  {c.nickname ?? "닉네임 없음"}
                                </span>
                                <span className="shrink-0 text-ink-faint">
                                  {[
                                    c.sameGroup && "같은 집단",
                                    c.sameDreamGroup && "같은 꿈터",
                                    c.traitOverlap > 0 && `성향 겹침 ${c.traitOverlap}`,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")}
                                </span>
                                {buddyAssigning === c.id && <span className="shrink-0">지정 중…</span>}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* 우측: 액션 버튼 (pending만) */}
                {u.membershipStatus === "pending" && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => decide(u.id, "approve")}
                      disabled={busyId === u.id}
                      className="rounded-full border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal-ink transition-all hover:bg-teal/20 disabled:opacity-50"
                    >
                      {busyId === u.id ? "처리 중…" : "승인"}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(u.id);
                        setRejectNote("");
                      }}
                      disabled={busyId === u.id}
                      className="glass-soft rounded-full px-3 py-1.5 text-xs font-medium text-ink-faint transition-all hover:text-red-600 disabled:opacity-50"
                    >
                      반려
                    </button>
                  </div>
                )}
              </div>

              {/* 반려 사유 인라인 입력 */}
              {rejectingId === u.id && (
                <div className="mt-3 space-y-2 border-t border-sky-line pt-3">
                  <input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    maxLength={200}
                    placeholder="반려 사유 (선택, 비워도 됩니다)"
                    className="w-full rounded-xl border border-white/95 bg-white/70 px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-teal focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => decide(u.id, "reject", rejectNote)}
                      disabled={busyId === u.id}
                      className="flex-1 rounded-xl border border-red-200 bg-red-50 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                    >
                      {busyId === u.id ? "처리 중…" : "반려 확정"}
                    </button>
                    <button
                      onClick={() => { setRejectingId(null); setRejectNote(""); }}
                      className="glass-soft rounded-xl px-4 py-2 text-sm text-ink-soft hover:bg-white/90 hover:text-ink"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
