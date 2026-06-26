import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { recommendClubs, type ClubCandidate } from "@/lib/clubMatch";
import { getPrimaryArchetype } from "@/lib/bibleArchetypes";

const bodySchema = z.object({ reportId: z.string().min(1) });

const CANDIDATE_LIMIT = 50;
const TOP_N = 5;

/**
 * POST /api/clubs/recommend
 * 리포트(성경 인물형) 기반 동아리 추천 (로그인 필요, 로컬 결정론적 매칭 — AI 미사용).
 * - 추천 결과를 ClubRecommendation에 저장(기존 결과 갱신)
 * - body: { reportId }
 */
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  // 추천은 로그인 필수 + 비용 0(로컬 매칭) → userId 기준 레이트리밋.
  // 같은 교회 WiFi(단일 IP)에서 여러 명이 동시에 눌러도 서로 막지 않는다.
  if (!checkRateLimit(user.dbUserId, { windowMs: 60_000, max: 10 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "리포트를 지정해주세요." }, { status: 400 });
  }
  const { reportId } = parsed.data;

  // 리포트 소유 확인
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      userId: true,
      catchphrase: true,
      coreTraits: true,
      optimalEcosystem: true,
      corePosition: true,
    },
  });
  if (!report || report.userId !== user.dbUserId) {
    return NextResponse.json({ ok: false, error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  // 후보 동아리 (승인+활성, 본인 개설 제외, 이미 신청/가입한 곳 제외 — 헛추천 방지)
  const candidatesRaw = await prisma.club.findMany({
    where: {
      isApproved: true,
      isActive: true,
      ownerUserId: { not: user.dbUserId },
      applications: { none: { userId: user.dbUserId, status: { in: ["pending", "accepted"] } } },
    },
    // 인기(조회 많은) 동아리가 후보 컷오프(상위 N)에서 잘리지 않도록 조회수 desc 우선.
    // (accepted 멤버수로 정렬하고 싶으나 Prisma 관계 _count는 status 필터를 못 걸어
    //  전체 신청수가 되어버리므로, 정확한 인기 신호로 viewCount를 쓴다.)
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      tags: true,
      maxMembers: true,
      // accepted 멤버들의 최신 공개 리포트 인물형 — 멤버 동질성 보너스용.
      applications: {
        where: { status: "accepted" },
        select: {
          user: {
            select: {
              reports: {
                where: { isPublic: true },
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { coreTraits: true },
              },
            },
          },
        },
      },
    },
  });

  if (candidatesRaw.length === 0) {
    return NextResponse.json({ ok: true, items: [], message: "아직 추천할 동아리가 없습니다." });
  }

  const candidates: ClubCandidate[] = candidatesRaw.map((c) => {
    const memberArchetypes: string[] = [];
    for (const app of c.applications) {
      const ct = app.user?.reports[0]?.coreTraits;
      const arch = ct ? getPrimaryArchetype(ct) : undefined;
      if (arch) memberArchetypes.push(arch.label);
    }
    return {
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      tags: c.tags,
      maxMembers: c.maxMembers,
      memberCount: c.applications.length,
      memberArchetypes,
    };
  });
  const validIds = new Set(candidatesRaw.map((c) => c.id));

  // 로컬 결정론적 매칭 — AI 호출 없음, 예외 없이 항상 결과 반환
  const matches = recommendClubs(
    {
      catchphrase: report.catchphrase,
      coreTraits: report.coreTraits,
      optimalEcosystem: report.optimalEcosystem,
      corePosition: report.corePosition,
    },
    candidates,
    TOP_N,
  );

  // 환각 clubId 제거 + 중복 제거 + 점수순 정렬
  const seen = new Set<string>();
  const clean = matches
    .filter((m) => validIds.has(m.clubId) && !seen.has(m.clubId) && seen.add(m.clubId))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N);

  // 추천 결과 저장 (기존 결과 교체)
  await prisma.$transaction([
    prisma.clubRecommendation.deleteMany({ where: { userId: user.dbUserId, reportId } }),
    prisma.clubRecommendation.createMany({
      data: clean.map((m) => ({
        userId: user.dbUserId,
        reportId,
        clubId: m.clubId,
        score: m.score,
        reason: m.reason,
      })),
    }),
  ]);

  // 클럽 상세 + 멤버수 조회해서 점수/이유와 병합
  const clubs = await prisma.club.findMany({
    where: { id: { in: clean.map((m) => m.clubId) } },
    select: {
      id: true,
      name: true,
      category: true,
      description: true,
      tags: true,
      maxMembers: true,
      _count: { select: { applications: { where: { status: "accepted" } } } },
    },
  });
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  const items = clean
    .map((m) => {
      const c = clubMap.get(m.clubId);
      if (!c) return null;
      return {
        score: m.score,
        reason: m.reason,
        club: {
          id: c.id,
          name: c.name,
          category: c.category,
          description: c.description,
          tags: c.tags,
          maxMembers: c.maxMembers,
          memberCount: c._count.applications,
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return NextResponse.json({ ok: true, items });
}
