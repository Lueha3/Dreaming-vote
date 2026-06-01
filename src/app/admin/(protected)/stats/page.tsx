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

export default function AdminStatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson<{ ok: true; stats: Stats }>("/api/admin/stats")
      .then((data) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">운영 지표</h2>
        <p className="mt-1 text-sm text-zinc-500">서비스 핵심 지표를 한눈에 확인합니다.</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-white/[0.07] bg-[#141418]"
            />
          ))}
        </div>
      ) : !stats ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#141418] px-8 py-14 text-center text-zinc-400">
          지표를 불러오지 못했습니다.
        </div>
      ) : (
        <div className="space-y-8">
          {/* 유저 & 리포트 */}
          <Group title="서비스">
            <StatCard label="가입 유저" value={stats.users} accent="violet" />
            <StatCard label="생성된 리포트" value={stats.reports} accent="blue" />
            <StatCard label="AI 동아리 추천" value={stats.recommendations} accent="violet" />
          </Group>

          {/* 동아리 */}
          <Group title="동아리">
            <StatCard label="전체 동아리" value={stats.clubsTotal} accent="blue" />
            <StatCard
              label="승인 대기"
              value={stats.clubsPending}
              accent={stats.clubsPending > 0 ? "amber" : "zinc"}
            />
            <StatCard label="노출 중" value={stats.clubsActive} accent="emerald" />
          </Group>

          {/* 가입 신청 */}
          <Group title="가입 신청">
            <StatCard label="전체 신청" value={stats.appsTotal} accent="blue" />
            <StatCard
              label="대기 중"
              value={stats.appsPending}
              accent={stats.appsPending > 0 ? "amber" : "zinc"}
            />
            <StatCard label="수락됨" value={stats.appsAccepted} accent="emerald" />
          </Group>
        </div>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

const ACCENT: Record<string, string> = {
  violet: "text-violet-300",
  blue: "text-blue-300",
  emerald: "text-emerald-400",
  amber: "text-amber-300",
  zinc: "text-zinc-300",
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "violet" | "blue" | "emerald" | "amber" | "zinc";
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#141418] p-5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold ${ACCENT[accent]}`}>{value.toLocaleString()}</p>
    </div>
  );
}
