import { prisma } from "@/lib/db";

/**
 * 가입신청 승인/거절 시 해당 유저에게 인앱 알림 1건 생성.
 * /api/manage/membership(PATCH)·/api/admin/members/[id]/approve|reject 세 경로가 공유.
 * best-effort — 알림 생성 실패가 승인/거절 처리 자체를 막지 않도록 호출부에서 try/catch.
 */
export async function createMembershipNotification(
  userId: string,
  action: "approve" | "reject",
  note?: string | null,
): Promise<void> {
  if (action === "approve") {
    await prisma.notification.create({
      data: {
        userId,
        type: "membership_approved",
        title: "가입이 승인됐어요 🎉",
        body: "이제 동아리 개설·가입, 광장 글쓰기를 모두 할 수 있어요. 환영해요!",
      },
    });
    return;
  }

  const reason = note?.trim();
  await prisma.notification.create({
    data: {
      userId,
      type: "membership_rejected",
      title: "가입 신청 결과를 알려드려요",
      body: reason
        ? `아쉽지만 이번 신청은 다시 살펴보기로 했어요.\n사유: ${reason}\n언제든 다시 신청할 수 있어요.`
        : "아쉽지만 이번 신청은 다시 살펴보기로 했어요. 언제든 다시 신청할 수 있어요.",
    },
  });
}
