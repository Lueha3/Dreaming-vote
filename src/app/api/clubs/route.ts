import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { CLUB_CATEGORIES, isClubCategory } from "@/lib/clubCategories";

const SUPABASE_STORAGE_PREFIX =
  "https://owrvsqzlyjeylutwbdpi.supabase.co/storage/v1/object/public/club-images/";

const imageSchema = z.object({
  url: z.string().url().startsWith(SUPABASE_STORAGE_PREFIX),
  caption: z.string().max(100).default(""),
  order: z.number().int().min(0),
});

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "동아리 이름은 2자 이상이어야 합니다.")
    .max(40, "동아리 이름이 너무 깁니다."),
  description: z
    .string()
    .trim()
    .min(10, "소개를 10자 이상 작성해주세요.")
    .max(2000, "소개가 너무 깁니다."),
  category: z.enum(CLUB_CATEGORIES),
  tags: z
    .string()
    .trim()
    .min(1, "키워드를 1개 이상 입력해주세요.")
    .max(200, "키워드가 너무 깁니다."),
  maxMembers: z.number().int().min(2).max(1000).nullable().optional(),
  images: z.array(imageSchema).max(10).optional().default([]),
});

/**
 * GET /api/clubs
 * 승인 + 활성 동아리 목록 (공개) — 카테고리/검색어 필터 지원
 * ?category=스터디  &q=검색어
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.trim();
  const q = searchParams.get("q")?.trim();

  const where: Record<string, unknown> = { isApproved: true, isActive: true };
  if (category && isClubCategory(category)) where.category = category;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { contains: q, mode: "insensitive" } },
    ];
  }

  const clubs = await prisma.club.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      tags: true,
      maxMembers: true,
      viewCount: true,
      createdAt: true,
      _count: { select: { applications: { where: { status: "accepted" } } } },
    },
  });

  const items = clubs.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    category: c.category,
    tags: c.tags,
    maxMembers: c.maxMembers,
    viewCount: c.viewCount,
    createdAt: c.createdAt,
    memberCount: c._count.applications,
  }));

  return NextResponse.json({ ok: true, items });
}

/**
 * POST /api/clubs
 * 동아리 개설 (로그인 필요) — 승인 대기(isApproved=false) 상태로 생성
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip, { windowMs: 60_000, max: 5 })) {
    return NextResponse.json(
      { ok: false, code: "RATE_LIMIT", error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  }
  const gate = membershipGate(user);
  if (gate) return gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "입력값 오류", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, description, category, tags, maxMembers, images } = parsed.data;

  const club = await prisma.club.create({
    data: {
      name,
      description,
      category,
      tags,
      maxMembers: maxMembers ?? null,
      ownerUserId: user.dbUserId,
      // isApproved 기본값 false — 관리자 승인 후 노출
    },
    select: { id: true },
  });

  // 카드뉴스 이미지 저장
  if (images.length > 0) {
    await prisma.clubImage.createMany({
      data: images.map((img) => ({
        clubId: club.id,
        url: img.url,
        caption: img.caption,
        order: img.order,
      })),
    });
  }

  return NextResponse.json({ ok: true, id: club.id });
}
