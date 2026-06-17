/**
 * 일회용 스크립트: 유저별 가장 최신 성향 카드만 남기고 나머지 전부 삭제.
 * 실행: npx tsx scripts/cleanup-old-reports.ts
 *
 * Report 삭제 시 onDelete: Cascade로 ShareEvent·ClubRecommendation도 자동 정리됨.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 유저별 가장 최신 Report의 id만 가져오기
  const latestPerUser = await prisma.$queryRaw<{ id: string }[]>`
    SELECT DISTINCT ON ("userId") id
    FROM "Report"
    ORDER BY "userId", "createdAt" DESC
  `;

  const keepIds = latestPerUser.map((r) => r.id);

  console.log(`전체 유저 수(리포트 보유): ${keepIds.length}`);

  if (keepIds.length === 0) {
    console.log("삭제할 레코드가 없습니다.");
    return;
  }

  // keepIds에 포함되지 않는 모든 Report 삭제
  const result = await prisma.report.deleteMany({
    where: {
      id: { notIn: keepIds },
    },
  });

  console.log(`삭제된 과거 성향 카드: ${result.count}건`);
  console.log("완료! 유저당 최신 1장만 남았습니다.");
}

main()
  .catch((e) => {
    console.error("에러 발생:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
