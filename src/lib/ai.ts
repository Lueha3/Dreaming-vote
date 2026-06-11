import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

// 파싱 결과 스키마 (route에서도 재사용)
export const reportSchema = z.object({
  catchphrase: z.string().min(1).max(40),
  coreTraits: z.string().min(1),
  optimalEcosystem: z.string().min(1),
  corePosition: z.string().min(1),
});

export type ParsedReport = z.infer<typeof reportSchema>;

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
  if (/429|quota|credit|rate limit|too many requests|resource.?exhausted|overloaded|503/i.test(raw)) {
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

const SYSTEM_INSTRUCTION = `당신은 한국 청년의 협업 성향 카드를 만드는 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. catchphrase: 15자 이내, 시적·은유적 한 줄
3. coreTraits: 핵심 기질 키워드 3~5개, 쉼표 구분
4. optimalEcosystem: 200% 발휘되는 조직 문화 (200자 이내)
5. corePosition: 팀 내 압도적 역할 (100자 이내)`;

// ── AI 결과 텍스트 파싱 ──────────────────────────────────────────────────────

const buildPrompt = (rawText: string) => `
다음은 사용자가 AI에게서 받은 성향 분석 결과입니다.
내용을 아래 JSON 형식으로 추출·정제하세요.

[분석 결과]
${rawText}

[출력 형식]
{"catchphrase":"...","coreTraits":"...","optimalEcosystem":"...","corePosition":"..."}
`;

// 모델 폴백 순서: 2.5-flash 과부하(503) 시 2.0-flash로 자동 전환
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"] as const;

/**
 * 시스템 지시 + 프롬프트로 JSON을 생성하고 파싱해서 반환.
 * - 시도마다 모델을 폴백(2.5-flash → 2.0-flash)해 과부하/일시 오류에 강함
 * - 총 3회 시도, 사이에 짧은 대기
 */
async function generateJson(systemInstruction: string, prompt: string): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const modelName = MODELS[Math.min(attempt, MODELS.length - 1)];
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");

      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < 2) await new Promise((r) => setTimeout(r, 600));
    }
  }

  throw lastError ?? new Error("AI generation failed after retries");
}

/**
 * 유저의 AI 결과 텍스트를 4개 항목 JSON으로 파싱 (모델 폴백 적용)
 */
export async function parseReport(rawText: string): Promise<ParsedReport> {
  const parsed = await generateJson(SYSTEM_INSTRUCTION, buildPrompt(rawText));
  return reportSchema.parse(parsed);
}

// ── 성격 유형 기반 파싱 ──────────────────────────────────────────────────────

const buildPersonalityPrompt = (type: string) => `
다음은 "${type}" 성격 유형을 가진 사람입니다.
이 성격 유형의 비즈니스 환경에서의 핵심 특성, 강점, 역할을 분석하여 아래 JSON 형식으로 작성하세요.
실제 직장/팀에서 이 유형이 어떻게 빛나는지 구체적이고 생동감 있게 표현하세요.

[성격 유형]
${type}

[출력 형식]
{"catchphrase":"...","coreTraits":"...","optimalEcosystem":"...","corePosition":"..."}
`;

/**
 * 성격 유형(예: INTJ)을 기반으로 성향 카드 생성 (모델 폴백 적용)
 */
export async function parsePersonalityReport(personalityType: string): Promise<ParsedReport> {
  const parsed = await generateJson(SYSTEM_INSTRUCTION, buildPersonalityPrompt(personalityType));
  return reportSchema.parse(parsed);
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
핵심 기질: ${persona.coreTraits}
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
