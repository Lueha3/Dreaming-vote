"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type ReportItem = {
  id: string;
  targetType: string;
  reason: string;
  status: string;
  note: string | null;
  createdAt: string;
  resolvedAt: string | null;
  reporterNickname: string | null;
  resolvedByNickname: string | null;
  targetExists: boolean;
  targetPreview: string | null;
  targetAuthor: string | null;
  targetLink: string | null;
};

const TYPE_META: Record<string, { label: string; emoji: string }> = {
  prayer: { label: "광장 글", emoji: "📝" },
  comment: { label: "댓글", emoji: "💬" },
  club: { label: "동아리", emoji: "🎯" },
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  resolved: { label: "해결됨", cls: "border-teal/35 bg-teal/10 text-teal-ink" },
  dismissed: { label: "반려됨", cls: "border-sky-line bg-white/60 text-ink-faint" },
};

function fmtKST(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** /manage/reports — 사용자 신고 모더레이션 큐. */
export default function ManageReportsPage() {
  const [open, setOpen] = useState<ReportItem[] | null>(null);
  const [handled, setHandled] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchJson<{ ok: true; open: ReportItem[]; handled: ReportItem[] }>(
        "/api/manage/reports",
      );
      setOpen(data.open ?? []);
      setHandled(data.handled ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "신고 목록을 불러오지 못했어요.");
      setOpen(null); // 빈 상태('신고 없음 👏')와 로드 실패를 구분 — null이면 빈 상태를 띄우지 않는다
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(id: string, action: "resolve" | "dismiss" | "delete") {
    if (action === "delete" && !window.confirm("신고된 콘텐츠를 삭제할까요? 되돌릴 수 없어요.")) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await fetchJson(`/api/manage/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리에 실패했어요.");
    }
    setBusyId(null);
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-xs text-ink-faint">
        멤버가 신고한 광장 글·댓글·동아리를 검토하고 처리해요. 삭제는 글/댓글에만 적용돼요.
      </p>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-300/60 bg-red-500/[0.08] px-4 py-2.5 text-sm text-red-600">
          <span>{error}</span>
          <button onClick={load} className="shrink-0 font-medium underline underline-offset-2 hover:text-red-500">
            다시 시도
          </button>
        </div>
      )}

      {/* 미처리 큐 */}
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <span>🚨</span> 미처리 신고
        <span className="text-ink-faint">({open?.length ?? 0})</span>
      </h2>
      {open === null ? null : open.length === 0 ? (
        <div className="glass-card px-6 py-10 text-center text-sm text-ink-soft">
          처리할 신고가 없어요. 👏
        </div>
      ) : (
        <ul className="space-y-2.5">
          {open.map((r) => (
            <li key={r.id} className="glass-card p-4">
              <ReportBody item={r} />
              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-sky-line pt-3">
                {r.targetExists && r.targetType !== "club" && (
                  <button
                    onClick={() => act(r.id, "delete")}
                    disabled={busyId === r.id}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-100 disabled:opacity-50"
                  >
                    콘텐츠 삭제
                  </button>
                )}
                <button
                  onClick={() => act(r.id, "resolve")}
                  disabled={busyId === r.id}
                  className="rounded-lg border border-teal/40 bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal-ink transition-all hover:bg-teal/20 disabled:opacity-50"
                >
                  해결
                </button>
                <button
                  onClick={() => act(r.id, "dismiss")}
                  disabled={busyId === r.id}
                  className="glass-soft rounded-lg px-3 py-1.5 text-xs font-medium text-ink-soft transition-all hover:text-ink disabled:opacity-50"
                >
                  반려
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 최근 처리 내역 */}
      {handled.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 flex items-center gap-2 text-sm font-semibold text-ink">
            <span>🗂</span> 최근 처리 내역
            <span className="text-ink-faint">({handled.length})</span>
          </h2>
          <ul className="space-y-2.5">
            {handled.map((r) => (
              <li key={r.id} className="glass-card p-4 opacity-80">
                <ReportBody item={r} />
                <p className="mt-2 text-xs text-ink-faint">
                  {STATUS_META[r.status]?.label ?? r.status}
                  {r.resolvedByNickname ? ` · ${r.resolvedByNickname}` : ""}
                  {r.resolvedAt ? ` · ${fmtKST(r.resolvedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ReportBody({ item }: { item: ReportItem }) {
  const meta = TYPE_META[item.targetType] ?? { label: item.targetType, emoji: "•" };
  const statusMeta = STATUS_META[item.status];
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="rounded-full border border-skyx/30 bg-skyx/10 px-2 py-0.5 text-xs font-medium text-skyx-ink">
          {meta.emoji} {meta.label}
        </span>
        {statusMeta && (
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta.cls}`}>
            {statusMeta.label}
          </span>
        )}
        <span className="text-xs text-ink-faint">· {fmtKST(item.createdAt)}</span>
      </div>

      {item.targetExists ? (
        <div className="rounded-lg border border-sky-line bg-white/50 px-3 py-2">
          <p className="break-words text-xs text-ink-soft">
            {item.targetPreview || <span className="text-ink-faint">(내용 없음)</span>}
            {item.targetAuthor && <span className="text-ink-faint"> — {item.targetAuthor}</span>}
          </p>
          {item.targetLink && (
            <Link
              href={item.targetLink}
              className="mt-1 inline-block text-xs font-medium text-skyx-ink hover:underline"
            >
              {item.targetType === "comment" ? "원문 글 보기 →" : "원문 보기 →"}
            </Link>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-sky-line bg-white/50 px-3 py-2 text-xs text-ink-faint">
          이미 삭제된 콘텐츠예요.
        </p>
      )}

      <p className="break-words text-sm text-ink">
        <span className="text-ink-faint">사유: </span>
        {item.reason}
      </p>
      <p className="text-xs text-ink-faint">신고자: {item.reporterNickname ?? "(탈퇴)"}</p>
    </div>
  );
}
