import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAuthUser, membershipGate } from "@/lib/auth";
import { hasAtLeast } from "@/lib/roles";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> | { id: string } };

const patchSchema = z.object({
  isAnswered: z.boolean().optional(),
  answeredNote: z.string().trim().max(300).optional(),
  content: z.string().trim().max(2000, "내용이 너무 깁니다.").optional(),
  images: z.array(z.string()).max(5, "사진은 최대 5장까지 올릴 수 있어요.").optional(),
});

/** PATCH /api/prayers/[id] — 내용 수정 또는 응답됨 표시 (작성자만, 모더레이션 권한 없음) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });
  const gate = membershipGate(user);
  if (gate) return gate;

  if (!checkRateLimit(`editp:${user.dbUserId}`, { windowMs: 60_000, max: 20 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const prayer = await prisma.prayer.findUnique({
    where: { id },
    select: { userId: true, content: true, images: { select: { id: true, url: true } } },
  });
  if (!prayer) return NextResponse.json({ ok: false, error: "기도제목을 찾을 수 없습니다." }, { status: 404 });
  // 본인 글 수정만 허용 — 운영진도 타인 글 내용은 고칠 수 없음(삭제만 가능).
  if (prayer.userId !== user.dbUserId)
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      { ok: false, error: fieldErrors.content?.[0] ?? fieldErrors.images?.[0] ?? "입력값 오류" },
      { status: 400 },
    );
  }

  // 이미지는 삭제만 허용(추가 불가) — 제출된 URL이 모두 이 글에 이미 속한 이미지인지 검증.
  let imagesToRemove: { id: string; url: string }[] = [];
  if (parsed.data.images !== undefined) {
    const currentUrls = new Set(prayer.images.map((im) => im.url));
    const allOwned = parsed.data.images.every((url) => currentUrls.has(url));
    if (!allOwned) {
      return NextResponse.json({ ok: false, error: "유효하지 않은 이미지가 포함돼 있어요." }, { status: 400 });
    }
    const keepUrls = new Set(parsed.data.images);
    imagesToRemove = prayer.images.filter((im) => !keepUrls.has(im.url));
  }

  const finalContent = (parsed.data.content ?? prayer.content).trim();
  const finalImageCount = parsed.data.images !== undefined ? parsed.data.images.length : prayer.images.length;
  if (parsed.data.content !== undefined || parsed.data.images !== undefined) {
    if (!finalContent && finalImageCount === 0) {
      return NextResponse.json({ ok: false, error: "내용이나 사진을 남겨주세요." }, { status: 400 });
    }
  }

  const data: { content?: string; isAnswered?: boolean; answeredNote?: string | null; answeredAt?: Date | null } = {};
  if (parsed.data.content !== undefined) data.content = parsed.data.content;
  if (parsed.data.isAnswered !== undefined) {
    data.isAnswered = parsed.data.isAnswered;
    data.answeredNote = parsed.data.isAnswered ? parsed.data.answeredNote ?? null : null;
    data.answeredAt = parsed.data.isAnswered ? new Date() : null;
  }
  if (Object.keys(data).length === 0 && imagesToRemove.length === 0) {
    return NextResponse.json({ ok: false, error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length > 0) await tx.prayer.update({ where: { id }, data });
    if (imagesToRemove.length > 0) {
      await tx.prayerImage.deleteMany({ where: { id: { in: imagesToRemove.map((im) => im.id) } } });
    }
  });

  // DB에서 제거된 이미지의 스토리지 객체도 정리(고아 방지) — best-effort.
  if (imagesToRemove.length > 0) {
    const supabase = await createClient();
    await removeStorageObjects(supabase, "plaza-images", imagesToRemove.map((im) => im.url));
  }

  return NextResponse.json({ ok: true });
}

/** DELETE /api/prayers/[id] — 삭제 (작성자 또는 운영진+ 모더레이션) */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = params instanceof Promise ? await params : params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 });

  if (!checkRateLimit(`del:${user.dbUserId}`, { windowMs: 60_000, max: 30 })) {
    return NextResponse.json(
      { ok: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const prayer = await prisma.prayer.findUnique({
    where: { id },
    select: { userId: true, images: { select: { url: true } } },
  });
  if (!prayer) return NextResponse.json({ ok: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
  if (prayer.userId !== user.dbUserId && !hasAtLeast(user.role, "staff"))
    return NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 });

  // 본인 글이 아닌데 삭제 = 운영진 권한 모더레이션. 권한 남용·항의 대응을 위해 감사 기록.
  const isModeration = prayer.userId !== user.dbUserId;

  // cascade로 함께 삭제될 댓글 id 수집 — 그 댓글에 달린 미처리 신고까지 정리하기 위함.
  const commentIds = (
    await prisma.prayerComment.findMany({ where: { prayerId: id }, select: { id: true } })
  ).map((c) => c.id);

  await prisma.$transaction(async (tx) => {
    // 첨부 이미지·댓글·반응 행은 onDelete: Cascade로 함께 정리됨. 스토리지 객체는 아래에서 별도 정리.
    await tx.prayer.delete({ where: { id } });
    // 이 글/그 댓글의 미처리 신고를 해결 처리(콘텐츠가 사라졌으므로 유령 신고 적체 방지)
    await tx.contentReport.updateMany({
      where: { status: "open", targetType: "prayer", targetId: id },
      data: { status: "resolved", resolvedById: user.dbUserId, resolvedAt: new Date() },
    });
    if (commentIds.length) {
      await tx.contentReport.updateMany({
        where: { status: "open", targetType: "comment", targetId: { in: commentIds } },
        data: { status: "resolved", resolvedById: user.dbUserId, resolvedAt: new Date() },
      });
    }
  });

  if (isModeration) {
    try {
      await recordAudit({
        actor: user,
        action: "content_delete",
        targetType: "prayer",
        targetId: id,
        summary: "광장 글을 운영 권한으로 삭제",
        ip: getClientIp(req),
      });
    } catch {
      /* 감사 기록 실패가 삭제 자체를 되돌리지 않음 (best-effort) */
    }
  }

  // 첨부 사진의 스토리지 객체 정리(고아 방지) — best-effort.
  // 본인 글 삭제는 RLS상 정리되고, 운영진 모더레이션 삭제(타인 글)는 정책상 남을 수 있음.
  if (prayer.images.length > 0) {
    const supabase = await createClient();
    await removeStorageObjects(supabase, "plaza-images", prayer.images.map((im) => im.url));
  }

  return NextResponse.json({ ok: true });
}
