"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/http";

type Stats = {
  users: number;
  reports: number;
  clubsTotal: number;
  clubsPending: number;
  clubsActive: number;
  appsTotal: number;
  appsAccepted: number;
  appsPending: number;
  recommendations: number;
};

/**
 * /manage/stats — 운영 지표(글래스). 데이터는 기존 /api/admin/stats 재사용
 * (/manage/clubs가 /api/admin/clubs를 재사용하는 패턴과 동일, 권한도 staff+로 동일).
 */
export default function ManageStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ ok: true; stats: Stats }>("/api/admin/stats")
      .then((data) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass-card h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="glass-card px-8 py-14 text-center text-sm text-ink-soft">
        지표를 불러오지 못했어요.
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <Group title="서비스">
        <StatCard label="가입 유저" value={stats.users} accent="skyx" />
        <StatCard label="생성된 성향 카드" value={stats.reports} accent="teal" />
        <StatCard label="동아리 추천" value={stats.recommendations} accent="skyx" />
      </Group>

      <Group title="동아리">
        <StatCard label="전체 동아리" value={stats.clubsTotal} accent="skyx" />
        <StatCard
          label="승인 대기"
          value={stats.clubsPending}
          accent={stats.clubsPending > 0 ? "gold" : "muted"}
        />
        <StatCard label="모집 중" value={stats.clubsActive} accent="teal" />
      </Group>

      <Group title="동아리 가입 신청">
        <StatCard label="전체 신청" value={stats.appsTotal} accent="skyx" />
        <StatCard
          label="대기 중"
          value={stats.appsPending}
          accent={stats.appsPending > 0 ? "gold" : "muted"}
        />
        <StatCard label="수락됨" value={stats.appsAccepted} accent="teal" />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  gold: "text-gold-ink",
  teal: "text-teal-ink",
  skyx: "text-skyx-ink",
  muted: "text-ink-faint",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "gold" | "teal" | "skyx" | "muted";
}) {
  return (
    <div className="glass-card p-5">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold ${ACCENT[accent]}`}>{value.toLocaleString()}</p>
    </div>
  );
}
