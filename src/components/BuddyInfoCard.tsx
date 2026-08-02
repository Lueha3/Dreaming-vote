"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type Person = { nickname: string | null; avatarUrl: string | null };
type BuddyInfo = {
  ok: true;
  current: { matchId: string; person: Person } | null;
  incoming: { matchId: string; person: Person }[];
  outgoing: { matchId: string; person: Person } | null;
};

function Avatar({ person }: { person: Person }) {
  return person.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img loading="lazy" decoding="async" src={person.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-skyx/20 text-xs text-skyx-ink">
      {person.nickname?.[0] ?? "?"}
    </div>
  );
}

/**
 * 짝꿍 관리 패널 — 현재 짝꿍(해제), 받은 신청(수락/거절), 보낸 신청(취소).
 * 프로필에서 '짝꿍 신청하기'로 보낸 신청이 여기서 관리된다.
 */
export function BuddyInfoCard() {
  const [info, setInfo] = useState<BuddyInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchJson<BuddyInfo>("/api/my/buddy")
      .then(setInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(matchId: string, action: "accept" | "decline" | "cancel" | "end", key: string) {
    setBusy(key);
    setError(null);
    try {
      await fetchJson(`/api/buddy/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했어요.");
    }
    setBusy(null);
  }

  if (!info) return null;
  const { current, incoming, outgoing } = info;
  // 아무 관계도 없으면 카드 자체를 숨긴다(프로필에서 신청하도록 유도 — /people에 안내 존재).
  if (!current && incoming.length === 0 && !outgoing) return null;

  return (
    <div className="glass-card space-y-3 p-5">
      <p className="text-xs font-semibold text-ink">🤝 짝꿍</p>

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {/* 현재 짝꿍 */}
      {current && (
        <div className="flex items-center gap-2.5 rounded-xl border border-teal/25 bg-teal/[0.06] px-3 py-2.5">
          <Avatar person={current.person} />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <span className="font-semibold">{current.person.nickname ?? "멤버"}</span>
            <span className="text-ink-soft">님과 짝꿍이에요</span>
          </p>
          <button
            onClick={() => act(current.matchId, "end", "end")}
            disabled={busy === "end"}
            className="shrink-0 rounded-full border border-sky-line bg-white/60 px-3 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:text-red-500 disabled:opacity-50"
          >
            {busy === "end" ? "해제 중…" : "해제"}
          </button>
        </div>
      )}

      {/* 받은 신청 */}
      {incoming.map((r) => (
        <div key={r.matchId} className="rounded-xl border border-gold/30 bg-gold/[0.07] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar person={r.person} />
            <p className="min-w-0 flex-1 text-sm text-ink">
              <span className="font-semibold">{r.person.nickname ?? "멤버"}</span>
              <span className="text-ink-soft">님이 짝꿍을 신청했어요</span>
            </p>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => act(r.matchId, "accept", `accept-${r.matchId}`)}
              disabled={busy === `accept-${r.matchId}`}
              className="btn-gold flex-1 rounded-full py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy === `accept-${r.matchId}` ? "수락 중…" : "수락"}
            </button>
            <button
              onClick={() => act(r.matchId, "decline", `decline-${r.matchId}`)}
              disabled={busy === `decline-${r.matchId}`}
              className="glass-soft rounded-full px-4 py-1.5 text-xs font-medium text-ink-soft hover:text-ink disabled:opacity-50"
            >
              거절
            </button>
          </div>
        </div>
      ))}

      {/* 보낸 신청 */}
      {outgoing && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sky-line bg-white/55 px-3 py-2.5">
          <Avatar person={outgoing.person} />
          <p className="min-w-0 flex-1 text-sm text-ink-soft">
            <span className="font-semibold text-ink">{outgoing.person.nickname ?? "멤버"}</span>
            님께 신청함 · 응답 대기중
          </p>
          <button
            onClick={() => act(outgoing.matchId, "cancel", "cancel")}
            disabled={busy === "cancel"}
            className="shrink-0 rounded-full border border-sky-line bg-white/60 px-3 py-1 text-[11px] font-medium text-ink-soft transition-colors hover:text-red-500 disabled:opacity-50"
          >
            {busy === "cancel" ? "취소 중…" : "신청 취소"}
          </button>
        </div>
      )}
    </div>
  );
}
