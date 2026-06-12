import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import {
  archetypeListForPrompt,
  normalizeTraits,
  expandTraitsForMatching,
} from "./bibleArchetypes";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// 파싱 결과 스키마 (route에서도 재사용)
export const reportSchema = z.object({
  catchphrase: z.string().min(1).max(40),
  coreTraits: z.string().min(1),
  optimalEcosystem: z.string().min(1),
  corePosition: z.string().min(1),
});

export type ParsedReport = z.infer<typeof reportSchema>;

// 일시 오류(분당/일일 한도·서버 과부하) 판정 — 입력 탓이 아니라 재시도/폴백 대상
const isTransientError = (msg: string) =>
  /429|quota|credit|rate limit|too many requests|resource.?exhausted|overloaded|503|unavailable/i.test(msg);

/**
 * AI 호출 실패를 사용자 메시지로 분류
 * - 사용량/크레딧/429 → 일시적 한도 문제 (입력 탓 아님)
 * - 그 외 → 파싱 실패 (입력을 더 자세히)
 */
export function classifyAiError(e: unknown): {
  code: "AI_QUOTA" | "PARSE_FAILED";
  status: number;
  error: string;
  raw: string;
} {
  const raw = e instanceof Error ? e.message : String(e);
  if (isTransientError(raw)) {
    return {
      code: "AI_QUOTA",
      status: 503,
      error: "지금 AI 사용량이 많아 잠시 분석이 어려워요. 잠시 후 다시 시도해주세요.",
      raw,
    };
  }
  return {
    code: "PARSE_FAILED",
    status: 422,
    error: "분석에 실패했습니다. AI 결과를 더 자세하게 붙여넣고 다시 시도해주세요.",
    raw,
  };
}

const SYSTEM_INSTRUCTION = `당신은 한국 교회 청년부 청년의 협업 성향 카드를 만드는 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. catchphrase: 15자 이내, 시적·은유적 한 줄
3. coreTraits: [성경 인물형 목록]에서 이 사람과 "뚜렷하게" 닮은 인물형만 가장 닮은 순서로 골라 쉼표로 구분.
   - 개수는 고정이 아니라 유동적이다. 닮은 인물이 2명이면 2개, 3명이면 3개로, 닮은 만큼만(보통 2~4개) 넣고 억지로 개수를 채우지 말 것.
   - 누구에게나 해당될 막연한 장점(지혜·성실 같은 일반론)으로 고르지 말고, 그 사람의 가장 두드러진 행동·기질과 인물의 핵심 특징이 실제로 겹칠 때만 선택. 약하거나 애매하게 겹치는 인물은 제외.
   - 목록에 없는 인물은 절대 만들지 말 것.
4. optimalEcosystem: 이 사람이 200% 빛나는 공동체·팀 환경 (200자 이내, 중학생도 이해할 쉬운 말)
5. corePosition: 동아리·팀에서 맡으면 좋은 역할 (100자 이내, 쉬운 말)`;

// ── AI 결과 텍스트 파싱 ──────────────────────────────────────────────────────

const buildPrompt = (rawText: string) => `
다음은 사용자가 AI에게서 받은 성향 분석 결과입니다.
내용을 바탕으로 아래 JSON 형식의 "성향 카드"를 만드세요.

[분석 결과]
${rawText}

[성경 인물형 목록] — coreTraits는 반드시 이 목록의 label 중에서만, 닮은 만큼만(억지로 채우지 말 것) 고를 것
${archetypeListForPrompt()}

[출력 형식] — coreTraits의 인물 수는 예시일 뿐, 실제 닮은 만큼만 (가장 닮은 순)
{"catchphrase":"...","coreTraits":"도마형, 누가형","optimalEcosystem":"...","corePosition":"..."}
`;

// 폴백 체인: 무료 등급에서 모델별 분당 한도(RPM)는 서로 독립적이므로,
// 한 모델이 순간 한도(429)에 걸려도 다음 모델로 "즉시" 우회하면 같은 1분 안에 성공할 수 있다.
// flash(고품질) ↔ flash-lite(여유 큰 독립 quota) 교차로 우회 → 첫 모델 재시도(한도 회복) → lite 안전망.
// ⚠️ gemini-2.0-flash는 현재 이 키/엔드포인트(v1beta)에서 404(제거됨) — 폴백에 넣으면 무조건 죽으니 금지.
//    체인의 모델은 반드시 200 응답을 확인하고 추가할 것.
const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

/**
 * 시스템 지시 + 프롬프트로 JSON을 생성하고 파싱해서 반환.
 * - 일시 오류(429/과부하)면 다른 모델로 즉시 폴백 — 모델별 RPM이 독립적이라 우회 성공률이 높다
 * - 파싱 실패면 같은 입력으로 다른 모델을 한 번 더 시도(모델 차이로 형식이 맞을 수 있음)
 * - 마지막 재시도 직전에만 잠깐 대기해 첫 모델의 분당 한도가 회복되게 한다
 */
async function generateJson(systemInstruction: string, prompt: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const modelName = MODEL_CHAIN[i];
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");

      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // 일시 오류는 다른 모델로 즉시 전환(대기 없이) — 독립 quota를 바로 활용
      // 마지막 시도 직전에만 짧게 대기해 첫 모델 RPM 회복 여지를 준다
      const isLastBeforeRetry = i === MODEL_CHAIN.length - 2;
      if (isLastBeforeRetry && isTransientError(lastError.message)) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  throw lastError ?? new Error("AI generation failed after retries");
}

/**
 * 유저의 AI 결과 텍스트를 4개 항목 JSON으로 파싱 (모델 폴백 적용)
 */
export async function parseReport(rawText: string): Promise<ParsedReport> {
  const parsed = await generateJson(SYSTEM_INSTRUCTION, buildPrompt(rawText));
  const report = reportSchema.parse(parsed);
  return { ...report, coreTraits: normalizeTraits(report.coreTraits) };
}

// ── 성격 유형 기반 파싱 ──────────────────────────────────────────────────────

const buildPersonalityPrompt = (type: string) => `
"${type}" 성격 유형을 가진 청년의 협업 성향을 분석해 아래 JSON 형식의 "성향 카드"를 만드세요.
교회 동아리·공동체·팀 활동에서 이 유형이 어떻게 빛나는지 구체적이고 생동감 있게, 중학생도 이해할 쉬운 말로 표현하세요.

[성격 유형]
${type}

[성경 인물형 목록] — coreTraits는 반드시 이 목록의 label 중에서만, 닮은 만큼만(억지로 채우지 말 것) 고를 것
${archetypeListForPrompt()}

[출력 형식] — coreTraits의 인물 수는 예시일 뿐, 실제 닮은 만큼만 (가장 닮은 순)
{"catchphrase":"...","coreTraits":"도마형, 누가형","optimalEcosystem":"...","corePosition":"..."}
`;

/**
 * 성격 유형(예: INTJ)을 기반으로 성향 카드 생성 (모델 폴백 적용)
 */
export async function parsePersonalityReport(personalityType: string): Promise<ParsedReport> {
  const parsed = await generateJson(SYSTEM_INSTRUCTION, buildPersonalityPrompt(personalityType));
  const report = reportSchema.parse(parsed);
  return { ...report, coreTraits: normalizeTraits(report.coreTraits) };
}

// ── 동아리 매칭 추천 ──────────────────────────────────────────────────────────

export type PersonaInput = {
  catchphrase: string;
  coreTraits: string;
  optimalEcosystem: string;
  corePosition: string;
};

export type ClubCandidate = {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string;
};

const clubMatchSchema = z.object({
  recommendations: z.array(
    z.object({
      clubId: z.string().min(1),
      score: z.number().min(0).max(100),
      reason: z.string().min(1).max(300),
    }),
  ),
});

export type ClubMatch = { clubId: string; score: number; reason: string };

const MATCH_SYSTEM_INSTRUCTION = `당신은 사람의 협업 성향과 동아리를 매칭하는 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. clubId는 반드시 주어진 후보 목록의 id와 정확히 일치해야 함. 목록에 없는 동아리는 절대 만들지 말 것.
3. score: 0~100 정수, 성향과 동아리의 적합도.
4. reason: 한국어 1~2문장. 이 사람의 기질·환경·역할을 근거로 왜 이 동아리가 잘 맞는지 구체적으로.
5. 적합도가 높은 순으로 정렬. 명백히 어울리지 않는 동아리는 포함하지 말 것.`;

const buildMatchPrompt = (persona: PersonaInput, candidates: ClubCandidate[], topN: number) => `
[사용자 성향]
한 줄 정의: ${persona.catchphrase}
핵심 기질: ${expandTraitsForMatching(persona.coreTraits)}
최적 환경: ${persona.optimalEcosystem}
핵심 역할: ${persona.corePosition}

[동아리 후보 목록]
${JSON.stringify(
  candidates.map((c) => ({
    clubId: c.id,
    name: c.name,
    category: c.category,
    description: c.description,
    tags: c.tags,
  })),
)}

위 성향에 가장 잘 맞는 동아리를 최대 ${topN}개 골라 적합도 순으로 출력하세요.

[출력 형식]
{"recommendations":[{"clubId":"...","score":85,"reason":"..."}]}
`;

/**
 * 페르소나 리포트 기반으로 후보 동아리 중 매칭 추천 (모델 폴백 적용)
 * - 후보 목록에 없는 clubId(환각)는 호출부에서 필터링할 것
 */
export async function recommendClubs(
  persona: PersonaInput,
  candidates: ClubCandidate[],
  topN = 5,
): Promise<ClubMatch[]> {
  if (candidates.length === 0) return [];
  const parsed = await generateJson(MATCH_SYSTEM_INSTRUCTION, buildMatchPrompt(persona, candidates, topN));
  return clubMatchSchema.parse(parsed).recommendations;
}
