import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidPlazaImageUrl } from "@/lib/storage";

// 광장 카테고리 — 일상 | 기도해주세요 | 동아리광고
export const CATEGORIES = ["일상", "기도해주세요", "동아리광고"] as const;
type Category = (typeof CATEGORIES)[number];

const createSchema = z.object({
  category: z.enum(CATEGORIES).default("일상"),
  content: z.string().trim().max(2000, "내용이 너무 깁니다.").default(""),
  isAnonymous: z.boolean().default(false),
  images: z.array(z.string()).max(3, "사진은 최대 3장까지 올릴 수 있어요.").default([]),
});

function resolveCategory(raw: string | null): Category {
  return (CATEGORIES as readonly string[]).includes(raw ?? "") ? (raw as Category) : "일상";
}

/**
 * GET /api/prayers?category=일상|기도해주세요|동아리광고
 * 카테고리별 광장 글 목록. 동아리 기도(clubId) 레거시는 제외.
 * (집단 러비아/유디코 구분은 폐기 — 카테고리가 유일한 분류)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = resolveCategory(searchParams.get("category"));

  const user = await getAuthUser();

  const prayers = await prisma.prayer.findMany({
    where: { category, clubId: null },
    orderBy: [{ isAnswered: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      category: true,
      content: true,
      isAnonymous: true,
      isAnswered: true,
      answeredNote: true,
      answeredAt: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { nickname: true, avatarUrl: true, role: true } },
      images: { select: { url: true }, orderBy: { order: "asc" } },
      _count: { select: { intercessions: true, comments: true } },
      intercessions: user
        ? { where: { userId: user.dbUserId }, select: { id: true } }
        : false,
    },
  });

  const isStaff = !!user && hasAtLeast(user.role, "staff");
  const items = prayers.map((p) => ({
    id: p.id,
    category: p.category,
    content: p.content,
    isAnswered: p.isAnswered,
    answeredNote: p.answeredNote,
    answeredAt: p.answeredAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    isMine: !!user && p.userId === user.dbUserId,
    // 작성자 본인 또는 운영진+ 가 삭제(모더레이션) 가능
    canDelete: (!!user && p.userId === user.dbUserId) || isStaff,
    // 수정은 본인 글만 — 운영진도 타인 글 내용은 못 고침
    canEdit: !!user && p.userId === user.dbUserId,
    authorName: p.isAnonymous ? "익명" : p.user?.nickname ?? "익명",
    authorAvatar: p.isAnonymous ? null : p.user?.avatarUrl ?? null,
    // 익명 글은 작성자 배지도 숨긴다(관리자/운영진 신원 노출 방지)
    authorRole: p.isAnonymous ? null : p.user?.role ?? null,
    images: p.images.map((im) => im.url),
    reactionCount: p._count.intercessions,
    iReacted: Array.isArray(p.intercessions) ? p.intercessions.length > 0 : false,
    commentCount: p._count.comments,
  }));

  return NextResponse.json({ ok: true, items, loggedIn: !!user });
}

/** POST /api/prayers — 광장 글 올리기 (내용 또는 사진 최소 1개 필요) */
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
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const msg =
      fieldErrors.content?.[0] ?? fieldErrors.images?.[0] ?? fieldErrors.category?.[0] ?? "입력값 오류";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }

  const { category, content, images } = parsed.data;
  const trimmed = content.trim();
  // 익명은 민감한 기도제목 보호용 — 기도해주세요에서만 허용(클라 우회 방지, 서버 강제)
  const isAnonymous = category === "기도해주세요" ? parsed.data.isAnonymous : false;

  // 이미지 URL 화이트리스트 검증 — 우리 plaza-images 버킷 외 URL은 fail-closed 차단.
  const validImages = images.filter(isValidPlazaImageUrl);
  if (validImages.length !== images.length) {
    return NextResponse.json(
      { ok: false, error: "유효하지 않은 이미지가 포함돼 있어요." },
      { status: 400 },
    );
  }

  if (!trimmed && validImages.length === 0) {
    return NextResponse.json(
      { ok: false, error: "내용이나 사진을 올려주세요." },
      { status: 400 },
    );
  }

  const prayer = await prisma.prayer.create({
    data: {
      userId: user.dbUserId,
      category,
      content: trimmed,
      isAnonymous,
      scope: "ALL",
      images: validImages.length
        ? { create: validImages.map((url, i) => ({ url, order: i })) }
        : undefined,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: prayer.id });
}
