"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type AuditItem = {
  id: string;
  actorNickname: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  summary: string;
  createdAt: string;
};

const ACTION_META: Record<string, { label: string; emoji: string; tone: string }> = {
  role_change: { label: "역할 변경", emoji: "🛡", tone: "text-skyx-ink" },
  membership_approve: { label: "가입 승인", emoji: "✅", tone: "text-teal-ink" },
  membership_reject: { label: "가입 거절", emoji: "✋", tone: "text-gold-ink" },
  club_approve: { label: "동아리 승인", emoji: "🎯", tone: "text-teal-ink" },
  club_reject: { label: "동아리 반려", emoji: "🚫", tone: "text-gold-ink" },
  content_delete: { label: "콘텐츠 삭제", emoji: "🗑", tone: "text-gold-ink" },
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

/** /manage/audit — 신뢰 경계 변이 감사 로그(최신 100건). */
export default function ManageAuditPage() {
  const [items, setItems] = useState<AuditItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ ok: true; items: AuditItem[] }>("/api/manage/audit")
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card h-16 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="glass-card px-8 py-14 text-center text-sm text-ink-soft">
        아직 기록된 감사 로그가 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-ink-faint">
        역할 변경·가입 승인/거절·동아리 승인/반려·콘텐츠 삭제를 최신순 100건까지 보여줘요.
      </p>
      {items.map((it) => {
        const meta = ACTION_META[it.action] ?? {
          label: it.action,
          emoji: "•",
          tone: "text-ink",
        };
        return (
          <div key={it.id} className="glass-card flex items-start gap-3 p-4">
            <span className="mt-0.5 shrink-0 text-lg" aria-hidden>
              {meta.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</span>
                <span className="text-xs text-ink-faint">· {fmtKST(it.createdAt)}</span>
              </div>
              <p className="mt-0.5 break-words text-sm text-ink">{it.summary}</p>
              <p className="mt-1 text-xs text-ink-faint">
                {it.actorNickname ?? "(삭제된 사용자)"}
                {it.actorRole ? ` · ${it.actorRole}` : ""}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
