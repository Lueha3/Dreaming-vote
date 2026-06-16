/**
 * 리포트 스키마/타입 — AI 연동은 제거됨.
 *
 * 성향 카드(report)의 4개 필드 검증 스키마. MBTI 카드 캐시·저장 라우트가 공유한다.
 * (동아리 추천 매칭은 @/lib/clubMatch, MBTI 16종 카드는 @/data/personalityCards 로 분리)
 */
import { z } from "zod";

export const reportSchema = z.object({
  catchphrase: z.string().min(1).max(40),
  coreTraits: z.string().min(1),
  optimalEcosystem: z.string().min(1),
  corePosition: z.string().min(1),
});

export type ParsedReport = z.infer<typeof reportSchema>;
