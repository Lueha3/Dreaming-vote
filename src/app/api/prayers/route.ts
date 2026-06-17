import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate, type AuthUser } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { getGroup } from "@/lib/membership";

/**
 * 내 집단(러비아/유디코) — 가입신청서의 검증된 나이 기준.
 * 닉네임은 자가 설정 가능해 인가 근거로 쓰지 않는다(승인 전 집단 기도 열람/집단 사칭 차단).
 */
function groupOfUser(user: AuthUser | null): "러비아" | "유디코" | null {
  if (!user || user.membershipStatus !== "approved" || user.age == null) return null;
  return getGroup(user.age);
}

const createSchema = z.object({
  content: z.string().trim().min(2, "기도제목을 입력해주세요.").max(1000, "내용이 너무 깁니다."),
  scope: z.enum(["ALL", "러비아", "유디코"]).default("ALL"),
  isAnonymous: z.boolean().default(false),
});

/**
 * GET /api/prayers?tab=all|group
 * - all   : 전체 광장 (scope=ALL)
 * - group : 내 집단(러비아/유디코) 기도 (scope=내 집단)
 * 동아리 기도(clubId)는 여기서 제외 (Phase 2에서 동아리 페이지에 별도)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab") === "group" ? "group" : "all";

  const user = await getAuthUser();
  const myGroup = groupOfUser(user);

  let scopeFilter: string;
  if (tab === "group") {
    if (!myGroup) {
      // 집단 미설정 → 빈 목록 + 안내
      return NextResponse.json({
        ok: true,
        items: [],
        myGroup: null,
        needNickname: true,
        loggedIn: !!user,
      });
    }
    scopeFilter = myGroup;
  } else {
    scopeFilter = "ALL";
  }

  const prayers = await prisma.prayer.findMany({
    where: { scope: scopeFilter, clubId: null },
    orderBy: [{ isAnswered: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      content: true,
      scope: true,
      isAnonymous: true,
      isAnswered: true,
      answeredNote: true,
      answeredAt: true,
      createdAt: true,
      userId: true,
      user: { select: { nickname: true, avatarUrl: true, role: true } },
      _count: { select: { intercessions: true } },
      intercessions: user
        ? { where: { userId: user.dbUserId }, select: { id: true } }
        : false,
    },
  });

  const items = prayers.map((p) => ({
    id: p.id,
    content: p.content,
    scope: p.scope,
    isAnswered: p.isAnswered,
    answeredNote: p.answeredNote,
    answeredAt: p.answeredAt,
    createdAt: p.createdAt,
    isMine: !!user && p.userId === user.dbUserId,
    authorName: p.isAnonymous ? "익명" : p.user?.nickname ?? "익명",
    authorAvatar: p.isAnonymous ? null : p.user?.avatarUrl ?? null,
    // 익명 기도는 작성자 배지도 숨긴다(관리자/운영진 신원 노출 방지)
    authorRole: p.isAnonymous ? null : p.user?.role ?? null,
    prayCount: p._count.intercessions,
    iPrayed: Array.isArray(p.intercessions) ? p.intercessions.length > 0 : false,
  }));

  return NextResponse.json({ ok: true, items, myGroup, needNickname: false, loggedIn: !!user });
}

/** POST /api/prayers — 기도제목 올리기 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 10 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().fieldErrors.content?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }

  const { content, scope, isAnonymous } = parsed.data;

  // 집단 기도는 본인 집단에만 올릴 수 있음 (검증된 신청서 나이 기준)
  if (scope !== "ALL") {
    const myGroup = groupOfUser(user);
    if (myGroup !== scope) {
      return NextResponse.json(
        { ok: false, error: "본인 집단의 기도 광장에만 올릴 수 있어요." },
        { status: 400 },
      );
    }
  }

  const prayer = await prisma.prayer.create({
    data: { userId: user.dbUserId, content, scope, isAnonymous },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: prayer.id });
}
