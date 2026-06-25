import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getAuthUser, roleGate } from "@/lib/auth";

type ReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  note: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  reporter: { nickname: string | null } | null;
  resolvedBy: { nickname: string | null } | null;
};

type Preview = { preview: string; author: string | null; link: string };

/** 신고 대상(글/댓글/동아리)의 미리보기를 한 번에 모아온다. 삭제된 대상은 맵에서 빠진다. */
async function buildPreviews(reports: ReportRow[]): Promise<Record<string, Preview>> {
  const prayerIds = [...new Set(reports.filter((r) => r.targetType === "prayer").map((r) => r.targetId))];
  const commentIds = [...new Set(reports.filter((r) => r.targetType === "comment").map((r) => r.targetId))];
  const clubIds = [...new Set(reports.filter((r) => r.targetType === "club").map((r) => r.targetId))];

  const [prayers, comments, clubs] = await Promise.all([
    prayerIds.length
      ? prisma.prayer.findMany({
          where: { id: { in: prayerIds } },
          select: {
            id: true,
            content: true,
            category: true,
            isAnonymous: true,
            user: { select: { nickname: true } },
          },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.prayerComment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            prayerId: true,
            prayer: { select: { category: true } },
            user: { select: { nickname: true } },
          },
        })
      : Promise.resolve([]),
    clubIds.length
      ? prisma.club.findMany({ where: { id: { in: clubIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const map: Record<string, Preview> = {};
  for (const p of prayers) {
    map[`prayer:${p.id}`] = {
      preview: (p.content ?? "").slice(0, 80),
      author: p.isAnonymous ? "익명" : p.user?.nickname ?? "(탈퇴)",
      link: `/prayer?category=${encodeURIComponent(p.category)}#${p.id}`,
    };
  }
  for (const c of comments) {
    map[`comment:${c.id}`] = {
      preview: c.content.slice(0, 80),
      author: c.user?.nickname ?? "(탈퇴)",
      link: `/prayer?category=${encodeURIComponent(c.prayer.category)}#${c.prayerId}`,
    };
  }
  for (const cl of clubs) {
    map[`club:${cl.id}`] = { preview: cl.name, author: null, link: `/clubs/${cl.id}` };
  }
  return map;
}

function shape(r: ReportRow, map: Record<string, Preview>) {
  const pv = map[`${r.targetType}:${r.targetId}`];
  return {
    id: r.id,
    targetType: r.targetType,
    reason: r.reason,
    status: r.status,
    note: r.note,
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
    reporterNickname: r.reporter?.nickname ?? null,
    resolvedByNickname: r.resolvedBy?.nickname ?? null,
    targetExists: !!pv,
    targetPreview: pv?.preview ?? null,
    targetAuthor: pv?.author ?? null,
    targetLink: pv?.link ?? null,
  };
}

const SELECT = {
  id: true,
  targetType: true,
  targetId: true,
  reason: true,
  status: true,
  note: true,
  createdAt: true,
  resolvedAt: true,
  reporter: { select: { nickname: true } },
  resolvedBy: { select: { nickname: true } },
} as const;

/**
 * GET /api/manage/reports — 신고 큐(운영진+).
 * open(오래된 순) + 최근 처리분(handled, 최신순 30건)을 미리보기와 함께 반환.
 */
export async function GET() {
  const user = await getAuthUser();
  const gate = roleGate(user, "staff");
  if (gate) return gate;

  const [open, handled] = await Promise.all([
    prisma.contentReport.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: SELECT,
    }),
    prisma.contentReport.findMany({
      where: { status: { not: "open" } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: SELECT,
    }),
  ]);

  const map = await buildPreviews([...open, ...handled] as ReportRow[]);

  return NextResponse.json({
    ok: true,
    open: (open as ReportRow[]).map((r) => shape(r, map)),
    handled: (handled as ReportRow[]).map((r) => shape(r, map)),
  });
}
