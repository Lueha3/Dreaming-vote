import { prisma } from "@/lib/db";

/**
 * 생일 당일 본인 명의로 광장(일상)에 축하 카드를 자동 게시.
 * createWelcomeCard와 동일한 트릭 — 작성자를 당사자 본인으로 두어 기존
 * 댓글·공감 알림 파이프라인을 그대로 재사용한다. best-effort — 호출부에서 try/catch.
 */
export async function createBirthdayCard(userId: string, nickname: string | null): Promise<void> {
  const name = nickname?.trim();
  await prisma.prayer.create({
    data: {
      userId,
      category: "일상",
      content: name
        ? `🎂 오늘은 ${name}님의 생일이에요! 축하해주세요 🎉`
        : "🎂 오늘 생일인 멤버가 있어요! 축하해주세요 🎉",
      systemType: "birthday",
      scope: "ALL",
    },
  });
}
