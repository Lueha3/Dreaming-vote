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

const SYSTEM_INSTRUCTION = `당신은 비즈니스 페르소나 분석 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. catchphrase: 15자 이내, 시적·은유적 한 줄
3. coreTraits: 핵심 기질 키워드 3~5개, 쉼표 구분
4. optimalEcosystem: 200% 발휘되는 조직 문화 (200자 이내)
5. corePosition: 팀 내 압도적 역할 (100자 이내)`;

// ── AI 결과 텍스트 파싱 ──────────────────────────────────────────────────────

const buildPrompt = (rawText: string) => `
다음은 유저가 AI에게서 받은 비즈니스 페르소나 분석 결과입니다.
내용을 아래 JSON 형식으로 추출·정제하세요.

[분석 결과]
${rawText}

[출력 형식]
{"catchphrase":"...","coreTraits":"...","optimalEcosystem":"...","corePosition":"..."}
`;

/**
 * 유저의 AI 결과 텍스트를 4개 항목 JSON으로 파싱
 * - gemini-2.5-flash 사용 (비용 최소화)
 * - 실패 시 1회 재시도
 */
export async function parseReport(rawText: string): Promise<ParsedReport> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(buildPrompt(rawText));
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");

      const parsed = JSON.parse(jsonMatch[0]);
      return reportSchema.parse(parsed);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw lastError ?? new Error("Parsing failed after 2 attempts");
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
 * 성격 유형(예: INTJ)을 기반으로 비즈니스 페르소나 리포트 생성
 */
export async function parsePersonalityReport(personalityType: string): Promise<ParsedReport> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(buildPersonalityPrompt(personalityType));
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");

      const parsed = JSON.parse(jsonMatch[0]);
      return reportSchema.parse(parsed);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw lastError ?? new Error("Parsing failed after 2 attempts");
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

const MATCH_SYSTEM_INSTRUCTION = `당신은 사람의 비즈니스 페르소나와 동아리를 매칭하는 전문가입니다.
반드시 아래 규칙을 따르세요:
1. 오직 valid JSON만 출력. 설명, 마크다운 코드블록, 인사 일체 금지.
2. clubId는 반드시 주어진 후보 목록의 id와 정확히 일치해야 함. 목록에 없는 동아리는 절대 만들지 말 것.
3. score: 0~100 정수, 페르소나와 동아리의 적합도.
4. reason: 한국어 1~2문장. 이 사람의 기질·환경·역할을 근거로 왜 이 동아리가 잘 맞는지 구체적으로.
5. 적합도가 높은 순으로 정렬. 명백히 어울리지 않는 동아리는 포함하지 말 것.`;

const buildMatchPrompt = (persona: PersonaInput, candidates: ClubCandidate[], topN: number) => `
[사용자 페르소나]
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

위 페르소나에 가장 잘 맞는 동아리를 최대 ${topN}개 골라 적합도 순으로 출력하세요.

[출력 형식]
{"recommendations":[{"clubId":"...","score":85,"reason":"..."}]}
`;

/**
 * 페르소나 리포트 기반으로 후보 동아리 중 매칭 추천
 * - gemini-2.5-flash 사용
 * - 실패 시 1회 재시도
 * - 후보 목록에 없는 clubId(환각)는 호출부에서 필터링할 것
 */
export async function recommendClubs(
  persona: PersonaInput,
  candidates: ClubCandidate[],
  topN = 5,
): Promise<ClubMatch[]> {
  if (candidates.length === 0) return [];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: MATCH_SYSTEM_INSTRUCTION,
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await model.generateContent(buildMatchPrompt(persona, candidates, topN));
      const text = result.response.text().trim();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("JSON not found in response");

      const parsed = JSON.parse(jsonMatch[0]);
      return clubMatchSchema.parse(parsed).recommendations;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 800));
      }
    }
  }

  throw lastError ?? new Error("Club matching failed after 2 attempts");
}
